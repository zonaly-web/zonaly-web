import { createWriteStream, mkdirSync } from "node:fs";
import path from "node:path";

type Level = "INFO" | "WARN" | "ERROR";

type SourceStats = {
  rowsIn: number;
  rowsKept: number;
  rowsUpserted: number;
  warnings: number;
  errors: number;
  startedAt: number;
  endedAt: number | null;
  status: "running" | "ok" | "failed";
};

export type Logger = {
  info: (msg: string, fields?: Record<string, unknown>) => void;
  warn: (msg: string, fields?: Record<string, unknown>) => void;
  error: (msg: string, err?: unknown) => void;
  child: (source: string) => Logger;
  count: (
    kind: keyof Pick<SourceStats, "rowsIn" | "rowsKept" | "rowsUpserted">,
    n?: number,
  ) => void;
};

export type RootLogger = Logger & {
  startSource: (source: string) => void;
  endSource: (source: string, status: "ok" | "failed") => void;
  summary: () => void;
  filePath: string;
};

function fmt(level: Level, source: string, msg: string, fields?: Record<string, unknown>): string {
  const ts = new Date().toISOString();
  const padSource = source.padEnd(11, " ").slice(0, 11);
  const f = fields
    ? " " +
      Object.entries(fields)
        .map(([k, v]) => `${k}=${typeof v === "string" ? v : JSON.stringify(v)}`)
        .join(" ")
    : "";
  return `${ts} ${level.padEnd(5)} [${padSource}] ${msg}${f}`;
}

function safeTimestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

export function createRootLogger(logsDir: string): RootLogger {
  mkdirSync(logsDir, { recursive: true });
  const filePath = path.join(logsDir, `refresh-${safeTimestamp()}.log`);
  const stream = createWriteStream(filePath, { flags: "a" });

  const stats = new Map<string, SourceStats>();

  const writeLine = (line: string, isError: boolean) => {
    stream.write(line + "\n");
    if (isError) console.error(line);
    else console.log(line);
  };

  const newStats = (): SourceStats => ({
    rowsIn: 0,
    rowsKept: 0,
    rowsUpserted: 0,
    warnings: 0,
    errors: 0,
    startedAt: Date.now(),
    endedAt: null,
    status: "running",
  });

  const make = (source: string): Logger => ({
    info(msg, fields) {
      writeLine(fmt("INFO", source, msg, fields), false);
    },
    warn(msg, fields) {
      const s = stats.get(source);
      if (s) s.warnings++;
      writeLine(fmt("WARN", source, msg, fields), false);
    },
    error(msg, err) {
      const s = stats.get(source);
      if (s) s.errors++;
      const detail =
        err instanceof Error
          ? { name: err.name, message: err.message, stack: err.stack?.split("\n")[0] }
          : err !== undefined
            ? { err: String(err) }
            : undefined;
      writeLine(fmt("ERROR", source, msg, detail), true);
    },
    child(child) {
      return make(child);
    },
    count(kind, n = 1) {
      const s = stats.get(source);
      if (s) s[kind] += n;
    },
  });

  const root = make("refresh");

  const formatElapsed = (ms: number): string => {
    const s = Math.floor(ms / 1000);
    const h = String(Math.floor(s / 3600)).padStart(2, "0");
    const m = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
    const sec = String(s % 60).padStart(2, "0");
    return `${h}:${m}:${sec}`;
  };

  return {
    ...root,
    filePath,
    startSource(source: string) {
      stats.set(source, newStats());
      root.info(`source started`, { source });
    },
    endSource(source: string, status: "ok" | "failed") {
      const s = stats.get(source);
      if (!s) return;
      s.endedAt = Date.now();
      s.status = status;
      root.info(`source ended`, {
        source,
        status,
        rows_in: s.rowsIn,
        rows_kept: s.rowsKept,
        rows_upserted: s.rowsUpserted,
        warnings: s.warnings,
        errors: s.errors,
        elapsed_ms: s.endedAt - s.startedAt,
      });
    },
    summary() {
      let totalUpserted = 0;
      let totalWarnings = 0;
      let totalErrors = 0;
      let ok = 0;
      let failed = 0;
      const lines: string[] = [];
      for (const [name, s] of stats.entries()) {
        totalUpserted += s.rowsUpserted;
        totalWarnings += s.warnings;
        totalErrors += s.errors;
        if (s.status === "ok") ok++;
        else if (s.status === "failed") failed++;
        const elapsed = (s.endedAt ?? Date.now()) - s.startedAt;
        lines.push(
          `  ${name.padEnd(14)} ${s.status.toUpperCase().padEnd(7)} upserted=${s.rowsUpserted} warn=${s.warnings} err=${s.errors} elapsed=${formatElapsed(elapsed)}`,
        );
      }
      writeLine(fmt("INFO", "refresh", "===== SUMMARY ====="), false);
      writeLine(
        fmt("INFO", "refresh", "totals", {
          sources_ok: ok,
          sources_failed: failed,
          rows_upserted: totalUpserted,
          warnings: totalWarnings,
          errors: totalErrors,
        }),
        false,
      );
      for (const l of lines) writeLine(l, false);
      stream.end();
    },
  };
}

import "dotenv/config";
import { config as loadEnvFile } from "dotenv";
import path from "node:path";
import { prisma } from "@/lib/prisma/prisma";
import { createRootLogger } from "@/lib/batch/logger";
import { filosofiSource } from "./sources/filosofi";
import { radonSource } from "./sources/radon";
import { ssmsiSource } from "./sources/ssmsi";
import { rpLogementSource } from "./sources/rpLogement";
import { atmoSource } from "./sources/atmo";
import { sitadelSource } from "./sources/sitadel";
import { dvfSource } from "./sources/dvf";
import { qpvSource } from "./sources/qpv";
import { qrrSource } from "./sources/qrr";
import { qpvQrrCountSource } from "./sources/qpvQrrCount";
import { logNullCounts } from "@/lib/batch/dbInsights";
import type { BatchContext, SourceModule } from "./context";

loadEnvFile({ path: ".env.local", override: false });

const ALL_SOURCES: SourceModule[] = [
  filosofiSource,
  radonSource,
  ssmsiSource,
  rpLogementSource,
  atmoSource,
  sitadelSource,
  dvfSource,
  qpvSource,
  qrrSource,
  qpvQrrCountSource,
];

type Args = {
  only: string[] | null;
  noCache: boolean;
  dryRun: boolean;
};

function parseArgs(argv: string[]): Args {
  const args: Args = { only: null, noCache: false, dryRun: false };
  for (const a of argv) {
    if (a === "--no-cache") args.noCache = true;
    else if (a === "--dry-run") args.dryRun = true;
    else if (a.startsWith("--only=")) {
      args.only = a
        .slice("--only=".length)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    } else if (a === "--help" || a === "-h") {
      console.log("Usage: pnpm tsx scripts/refresh.ts [--only=name,...] [--no-cache] [--dry-run]");
      console.log(`Sources: ${ALL_SOURCES.map((s) => s.name).join(", ")}`);
      process.exit(0);
    }
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const cacheDir = path.resolve("scripts/cache");
  const logsDir = path.resolve("scripts/logs");

  const logger = createRootLogger(logsDir);
  logger.info("run started", {
    only: args.only?.join(",") ?? "all",
    no_cache: args.noCache,
    dry_run: args.dryRun,
    log_file: logger.filePath,
  });

  const selected = args.only ? ALL_SOURCES.filter((s) => args.only!.includes(s.name)) : ALL_SOURCES;

  if (args.only && selected.length !== args.only.length) {
    const requested = new Set(args.only);
    const found = new Set(selected.map((s) => s.name));
    const missing = [...requested].filter((n) => !found.has(n));
    logger.error("unknown sources requested", { missing });
    logger.summary();
    process.exit(2);
  }

  const ctx: BatchContext = {
    prisma,
    cacheDir,
    logsDir,
    noCache: args.noCache,
    dryRun: args.dryRun,
    rootLogger: logger,
  };

  let anyFailed = false;
  for (const source of selected) {
    logger.startSource(source.name);
    const sourceLogger = logger.child(source.name);
    try {
      await source.run(ctx, sourceLogger);
      logger.endSource(source.name, "ok");
    } catch (err) {
      sourceLogger.error("source failed", err);
      logger.endSource(source.name, "failed");
      anyFailed = true;
    }
  }

  if (!args.dryRun) {
    try {
      await logNullCounts(prisma, logger);
    } catch (err) {
      logger.error("null-counts query failed", err);
    }
  }

  logger.summary();
  await prisma.$disconnect();
  process.exit(anyFailed ? 1 : 0);
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect().catch(() => {});
  process.exit(1);
});

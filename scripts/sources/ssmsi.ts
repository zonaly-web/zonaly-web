import { downloadToCache, openCacheReadStream } from "@/lib/batch/download";
import { iterateCsvRows } from "@/lib/batch/csvStream";
import { upsertCommuneMetrics } from "@/lib/batch/writer";
import type { SsmsiUpstreamRow } from "@/lib/ssmsi/schemas";
import { computeMetrics, parseSsmsiCsvRow, pickLatestYear } from "@/lib/ssmsi/utils";
import { communeIdentity, type SourceModule } from "../context";

const URL = "https://www.data.gouv.fr/api/1/datasets/r/44ef4323-1097-48d5-8719-3c544b55d294";

export const ssmsiSource: SourceModule = {
  name: "ssmsi",
  async run(ctx, log) {
    const path = await downloadToCache({
      url: URL,
      cacheDir: ctx.cacheDir,
      noCache: ctx.noCache,
      logger: log,
      filename: "ssmsi.csv.gz",
    });

    log.info("parsing started");
    const grouped = new Map<string, SsmsiUpstreamRow[]>();
    for await (const row of iterateCsvRows(openCacheReadStream(path), {
      delimiter: ";",
      gzip: true,
    })) {
      log.count("rowsIn");
      const parsed = parseSsmsiCsvRow(row);
      if (!parsed) continue;
      log.count("rowsKept");
      let bucket = grouped.get(parsed.CODGEO_2025);
      if (!bucket) {
        bucket = [];
        grouped.set(parsed.CODGEO_2025, bucket);
      }
      bucket.push(parsed);
    }

    log.info("aggregating", { communes: grouped.size });
    const updates: { codeInsee: string; data: Record<string, unknown> }[] = [];
    for (const [codeInsee, rows] of grouped.entries()) {
      const year = pickLatestYear(rows);
      if (year == null) continue;
      const metrics = computeMetrics(rows, year);
      const id = communeIdentity(codeInsee);
      updates.push({
        codeInsee,
        data: {
          isArm: id.isArm,
          masterCodeInsee: id.masterCodeInsee,
          departement: id.departement,
          cambriolagesPer1000Logements: metrics.cambriolagesPer1000Logements,
          agressionsPer1000Habitants: metrics.agressionsPer1000Habitants,
          ssmsiAsOf: String(year),
        },
      });
    }

    log.info("parsing done", { rows_kept: updates.length });
    await upsertCommuneMetrics(ctx.prisma, updates, log, { dryRun: ctx.dryRun });
  },
};

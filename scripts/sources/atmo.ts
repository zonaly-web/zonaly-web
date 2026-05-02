import { downloadToCache, openCacheReadStream } from "@/lib/batch/download";
import { iterateCsvRows } from "@/lib/batch/csvStream";
import { upsertCommuneMetrics } from "@/lib/batch/writer";
import { aggregateAtmo, type AtmoDailyRow } from "@/lib/atmo/utils";
import { communeIdentity, type SourceModule } from "../context";

const URL =
  "https://data.atmo-france.org/geoserver/ind/ows?service=WFS&request=GetFeature&TypeNames=ind_atmo_2021&outputformat=csv";

export const atmoSource: SourceModule = {
  name: "atmo",
  async run(ctx, log) {
    const path = await downloadToCache({
      url: URL,
      cacheDir: ctx.cacheDir,
      noCache: ctx.noCache,
      logger: log,
      filename: "atmo-bulletin.csv",
    });

    log.info("parsing started");
    const grouped = new Map<string, AtmoDailyRow[]>();
    let latestDate = "";
    for await (const row of iterateCsvRows(openCacheReadStream(path), { delimiter: "," })) {
      log.count("rowsIn");
      const codeZone = row.code_zone?.trim();
      if (!codeZone || !/^\d{5}[AB]?$/.test(codeZone)) continue;
      const codeQual = Number(row.code_qual);
      if (!Number.isFinite(codeQual)) continue;
      log.count("rowsKept");
      const dateEch = row.date_ech?.trim();
      if (dateEch && dateEch > latestDate) latestDate = dateEch;
      let bucket = grouped.get(codeZone);
      if (!bucket) {
        bucket = [];
        grouped.set(codeZone, bucket);
      }
      bucket.push({ code_qual: codeQual });
    }

    log.info("aggregating", { communes: grouped.size, latest_date: latestDate });
    const updates: { codeInsee: string; data: Record<string, unknown> }[] = [];
    for (const [codeInsee, rows] of grouped.entries()) {
      const agg = aggregateAtmo(rows);
      const id = communeIdentity(codeInsee);
      updates.push({
        codeInsee,
        data: {
          isArm: id.isArm,
          masterCodeInsee: id.masterCodeInsee,
          departement: id.departement,
          atmoIndiceMoyen: agg.indiceMoyen,
          atmoJoursMauvais: agg.joursMauvais,
          atmoAsOf: latestDate || null,
        },
      });
    }
    log.info("parsing done", { rows_kept: updates.length });
    await upsertCommuneMetrics(ctx.prisma, updates, log, { dryRun: ctx.dryRun });
  },
};

import { downloadToCache, openCacheReadStream } from "@/lib/batch/download";
import { iterateCsvRows } from "@/lib/batch/csvStream";
import { upsertCommuneMetrics } from "@/lib/batch/writer";
import { parseFilosofiCsvRow } from "@/lib/insee/utils";
import { communeIdentity, type SourceModule } from "../context";

const URL = "https://www.data.gouv.fr/api/1/datasets/r/516130bc-4dcb-47f5-8347-ae96553c43ab";
const AS_OF = "2021";

export const filosofiSource: SourceModule = {
  name: "filosofi",
  async run(ctx, log) {
    const path = await downloadToCache({
      url: URL,
      cacheDir: ctx.cacheDir,
      noCache: ctx.noCache,
      logger: log,
      filename: "filosofi-disp-2021.csv",
    });

    log.info("parsing started");
    const updates: { codeInsee: string; data: Record<string, unknown> }[] = [];
    for await (const row of iterateCsvRows(openCacheReadStream(path), { delimiter: ";" })) {
      log.count("rowsIn");
      const parsed = parseFilosofiCsvRow(row);
      if (!parsed) continue;
      log.count("rowsKept");
      const id = communeIdentity(parsed.codeInsee);
      updates.push({
        codeInsee: parsed.codeInsee,
        data: {
          libelle: parsed.libelle ?? undefined,
          isArm: id.isArm,
          masterCodeInsee: id.masterCodeInsee,
          departement: id.departement,
          revenuMedianEurUce: parsed.revenuMedianEurUce,
          filosofiAsOf: AS_OF,
        },
      });
    }

    log.info("parsing done", { rows_kept: updates.length });
    await upsertCommuneMetrics(ctx.prisma, updates, log, { dryRun: ctx.dryRun });
  },
};

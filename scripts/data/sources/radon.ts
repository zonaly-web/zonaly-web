import { downloadToCache, openCacheReadStream } from "@/lib/batch/download";
import { iterateCsvRows } from "@/lib/batch/csvStream";
import { upsertCommuneMetrics } from "@/lib/batch/writer";
import { mapRadonClasse } from "@/lib/georisques/utils";
import { communeIdentity, type SourceModule } from "../context";

const URL = "https://www.data.gouv.fr/api/1/datasets/r/817114f8-9b61-48fa-b7a4-0e3c1331a44c";
const AS_OF = "2019";

export const radonSource: SourceModule = {
  name: "radon",
  async run(ctx, log) {
    const path = await downloadToCache({
      url: URL,
      cacheDir: ctx.cacheDir,
      noCache: ctx.noCache,
      logger: log,
      filename: "radon-2019.csv",
    });

    log.info("parsing started");
    const updates: { codeInsee: string; data: Record<string, unknown> }[] = [];
    for await (const row of iterateCsvRows(openCacheReadStream(path), { delimiter: ";" })) {
      log.count("rowsIn");
      const codeInsee = row.insee_com?.trim();
      if (!codeInsee || !/^\d{5}[AB]?$/.test(codeInsee)) continue;
      log.count("rowsKept");
      const id = communeIdentity(codeInsee);
      updates.push({
        codeInsee,
        data: {
          libelle: row.nom_comm?.trim() || undefined,
          isArm: id.isArm,
          masterCodeInsee: id.masterCodeInsee,
          departement: id.departement,
          radonClasse: mapRadonClasse(row.classe_potentiel?.trim()),
          radonAsOf: AS_OF,
        },
      });
    }

    log.info("parsing done", { rows_kept: updates.length });
    await upsertCommuneMetrics(ctx.prisma, updates, log, { dryRun: ctx.dryRun });
  },
};

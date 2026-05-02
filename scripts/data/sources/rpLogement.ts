import unzipper from "unzipper";
import { downloadToCache } from "@/lib/batch/download";
import { iterateCsvRows } from "@/lib/batch/csvStream";
import { upsertCommuneMetrics } from "@/lib/batch/writer";
import { parseRpLogementCsvRow } from "@/lib/insee/utils";
import { communeIdentity, type SourceModule } from "../context";

const URL = "https://www.insee.fr/fr/statistiques/fichier/8202349/base-cc-logement-2021_csv.zip";
const AS_OF = "2021";

export const rpLogementSource: SourceModule = {
  name: "rp_logement",
  async run(ctx, log) {
    const zipPath = await downloadToCache({
      url: URL,
      cacheDir: ctx.cacheDir,
      noCache: ctx.noCache,
      logger: log,
      filename: "rp-logement-2021.zip",
    });

    log.info("opening zip", { path: zipPath });
    const directory = await unzipper.Open.file(zipPath);
    const entry = directory.files.find(
      (f) => /logement.*\.csv$/i.test(f.path) && !/dico|metadon|meta/i.test(f.path),
    );
    if (!entry) {
      throw new Error(
        `rp_logement: no CSV entry found in zip. Files: ${directory.files.map((f) => f.path).join(", ")}`,
      );
    }
    log.info("zip entry selected", { entry: entry.path, bytes: entry.uncompressedSize });

    log.info("parsing started");
    const updates: { codeInsee: string; data: Record<string, unknown> }[] = [];
    for await (const row of iterateCsvRows(entry.stream(), { delimiter: ";" })) {
      log.count("rowsIn");
      const parsed = parseRpLogementCsvRow(row);
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
          partLocataires: parsed.partLocataires,
          partProprietaires: parsed.partProprietaires,
          rpLogementAsOf: AS_OF,
        },
      });
    }

    log.info("parsing done", { rows_kept: updates.length });
    await upsertCommuneMetrics(ctx.prisma, updates, log, { dryRun: ctx.dryRun });
  },
};

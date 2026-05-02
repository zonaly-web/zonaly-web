import { downloadToCache, openCacheReadStream } from "@/lib/batch/download";
import { iterateCsvRows } from "@/lib/batch/csvStream";
import { upsertCommuneMetrics } from "@/lib/batch/writer";
import { medianPriceM2FromValues } from "@/lib/cerema/utils";
import { communeIdentity, type SourceModule } from "../context";

const CURRENT_YEAR = "2025";
const BASE_YEAR = "2021";

const bulkUrl = (year: string) =>
  `https://files.data.gouv.fr/geo-dvf/latest/csv/${year}/full.csv.gz`;

const HABITAT_TYPES = new Set(["1", "2"]); // 1=Maison, 2=Appartement

async function aggregateYear(
  year: string,
  cacheDir: string,
  noCache: boolean,
  log: import("@/lib/batch/logger").Logger,
): Promise<Map<string, number[]>> {
  const path = await downloadToCache({
    url: bulkUrl(year),
    cacheDir,
    noCache,
    logger: log,
    filename: `dvf-${year}.csv.gz`,
  });

  log.info("parsing started", { year });
  const grouped = new Map<string, number[]>();
  for await (const row of iterateCsvRows(openCacheReadStream(path), {
    delimiter: ",",
    gzip: true,
  })) {
    log.count("rowsIn");
    if (row.nature_mutation !== "Vente") continue;
    if (!HABITAT_TYPES.has(row.code_type_local)) continue;
    const codeCommune = row.code_commune?.trim();
    if (!codeCommune || !/^\d{5}[AB]?$/.test(codeCommune)) continue;
    const valeur = Number(row.valeur_fonciere);
    const surface = Number(row.surface_reelle_bati);
    if (!Number.isFinite(valeur) || valeur <= 0) continue;
    if (!Number.isFinite(surface) || surface <= 0) continue;
    log.count("rowsKept");
    const pricePerM2 = valeur / surface;
    let bucket = grouped.get(codeCommune);
    if (!bucket) {
      bucket = [];
      grouped.set(codeCommune, bucket);
    }
    bucket.push(pricePerM2);
  }
  log.info("year done", { year, communes: grouped.size });
  return grouped;
}

export const dvfSource: SourceModule = {
  name: "dvf",
  async run(ctx, log) {
    log.info("downloading current year", { year: CURRENT_YEAR });
    const current = await aggregateYear(CURRENT_YEAR, ctx.cacheDir, ctx.noCache, log);
    log.info("downloading base year", { year: BASE_YEAR });
    const base = await aggregateYear(BASE_YEAR, ctx.cacheDir, ctx.noCache, log);

    const allCommunes = new Set<string>([...current.keys(), ...base.keys()]);
    log.info("computing medians", { communes: allCommunes.size });

    const updates: { codeInsee: string; data: Record<string, unknown> }[] = [];
    for (const codeInsee of allCommunes) {
      const currentPrices = current.get(codeInsee);
      const basePrices = base.get(codeInsee);
      const prixCurrent = currentPrices ? medianPriceM2FromValues(currentPrices.slice()) : null;
      const prixBase = basePrices ? medianPriceM2FromValues(basePrices.slice()) : null;
      const evolution =
        prixCurrent != null && prixBase != null && prixBase > 0
          ? ((prixCurrent - prixBase) / prixBase) * 100
          : null;
      const id = communeIdentity(codeInsee);
      updates.push({
        codeInsee,
        data: {
          isArm: id.isArm,
          masterCodeInsee: id.masterCodeInsee,
          departement: id.departement,
          prixMedianM2Eur: prixCurrent,
          prixMedianM2EurNMinus5: prixBase,
          prixMedianM2EvolutionPct: evolution,
          ventesCount: currentPrices?.length ?? 0,
          dvfAsOf: CURRENT_YEAR,
          dvfBaseYear: BASE_YEAR,
        },
      });
    }

    log.info("parsing done", { rows_kept: updates.length });
    await upsertCommuneMetrics(ctx.prisma, updates, log, { dryRun: ctx.dryRun });
  },
};

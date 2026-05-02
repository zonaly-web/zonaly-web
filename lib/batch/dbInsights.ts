import type { PrismaClient } from "@/lib/prisma/generated/client";
import type { Logger } from "./logger";

const COMMUNE_METRIC_FIELDS = [
  "libelle",
  "masterCodeInsee",
  "departement",
  "revenuMedianEurUce",
  "filosofiAsOf",
  "partLocataires",
  "partProprietaires",
  "rpLogementAsOf",
  "radonClasse",
  "radonAsOf",
  "cambriolagesPer1000Logements",
  "agressionsPer1000Habitants",
  "ssmsiAsOf",
  "prixMedianM2Eur",
  "prixMedianM2EurNMinus5",
  "prixMedianM2EvolutionPct",
  "ventesCount",
  "dvfAsOf",
  "atmoIndiceMoyen",
  "atmoJoursMauvais",
  "atmoAsOf",
  "permitsLogementsAutorises12m",
  "permitsCount12m",
  "sitadelAsOf",
] as const;

export async function logNullCounts(prisma: PrismaClient, log: Logger): Promise<void> {
  const total = await prisma.communeMetric.count();
  log.info("===== NULL COUNTS (CommuneMetric) =====");
  log.info("rows", { total });
  for (const field of COMMUNE_METRIC_FIELDS) {
    const nulls = await prisma.communeMetric.count({ where: { [field]: null } });
    const pct = total === 0 ? "0.0" : ((nulls / total) * 100).toFixed(1);
    log.info("nulls", { field, count: nulls, pct: `${pct}%` });
  }

  const qpvCount = await prisma.qpv.count();
  const qrrCount = await prisma.qrr.count();
  log.info("Qpv rows", { count: qpvCount });
  log.info("Qrr rows", { count: qrrCount });
}

import { Prisma } from "@/lib/prisma/generated/client";
import { prisma } from "@/lib/prisma/prisma";

const ARM_MASTER_CODES = ["75056", "13055", "69123"] as const;

export type NumericMetricField =
  | "prixMedianM2Eur"
  | "partProprietaires"
  | "revenuMedianEurUce"
  | "atmoIndiceMoyen"
  | "atmoJoursMauvais"
  | "cambriolagesPer1000Logements"
  | "agressionsPer1000Habitants";

type PercentileRow = { pct: number };

/**
 * Renvoie le percentile national 0–100 d'une valeur sur la table CommuneMetric.
 * - Exclut les 3 communes-mères ARM (75056, 13055, 69123) pour ne pas double-compter avec les arrondissements.
 * - `invert: true` pour les métriques où plus = pire (cambriolages, agressions, indice ATMO).
 *   Renvoie alors le percentile de la queue inverse (0 = pire, 100 = meilleur).
 */
export async function nationalPercentile(
  field: NumericMetricField,
  value: number,
  opts: { invert?: boolean } = {},
): Promise<number> {
  const column = Prisma.raw(`"${field}"`);
  const armList = Prisma.join(ARM_MASTER_CODES.map((c) => Prisma.sql`${c}`));

  const rows = await prisma.$queryRaw<PercentileRow[]>(Prisma.sql`
    SELECT (
      COUNT(*) FILTER (WHERE ${column} <= ${value})::float
      / NULLIF(COUNT(*), 0)::float
    ) * 100 AS pct
    FROM "CommuneMetric"
    WHERE ${column} IS NOT NULL
      AND "codeInsee" NOT IN (${armList})
  `);

  const pct = rows[0]?.pct ?? null;
  if (pct == null) return 50;
  return opts.invert ? 100 - pct : pct;
}

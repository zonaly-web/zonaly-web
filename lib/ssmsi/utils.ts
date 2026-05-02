import type { SsmsiUpstreamRow } from "./schemas";

const CITYCODE_REGEX = /^\d{5}[AB]?$/;

function parseDecimal(raw: string | undefined): number | null {
  if (raw == null) return null;
  const trimmed = String(raw).trim();
  if (trimmed.length === 0 || trimmed === "NA") return null;
  const n = Number(trimmed.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export function parseSsmsiCsvRow(row: Record<string, string>): SsmsiUpstreamRow | null {
  const codgeo = row.CODGEO_2025?.trim();
  if (!codgeo || !CITYCODE_REGEX.test(codgeo)) return null;
  const annee = parseDecimal(row.annee);
  const indicateur = row.indicateur?.trim();
  if (annee == null || !indicateur) return null;
  return {
    CODGEO_2025: codgeo,
    annee,
    indicateur,
    nombre: parseDecimal(row.nombre),
    taux_pour_mille: parseDecimal(row.taux_pour_mille),
    insee_pop: parseDecimal(row.insee_pop),
  };
}

const AGRESSION_INDICATEURS = new Set([
  "Violences physiques hors cadre familial",
  "Violences sexuelles",
  "Vols violents sans arme",
  "Vols avec armes",
]);

const CAMBRIOLAGE_INDICATEUR = "Cambriolages de logement";

export function pickLatestYear(rows: SsmsiUpstreamRow[]): number | null {
  if (rows.length === 0) return null;
  return rows.reduce((max, r) => (r.annee > max ? r.annee : max), rows[0].annee);
}

export function computeMetrics(rows: SsmsiUpstreamRow[], year: number) {
  const yearRows = rows.filter((r) => r.annee === year);

  const cambriolage = yearRows.find((r) => r.indicateur === CAMBRIOLAGE_INDICATEUR);
  const cambriolagesPer1000Logements = cambriolage?.taux_pour_mille ?? null;

  const agressionRows = yearRows.filter((r) => AGRESSION_INDICATEURS.has(r.indicateur));
  const agressionsPer1000Habitants =
    agressionRows.length === 0
      ? null
      : agressionRows.reduce((acc, r) => acc + (r.taux_pour_mille ?? 0), 0);

  return { cambriolagesPer1000Logements, agressionsPer1000Habitants };
}

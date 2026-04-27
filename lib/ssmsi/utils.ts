import type { SsmsiUpstreamRow } from "./schemas";

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

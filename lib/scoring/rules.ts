import { nationalPercentile } from "./percentile";

function clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, n));
}

// ─── Immobilier ──────────────────────────────────────────────────────────────

/**
 * Évolution prix m² 5 ans (en %, ex. 47 = +47%).
 * < -10 → 0 ; -10..0 → 0–40 lin. ; 0..15 → 40–80 lin. ; 15..45 → 80–100 lin. ; >45 → 100.
 */
export function scoreEvolution5Y(evol: number | null): number | null {
  if (evol == null) return null;
  if (evol < -10) return 0;
  if (evol < 0) return clamp(40 * ((evol + 10) / 10));
  if (evol < 15) return clamp(40 + 40 * (evol / 15));
  if (evol < 45) return clamp(80 + 20 * ((evol - 15) / 30));
  return 100;
}

export async function scorePrixMedianM2(prix: number | null): Promise<number | null> {
  if (prix == null) return null;
  const pct = await nationalPercentile("prixMedianM2Eur", prix);
  return Math.min(80, pct);
}

export async function scorePartProprietaires(part: number | null): Promise<number | null> {
  if (part == null) return null;
  return nationalPercentile("partProprietaires", part);
}

export async function scoreRevenuMedian(rev: number | null): Promise<number | null> {
  if (rev == null) return null;
  return nationalPercentile("revenuMedianEurUce", rev);
}

// ─── Environnement ───────────────────────────────────────────────────────────

/**
 * ATMO annuel hybride.
 * - indiceMoyen > 4 → 30 (alerte sanitaire)
 * - indiceMoyen < 1.8 → 85 (très bon air)
 * - sinon : 0.6 × percentile_inverse(indiceMoyen) + 0.4 × percentile_inverse(joursMauvais)
 */
export async function scoreAtmo(
  indiceMoyen: number | null,
  joursMauvais: number | null,
): Promise<number | null> {
  if (indiceMoyen == null && joursMauvais == null) return null;
  if (indiceMoyen != null) {
    if (indiceMoyen > 4) return 30;
    if (indiceMoyen < 1.8) return 85;
  }
  const indicePct =
    indiceMoyen != null
      ? await nationalPercentile("atmoIndiceMoyen", indiceMoyen, { invert: true })
      : null;
  const joursPct =
    joursMauvais != null
      ? await nationalPercentile("atmoJoursMauvais", joursMauvais, { invert: true })
      : null;
  if (indicePct == null && joursPct == null) return null;
  if (indicePct == null) return joursPct;
  if (joursPct == null) return indicePct;
  return 0.6 * indicePct + 0.4 * joursPct;
}

/**
 * Radon — `mapRadonClasse` renvoie "Faible" | "Modéré" | "Élevé" | "Aucun" (cf. lib/georisques/utils.ts).
 */
export function scoreRadon(label: string | null | undefined): number | null {
  if (!label) return null;
  switch (label) {
    case "Faible":
    case "Aucun":
      return 90;
    case "Modéré":
      return 55;
    case "Élevé":
      return 20;
    default:
      return null;
  }
}

/**
 * Argile (RGA) — mêmes labels que radon.
 */
export function scoreArgile(label: string | null | undefined): number | null {
  if (!label) return null;
  switch (label) {
    case "Faible":
    case "Aucun":
      return 90;
    case "Modéré":
      return 55;
    case "Élevé":
      return 25;
    default:
      return null;
  }
}

export function scoreSitesPollues(count: number | null): number | null {
  if (count == null) return null;
  if (count === 0) return 100;
  if (count <= 2) return 75;
  if (count <= 5) return 55;
  if (count <= 10) return 35;
  return 15;
}

// ─── Sécurité ────────────────────────────────────────────────────────────────

export async function scoreCambriolages(value: number | null): Promise<number | null> {
  if (value == null) return null;
  return nationalPercentile("cambriolagesPer1000Logements", value, { invert: true });
}

export async function scoreAgressions(value: number | null): Promise<number | null> {
  if (value == null) return null;
  return nationalPercentile("agressionsPer1000Habitants", value, { invert: true });
}

export function scoreQpv(count: number | null): number | null {
  if (count == null) return null;
  if (count === 0) return 100;
  if (count === 1) return 70;
  if (count === 2) return 50;
  return 30;
}

export function scoreQrr(count: number | null): number | null {
  if (count == null) return null;
  if (count === 0) return 100;
  if (count === 1) return 60;
  return 30;
}

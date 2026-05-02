import { GeomutationProperties } from "./schemas";

/**
 * Calcule la médiane d'un tableau de valeurs déjà filtrées (prix par m² > 0).
 * Mute le tableau (sort in-place) — utilise une copie si tu en as besoin ailleurs.
 */
export function medianPriceM2FromValues(values: number[]): number | null {
  if (values.length === 0) return null;
  values.sort((a, b) => a - b);
  const n = values.length;
  const mid = Math.floor(n / 2);
  return n % 2 === 0 ? (values[mid - 1] + values[mid]) / 2 : values[mid];
}

export function medianPriceM2(props: GeomutationProperties[]): number | null {
  const prices = props
    .filter((p) => p.libnatmut.startsWith("Vente"))
    .filter((p) => p.sbati > 0 && p.valeurfonc > 0)
    .map((p) => p.valeurfonc / p.sbati);
  return medianPriceM2FromValues(prices);
}

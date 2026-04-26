import { GeomutationProperties } from "./schemas";

export function medianPriceM2(props: GeomutationProperties[]): number | null {
  const prices = props
    .filter((p) => p.libnatmut.startsWith("Vente"))
    .filter((p) => p.sbati > 0 && p.valeurfonc > 0)
    .map((p) => p.valeurfonc / p.sbati)
    .sort((a, b) => a - b);
  const n = prices.length;
  if (n === 0) return null;
  const mid = Math.floor(n / 2);
  return n % 2 === 0 ? (prices[mid - 1] + prices[mid]) / 2 : prices[mid];
}

import type { WeightedScore } from "./types";

/**
 * Moyenne pondérée des métriques d'une dimension.
 * - Les métriques null sont exclues, les poids restants sont renormalisés.
 * - Renvoie null si <50% du poids total est dispo.
 */
export function aggregateDimension(metrics: WeightedScore[]): number | null {
  const totalWeight = metrics.reduce((sum, m) => sum + m.weight, 0);
  if (totalWeight === 0) return null;

  const valid = metrics.filter((m) => m.score != null);
  const validWeight = valid.reduce((sum, m) => sum + m.weight, 0);
  if (validWeight / totalWeight < 0.5) return null;

  const weightedSum = valid.reduce((sum, m) => sum + (m.score as number) * m.weight, 0);
  return weightedSum / validWeight;
}

/**
 * Score global = moyenne équipondérée des dimensions disponibles.
 * - Renvoie null si <2 dimensions dispo.
 * - Carton rouge : si une dim. est en E (<20), global plafonné à C (59).
 * - Plancher : si toutes les dim. dispo sont ≥ B (60), global ≥ 60.
 */
export function aggregateGlobal(dims: (number | null)[]): number | null {
  const valid = dims.filter((d): d is number => d != null);
  if (valid.length < 2) return null;

  const avg = valid.reduce((a, b) => a + b, 0) / valid.length;

  if (Math.min(...valid) < 20) return Math.min(avg, 59);

  if (valid.length === dims.length && valid.every((v) => v >= 60)) return Math.max(avg, 60);

  return avg;
}

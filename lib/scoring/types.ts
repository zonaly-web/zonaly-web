export type Grade = "A" | "B" | "C" | "D" | "E";

export type ScoredMetric<T = number> = {
  value: T | null;
  score: number | null;
};

export type WeightedScore = {
  score: number | null;
  weight: number;
};

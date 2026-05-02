import type { Grade } from "./types";

export function scoreToGrade(score: number | null): Grade | null {
  if (score == null) return null;
  if (score >= 80) return "A";
  if (score >= 60) return "B";
  if (score >= 40) return "C";
  if (score >= 20) return "D";
  return "E";
}

export type BarColor = "green" | "yellow-green" | "yellow" | "orange" | "red";

export function gradeColor(grade: Grade | null): BarColor {
  switch (grade) {
    case "A":
      return "green";
    case "B":
      return "yellow-green";
    case "C":
      return "yellow";
    case "D":
      return "orange";
    case "E":
      return "red";
    default:
      return "yellow";
  }
}

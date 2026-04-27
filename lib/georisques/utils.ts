import z from "zod";
import { RgaResponseSchema, SspResponseSchema } from "./schemas";

export function mapRadonClasse(classePotentiel: string | undefined): string {
  switch (classePotentiel) {
    case "3":
      return "Élevé";
    case "2":
      return "Modéré";
    case "1":
      return "Faible";
    default:
      return "Aucun";
  }
}

export function mapRgaMax(rga: z.infer<typeof RgaResponseSchema>): string {
  const codes = rga.content.map((c) => Number(c.codeExposition)).filter((n) => Number.isFinite(n));
  if (codes.length === 0) return "Aucun";
  const max = Math.max(...codes);
  switch (max) {
    case 3:
      return "Élevé";
    case 2:
      return "Modéré";
    case 1:
      return "Faible";
    default:
      return "Aucun";
  }
}

export function countSitesPollues(ssp: z.infer<typeof SspResponseSchema>): number {
  // CASIAS volontairement exclu : présomption historique non vérifiée (cf. README).
  // On garde instructions + SIS + SUP = pollution qualifiée par l'État.
  return (
    (ssp.instructions?.totalElements ?? 0) +
    (ssp.conclusionsSis?.totalElements ?? 0) +
    (ssp.conclusionsSup?.totalElements ?? 0)
  );
}

import { z } from "zod";

export const GeorisquesQuerySchema = z.object({
  codeInsee: z.string().regex(/^\d{5}[AB]?$/),
});

const PagedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z
    .object({
      totalElements: z.number(),
      content: z.array(itemSchema),
    })
    .passthrough();

const RadonItemSchema = z
  .object({
    classePotentiel: z.string(),
    codeInsee: z.string().nullable().optional(),
    libelleCommune: z.string().nullable().optional(),
  })
  .passthrough();

export const RadonResponseSchema = PagedResponseSchema(RadonItemSchema);

const RgaItemSchema = z
  .object({
    codeExposition: z.string(),
    exposition: z.string().nullable().optional(),
  })
  .passthrough();

export const RgaResponseSchema = PagedResponseSchema(RgaItemSchema);

export const SspResponseSchema = z
  .object({
    casias: PagedResponseSchema(z.unknown()).optional(),
    instructions: PagedResponseSchema(z.unknown()).optional(),
    conclusionsSis: PagedResponseSchema(z.unknown()).optional(),
    conclusionsSup: PagedResponseSchema(z.unknown()).optional(),
  })
  .passthrough();

export const GeorisquesEnvApiResponseSchema = z.object({
  sitesPolluesCount: z.number(),
  radon: z.string(),
  argile: z.string(),
});
export type GeorisquesEnvApiResponse = z.infer<typeof GeorisquesEnvApiResponseSchema>;

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
  return (
    (ssp.casias?.totalElements ?? 0) +
    (ssp.instructions?.totalElements ?? 0) +
    (ssp.conclusionsSis?.totalElements ?? 0) +
    (ssp.conclusionsSup?.totalElements ?? 0)
  );
}

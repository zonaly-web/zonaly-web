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
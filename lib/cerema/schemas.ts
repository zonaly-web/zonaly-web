import { z } from "zod";

export const CeremaPrixQuerySchema = z.object({
  citycode: z.string().regex(/^\d{5}[AB]?$/),
});

export const GeomutationPropertiesSchema = z
  .object({
    valeurfonc: z.coerce.number(),
    sbati: z.coerce.number(),
    libnatmut: z.string(),
    codtypbien: z.string(),
    anneemut: z.number(),
  })
  .passthrough();

export const GeomutationFeatureSchema = z
  .object({
    type: z.literal("Feature"),
    properties: GeomutationPropertiesSchema,
  })
  .passthrough();

export const GeomutationPageSchema = z.object({
  type: z.literal("FeatureCollection"),
  count: z.number(),
  next: z.string().nullable(),
  features: z.array(GeomutationFeatureSchema),
});

export const CeremaPrixApiResponseSchema = z.object({
  latestYear: z.number(),
  baseYear: z.number(),
  prixMedianM2: z.number().nullable(),
  evolution5Y: z.number().nullable(),
  prixMedianM2Score: z.number().nullable(),
  evolution5YScore: z.number().nullable(),
});

export type GeomutationProperties = z.infer<typeof GeomutationPropertiesSchema>;
export type CeremaPrixApiResponse = z.infer<typeof CeremaPrixApiResponseSchema>;

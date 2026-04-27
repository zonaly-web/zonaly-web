import { z } from "zod";

export const SsmsiQuerySchema = z.object({
  citycode: z.string().regex(/^\d{5}[AB]?$/),
});

export const SsmsiUpstreamRowSchema = z
  .object({
    CODGEO_2025: z.string(),
    annee: z.number(),
    indicateur: z.string(),
    nombre: z.number().nullable(),
    taux_pour_mille: z.number().nullable(),
    insee_pop: z.number().nullable(),
  })
  .passthrough();

export const SsmsiUpstreamResponseSchema = z.object({
  data: z.array(SsmsiUpstreamRowSchema),
  meta: z
    .object({ page: z.number(), page_size: z.number(), total: z.number() })
    .partial()
    .optional(),
  links: z.object({ next: z.string().nullable().optional() }).partial().optional(),
});

export const SsmsiApiResponseSchema = z.object({
  year: z.number(),
  cambriolagesPer1000Logements: z.number().nullable(),
  agressionsPer1000Habitants: z.number().nullable(),
});

export type SsmsiUpstreamRow = z.infer<typeof SsmsiUpstreamRowSchema>;
export type SsmsiApiResponse = z.infer<typeof SsmsiApiResponseSchema>;

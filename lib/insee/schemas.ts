import { z } from "zod";

export const InseeCommuneQuerySchema = z.object({
  citycode: z.string().regex(/^\d{5}[AB]?$/),
});

export const MelodiObservationSchema = z
  .object({
    dimensions: z.record(z.string(), z.string()),
    measures: z.object({
      OBS_VALUE_NIVEAU: z.object({ value: z.number() }),
    }),
  })
  .passthrough();

export const MelodiResponseSchema = z
  .object({
    observations: z.array(MelodiObservationSchema),
  })
  .passthrough();

export const InseeCommuneApiResponseSchema = z.object({
  revenuMedianEurYr: z.number().nullable(),
  partLocataires: z.number().nullable(),
  partProprietaires: z.number().nullable(),
  filosofiYear: z.number().nullable(),
  rpYear: z.number().nullable(),
  revenuMedianScore: z.number().nullable(),
  partProprietairesScore: z.number().nullable(),
});

export type MelodiObservation = z.infer<typeof MelodiObservationSchema>;
export type InseeCommuneApiResponse = z.infer<typeof InseeCommuneApiResponseSchema>;

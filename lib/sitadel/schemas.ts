import { z } from "zod";

export const SitadelQuerySchema = z.object({
  citycode: z.string().regex(/^\d{5}[AB]?$/),
});

export const SitadelPermitRowSchema = z.looseObject({
  NUM_DAU: z.string().nullable(),
  DATE_REELLE_AUTORISATION: z.string().nullable(),
  NB_LGT_TOT_CREES: z.number().nullable(),
  ETAT_DAU: z.number().nullable(),
});
export type SitadelPermitRow = z.infer<typeof SitadelPermitRowSchema>;

export const SitadelPermitsResponseSchema = z.array(SitadelPermitRowSchema);

export const SitadelApiResponseSchema = z.object({
  logementsAutorises: z.number(),
  permitsCount: z.number(),
  windowMonths: z.number(),
  lastAuthorizationDate: z.string().nullable(),
  granularity: z.enum(["commune", "arrondissement"]),
});
export type SitadelApiResponse = z.infer<typeof SitadelApiResponseSchema>;

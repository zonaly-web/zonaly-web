import { z } from "zod";

export const OverpassQuerySchema = z.object({
  citycode: z.string().regex(/^\d{5}[AB]?$/),
});

export const OverpassRawResponseSchema = z
  .object({
    elements: z.array(z.unknown()),
  })
  .passthrough();

export const OverpassApiResponseSchema = z.object({
  transports: z.number(),
  commerces: z.number(),
  ecoles: z.number(),
});
export type OverpassApiResponse = z.infer<typeof OverpassApiResponseSchema>;

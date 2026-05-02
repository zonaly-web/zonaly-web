import { z } from "zod";

export const QpvQuerySchema = z.object({
  citycode: z.string().regex(/^\d{5}[AB]?$/),
});

export const QpvApiResponseSchema = z.object({
  count: z.number().int().nonnegative(),
  score: z.number().nullable(),
});

export type QpvApiResponse = z.infer<typeof QpvApiResponseSchema>;

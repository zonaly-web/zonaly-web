import { z } from "zod";

export const AtmoQuerySchema = z.object({
  citycode: z.string().regex(/^\d{5}[AB]?$/),
});

export const TabularRowSchema = z
  .object({
    code_zone: z.union([z.string(), z.number()]).nullable().optional(),
    lib_zone: z.string().nullable().optional(),
    code_qual: z.number().int().nullable().optional(),
    lib_qual: z.string().nullable().optional(),
    coul_qual: z.string().nullable().optional(),
    date_ech: z.string().nullable().optional(),
    code_no2: z.number().int().nullable().optional(),
    code_o3: z.number().int().nullable().optional(),
    code_pm10: z.number().int().nullable().optional(),
    code_pm25: z.number().int().nullable().optional(),
    code_so2: z.number().int().nullable().optional(),
  })
  .passthrough();

export const TabularResponseSchema = z
  .object({
    data: z.array(TabularRowSchema),
    meta: z
      .object({
        total: z.number().optional(),
        page: z.number().optional(),
        page_size: z.number().optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

export const AtmoApiResponseSchema = z.object({
  codeQual: z.number().int().nullable(),
  libQual: z.string().nullable(),
  coulQual: z.string().nullable(),
  dateEch: z.string().nullable(),
  fallbackUsed: z.boolean(),
});

export type TabularRow = z.infer<typeof TabularRowSchema>;
export type AtmoApiResponse = z.infer<typeof AtmoApiResponseSchema>;

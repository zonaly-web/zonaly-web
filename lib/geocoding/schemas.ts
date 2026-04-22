import { z } from "zod";

export const AutocompleteQuerySchema = z.object({
  q: z.string().trim().min(3),
});

export const AutocompleteResultSchema = z.object({
  country: z.string(),
  fulltext: z.string(),
  street: z.string().optional(),
  city: z.string().optional(),
  zipcode: z.string().optional(),
  x: z.number(),
  y: z.number(),
});

export const AutocompleteUpstreamResponseSchema = z.object({
  status: z.string().optional(),
  results: z.array(AutocompleteResultSchema.passthrough()),
});

export const AutocompleteApiResponseSchema = z.object({
  results: z.array(AutocompleteResultSchema),
});

export const GeocodeQuerySchema = z.object({
  q: z.string().trim().min(3),
});

export const GeocodeFeatureSchema = z.object({
  type: z.literal("Feature"),
  geometry: z.object({
    type: z.literal("Point"),
    coordinates: z.tuple([z.number(), z.number()]),
  }),
  properties: z
    .object({
      label: z.string(),
      score: z.number().optional(),
      housenumber: z.string().optional(),
      name: z.string().optional(),
      postcode: z.string().optional(),
      citycode: z.string().optional(),
      city: z.string().optional(),
      context: z.string().optional(),
      x: z.number().optional(),
      y: z.number().optional(),
    })
    .passthrough(),
});

export const GeocodeUpstreamResponseSchema = z.object({
  type: z.literal("FeatureCollection"),
  features: z.array(GeocodeFeatureSchema),
});

export const GeocodeApiResponseSchema = z.object({
  feature: GeocodeFeatureSchema.nullable(),
});

export type AutocompleteResult = z.infer<typeof AutocompleteResultSchema>;
export type GeocodeFeature = z.infer<typeof GeocodeFeatureSchema>;
export type AutocompleteApiResponse = z.infer<typeof AutocompleteApiResponseSchema>;
export type GeocodeApiResponse = z.infer<typeof GeocodeApiResponseSchema>;

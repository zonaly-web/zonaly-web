import { z } from "zod";

export const QrrQuerySchema = z.object({
  citycode: z.string().regex(/^\d{5}[AB]?$/),
});

export const QrrApiResponseSchema = z.object({
  count: z.number().int().nonnegative(),
});

export type QrrApiResponse = z.infer<typeof QrrApiResponseSchema>;

const CommuneGeometrySchema = z
  .object({
    type: z.enum(["Polygon", "MultiPolygon"]),
    coordinates: z.unknown(),
  })
  .nullable();

export const CommuneContourSchema = z.object({
  geometry: CommuneGeometrySchema.optional(),
});

export type CommuneGeometry = z.infer<typeof CommuneGeometrySchema>;

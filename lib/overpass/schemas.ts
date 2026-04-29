import { z } from "zod";

export const OverpassQuerySchema = z.object({
  citycode: z.string().regex(/^\d{5}[AB]?$/),
});

const OverpassCountSchema = z.object({
  type: z.literal("count"),
  id: z.number(),
  tags: z.object({
    total: z.string(),
    nodes: z.string().optional(),
    ways: z.string().optional(),
    relations: z.string().optional(),
    areas: z.string().optional(),
  }),
});

const OverpassRouteRelationSchema = z.object({
  type: z.literal("relation"),
  id: z.number(),
  tags: z
    .object({
      route: z.string(),
      ref: z.string().optional(),
      name: z.string().optional(),
    })
    .passthrough(),
});

export type OverpassCount = z.infer<typeof OverpassCountSchema>;
export type OverpassRouteRelation = z.infer<typeof OverpassRouteRelationSchema>;

// Mixed response: relations first (out tags), then 2 counts (commerces, ecoles).
// We split the elements array into 3 named props so the consumer doesn't have
// to remember which index is which.
export const OverpassResponseSchema = z
  .object({
    elements: z.array(
      z.discriminatedUnion("type", [OverpassCountSchema, OverpassRouteRelationSchema]),
    ),
  })
  .transform(({ elements }) => {
    const relations: OverpassRouteRelation[] = [];
    const counts: OverpassCount[] = [];
    for (const el of elements) {
      if (el.type === "relation") relations.push(el);
      else counts.push(el);
    }
    const [commerces, ecoles] = counts;
    return { relations, commerces, ecoles };
  });

export const OverpassApiResponseSchema = z.object({
  transports: z.number(),
  commerces: z.number(),
  ecoles: z.number(),
});
export type OverpassApiResponse = z.infer<typeof OverpassApiResponseSchema>;

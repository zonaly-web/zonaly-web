import { OverpassRouteRelation } from "./schemas";

export function countUniqueLines(relations: OverpassRouteRelation[]): number {
  const lines = new Set<string>();
  for (const r of relations) {
    const ref = r.tags.ref ?? r.tags.name ?? String(r.id);
    lines.add(`${r.tags.route}:${ref}`);
  }
  return lines.size;
}

export function readCount(element: unknown): number {
  if (
    element &&
    typeof element === "object" &&
    "type" in element &&
    (element as { type: unknown }).type === "count" &&
    "tags" in element
  ) {
    const tags = (element as { tags: unknown }).tags;
    if (tags && typeof tags === "object" && "total" in tags) {
      const total = (tags as { total: unknown }).total;
      const parsed = typeof total === "string" ? Number(total) : NaN;
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return 0;
}

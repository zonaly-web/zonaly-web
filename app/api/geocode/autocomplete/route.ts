import { NextRequest, NextResponse } from "next/server";
import {
  AutocompleteQuerySchema,
  AutocompleteUpstreamResponseSchema,
} from "@/lib/geocoding/schemas";

const UPSTREAM = "https://data.geopf.fr/geocodage/completion";

export async function GET(req: NextRequest) {
  const parsed = AutocompleteQuerySchema.safeParse({
    q: req.nextUrl.searchParams.get("q") ?? "",
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_query" }, { status: 400 });
  }

  const url = new URL(UPSTREAM);
  url.searchParams.set("text", parsed.data.q);
  url.searchParams.set("type", "StreetAddress");
  url.searchParams.set("maximumResponses", "5");

  const upstream = await fetch(url, { cache: "no-store" });
  if (!upstream.ok) {
    return NextResponse.json({ error: "upstream_error" }, { status: 502 });
  }

  const json = await upstream.json();
  const validated = AutocompleteUpstreamResponseSchema.safeParse(json);
  if (!validated.success) {
    return NextResponse.json({ error: "upstream_invalid" }, { status: 502 });
  }

  const results = validated.data.results
    .filter((r) => r.country === "StreetAddress")
    .map((r) => ({
      country: r.country,
      fulltext: r.fulltext,
      street: r.street,
      city: r.city,
      zipcode: r.zipcode,
      x: r.x,
      y: r.y,
    }));

  return NextResponse.json({ results });
}

import { NextRequest, NextResponse } from "next/server";
import {
  GeocodeQuerySchema,
  GeocodeUpstreamResponseSchema,
} from "@/lib/geocoding/schemas";

const UPSTREAM = "https://data.geopf.fr/geocodage/search";

export async function GET(req: NextRequest) {
  const parsed = GeocodeQuerySchema.safeParse({
    q: req.nextUrl.searchParams.get("q") ?? "",
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_query" }, { status: 400 });
  }

  const url = new URL(UPSTREAM);
  url.searchParams.set("q", parsed.data.q);
  url.searchParams.set("index", "address");
  url.searchParams.set("limit", "1");

  const upstream = await fetch(url, { cache: "no-store" });
  if (!upstream.ok) {
    return NextResponse.json({ error: "upstream_error" }, { status: 502 });
  }

  const json = await upstream.json();
  const validated = GeocodeUpstreamResponseSchema.safeParse(json);
  if (!validated.success) {
    return NextResponse.json({ error: "upstream_invalid" }, { status: 502 });
  }

  const feature = validated.data.features[0] ?? null;
  return NextResponse.json({ feature });
}

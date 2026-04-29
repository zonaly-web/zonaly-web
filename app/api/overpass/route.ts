import { NextRequest, NextResponse } from "next/server";
import { OverpassQuerySchema, OverpassRawResponseSchema } from "@/lib/overpass/schemas";
import { readCount } from "@/lib/overpass/utils";

const OVERPASS_ENDPOINT = "https://overpass-api.de/api/interpreter";

function buildQuery(citycode: string): string {
  return `[out:json][timeout:60];
area["ref:INSEE"="${citycode}"]["admin_level"="8"]->.a;
(
  node(area.a)[public_transport=stop_position];
  node(area.a)[highway=bus_stop];
  node(area.a)[railway~"^(station|tram_stop|halt|subway_entrance)$"];
);
out count;
(
  nwr(area.a)[shop];
  node(area.a)[amenity=marketplace];
);
out count;
(
  nwr(area.a)[amenity~"^(school|kindergarten|college|university)$"];
);
out count;`;
}

export async function GET(req: NextRequest) {
  const parsed = OverpassQuerySchema.safeParse({
    citycode: req.nextUrl.searchParams.get("citycode") ?? "",
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_query" }, { status: 400 });
  }

  const { citycode } = parsed.data;
  const body = `data=${encodeURIComponent(buildQuery(citycode))}`;

  try {
    const res = await fetch(OVERPASS_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Zonaly/1.0 (+https://zonaly.fr)",
        Accept: "application/json",
      },
      body,
      next: { revalidate: 60 * 60 * 24 * 7 },
    });
    if (!res.ok) {
      return NextResponse.json({ error: "upstream_error" }, { status: 502 });
    }
    const json = await res.json();
    const raw = OverpassRawResponseSchema.parse(json);

    const counts = raw.elements.filter(
      (el) =>
        el !== null &&
        typeof el === "object" &&
        "type" in el &&
        (el as { type: unknown }).type === "count",
    );

    return NextResponse.json({
      transports: readCount(counts[0]),
      commerces: readCount(counts[1]),
      ecoles: readCount(counts[2]),
    });
  } catch {
    return NextResponse.json({ error: "upstream_error" }, { status: 502 });
  }
}

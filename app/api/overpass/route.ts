import { OverpassQuerySchema, OverpassResponseSchema } from "@/lib/overpass/schemas";
import { countUniqueLines } from "@/lib/overpass/utils";
import { NextRequest, NextResponse } from "next/server";

const OVERPASS_ENDPOINT = "https://overpass-api.de/api/interpreter";

function buildQuery(citycode: string): string {
  return `[out:json][timeout:120];
area["ref:INSEE"="${citycode}"]["admin_level"~"^(8|9)$"]->.a;
(
  node(area.a)[highway=bus_stop];
  node(area.a)[railway~"^(station|tram_stop|halt|subway_entrance)$"];
)->.stops;
rel(bn.stops)[type=route][route~"^(bus|subway|tram|train|light_rail|trolleybus)$"];
out tags;
(
  nwr(area.a)[shop];
  node(area.a)[amenity=marketplace];
);
out count;
(
  nwr(area.a)[amenity=school];
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

  try {
    const res = await fetch(OVERPASS_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Zonaly/1.0 (+https://zonaly.fr)",
        Accept: "application/json",
      },
      body: `data=${encodeURIComponent(buildQuery(citycode))}`,
      next: { revalidate: 60 * 60 * 24 * 7 },
    });
    if (!res.ok) {
      return NextResponse.json({ error: "upstream_error" }, { status: 502 });
    }

    const { relations, commerces, ecoles } = OverpassResponseSchema.parse(await res.json());

    return NextResponse.json({
      transports: countUniqueLines(relations),
      commerces: Number(commerces?.tags.total ?? 0),
      ecoles: Number(ecoles?.tags.total ?? 0),
    });
  } catch {
    return NextResponse.json({ error: "upstream_error" }, { status: 502 });
  }
}

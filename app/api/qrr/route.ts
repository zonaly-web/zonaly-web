import { prisma } from "@/lib/prisma/prisma";
import { CommuneContourSchema, CommuneGeometry, QrrQuerySchema } from "@/lib/qrr/schemas";
import { scoreQrr } from "@/lib/scoring/rules";
import { NextRequest, NextResponse } from "next/server";

async function fetchCommuneContour(citycode: string): Promise<CommuneGeometry> {
  const url = `https://geo.api.gouv.fr/communes/${encodeURIComponent(citycode)}?fields=contour&format=geojson&geometry=contour`;
  const res = await fetch(url);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`geo_api_failed_${res.status}`);
  const parsed = CommuneContourSchema.parse(await res.json());
  return parsed.geometry ?? null;
}

export async function GET(req: NextRequest) {
  const parsed = QrrQuerySchema.safeParse({
    citycode: req.nextUrl.searchParams.get("citycode") ?? "",
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_query" }, { status: 400 });
  }

  let geometry: CommuneGeometry;
  try {
    geometry = await fetchCommuneContour(parsed.data.citycode);
  } catch {
    return NextResponse.json({ error: "geo_api_error" }, { status: 502 });
  }
  if (!geometry) {
    return NextResponse.json({ count: 0, score: scoreQrr(0) });
  }

  try {
    const rows = await prisma.$queryRaw<{ count: number }[]>`
      SELECT COUNT(*)::int AS count
      FROM "Qrr"
      WHERE ST_Intersects(
        geometry,
        ST_SetSRID(ST_GeomFromGeoJSON(${JSON.stringify(geometry)}), 4326)
      )
    `;
    const count = rows[0]?.count ?? 0;
    return NextResponse.json({ count, score: scoreQrr(count) });
  } catch {
    return NextResponse.json({ error: "db_error" }, { status: 502 });
  }
}

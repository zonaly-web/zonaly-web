import {
  SsmsiApiResponse,
  SsmsiQuerySchema,
  SsmsiUpstreamResponseSchema,
} from "@/lib/ssmsi/schemas";
import { computeMetrics, pickLatestYear } from "@/lib/ssmsi/utils";
import { NextRequest, NextResponse } from "next/server";

const RESOURCE_ID = "604d71b8-337d-4869-9226-49e01bae87df";
const TABULAR_BASE = "https://tabular-api.data.gouv.fr/api/resources";
const PAGE_SIZE = 200;

export async function GET(req: NextRequest) {
  const parsed = SsmsiQuerySchema.safeParse({
    citycode: req.nextUrl.searchParams.get("citycode") ?? "",
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_query" }, { status: 400 });
  }

  const { citycode } = parsed.data;
  const url = `${TABULAR_BASE}/${RESOURCE_ID}/data/?CODGEO_2025__exact=${citycode}&page_size=${PAGE_SIZE}`;

  try {
    const res = await fetch(url, { next: { revalidate: 60 * 60 * 24 } });
    if (!res.ok) {
      return NextResponse.json({ error: "upstream_error" }, { status: 502 });
    }
    const json = await res.json();
    const upstream = SsmsiUpstreamResponseSchema.parse(json);

    const year = pickLatestYear(upstream.data);
    if (year == null) {
      const empty: SsmsiApiResponse = {
        year: 0,
        cambriolagesPer1000Logements: null,
        agressionsPer1000Habitants: null,
      };
      return NextResponse.json(empty);
    }

    const metrics = computeMetrics(upstream.data, year);
    const payload: SsmsiApiResponse = { year, ...metrics };
    return NextResponse.json(payload);
  } catch {
    return NextResponse.json({ error: "upstream_error" }, { status: 502 });
  }
}

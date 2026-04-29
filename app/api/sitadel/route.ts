import { NextRequest, NextResponse } from "next/server";
import { SitadelPermitsResponseSchema, SitadelQuerySchema } from "@/lib/sitadel/schemas";
import { aggregatePermits, armCitycodeToPostalCode, isoDateNMonthsAgo } from "@/lib/sitadel/utils";

const TABULAR_BASE = "https://tabular-api.data.gouv.fr/api/resources";
const HOUSING_RID = "65a9e264-7a20-46a9-9d98-66becb817bc3";
const WINDOW_MONTHS = 12;

export async function GET(req: NextRequest) {
  const parsed = SitadelQuerySchema.safeParse({
    citycode: req.nextUrl.searchParams.get("citycode") ?? "",
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_query" }, { status: 400 });
  }

  const { citycode } = parsed.data;
  const postalCode = armCitycodeToPostalCode(citycode);
  const isArm = postalCode !== null;
  const cutoff = isoDateNMonthsAgo(new Date(), WINDOW_MONTHS);

  const url = new URL(`${TABULAR_BASE}/${HOUSING_RID}/data/json/`);
  if (isArm) {
    url.searchParams.set("ADR_CODPOST_TER__exact", postalCode);
  } else {
    url.searchParams.set("COMM__exact", citycode);
  }
  url.searchParams.set("DATE_REELLE_AUTORISATION__greater", cutoff);

  try {
    const res = await fetch(url.toString(), {
      headers: {
        "User-Agent": "Zonaly/1.0 (+https://zonaly.fr)",
        Accept: "application/json",
      },
      next: { revalidate: 60 * 60 * 24 * 7 },
    });
    if (!res.ok) {
      return NextResponse.json({ error: "upstream_error" }, { status: 502 });
    }
    const json = await res.json();
    const rows = SitadelPermitsResponseSchema.parse(json);
    console.log("rows length:", rows.length);
    const agg = aggregatePermits(rows);

    return NextResponse.json({
      logementsAutorises: agg.logementsAutorises,
      permitsCount: agg.permitsCount,
      windowMonths: WINDOW_MONTHS,
      lastAuthorizationDate: agg.lastAuthorizationDate,
      granularity: isArm ? "arrondissement" : "commune",
    });
  } catch {
    return NextResponse.json({ error: "upstream_error" }, { status: 502 });
  }
}

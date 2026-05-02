import { AtmoQuerySchema, TabularResponseSchema, type TabularRow } from "@/lib/atmo/schemas";
import { toMasterCommune } from "@/lib/atmo/utils";
import { NextRequest, NextResponse } from "next/server";

const RESOURCE_ID = "d2b9e8e6-8b0b-4bb6-9851-b4fa2efc8201";
const TABULAR_BASE = "https://tabular-api.data.gouv.fr/api/resources";
const PAGE_SIZE = 1;

async function fetchLatestRow(citycode: string): Promise<TabularRow | null> {
  const url = `${TABULAR_BASE}/${RESOURCE_ID}/data/?code_zone__exact=${citycode}&date_ech__sort=desc&page_size=${PAGE_SIZE}`;
  const res = await fetch(url, { next: { revalidate: 60 * 60 * 6 } });
  if (!res.ok) throw new Error(`atmo_${res.status}`);
  const json = await res.json();
  const upstream = TabularResponseSchema.parse(json);
  return upstream.data[0] ?? null;
}

export async function GET(req: NextRequest) {
  const parsed = AtmoQuerySchema.safeParse({
    citycode: req.nextUrl.searchParams.get("citycode") ?? "",
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_query" }, { status: 400 });
  }

  const { citycode } = parsed.data;
  const master = toMasterCommune(citycode);

  try {
    let row = await fetchLatestRow(citycode);
    let fallbackUsed = false;
    if (!row && master !== citycode) {
      row = await fetchLatestRow(master);
      fallbackUsed = !!row;
    }

    return NextResponse.json({
      codeQual: row?.code_qual ?? null,
      libQual: row?.lib_qual ?? null,
      coulQual: row?.coul_qual ?? null,
      dateEch: row?.date_ech ?? null,
      fallbackUsed,
    });
  } catch {
    return NextResponse.json({ error: "upstream_error" }, { status: 502 });
  }
}

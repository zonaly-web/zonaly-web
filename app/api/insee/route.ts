import { citycodeToGeo, parseFilosofi, parseRpLogement } from "@/lib/insee/utils";
import { InseeCommuneQuerySchema, MelodiResponseSchema } from "@/lib/insee/schemas";
import { prisma } from "@/lib/prisma/prisma";
import { scorePartProprietaires, scoreRevenuMedian } from "@/lib/scoring/rules";
import { NextRequest, NextResponse } from "next/server";

const UPSTREAM = "https://api.insee.fr/melodi/data";

async function fetchMelodi(dataset: string, params: Record<string, string>) {
  const url = new URL(`${UPSTREAM}/${dataset}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set("maxResult", "500");

  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    next: { revalidate: 60 * 60 * 24 },
  });
  if (res.status === 404 || res.status === 400) return null;
  if (!res.ok) throw new Error(`melodi_${dataset}_${res.status}`);
  const json = await res.json();
  return MelodiResponseSchema.parse(json);
}

export async function GET(req: NextRequest) {
  const parsed = InseeCommuneQuerySchema.safeParse({
    citycode: req.nextUrl.searchParams.get("citycode") ?? "",
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_query" }, { status: 400 });
  }

  const geo = citycodeToGeo(parsed.data.citycode);

  try {
    const [filosofi, rp] = await Promise.all([
      fetchMelodi("DS_FILOSOFI_CC", {
        GEO: geo,
        FILOSOFI_MEASURE: "MED_SL",
      }),
      fetchMelodi("DS_RP_LOGEMENT_PRINC", {
        GEO: geo,
        RP_MEASURE: "DWELLINGS",
        OCS: "DW_MAIN",
        TIME_PERIOD: "2022",
      }),
    ]);

    const { revenuMedianEurYr, year: filosofiYear } = parseFilosofi(filosofi?.observations ?? null);
    const {
      partLocataires,
      partProprietaires,
      year: rpYear,
    } = parseRpLogement(rp?.observations ?? null);

    // Pour le scoring : lire CommuneMetric (revenuMedianEurUce, unité différente du EUR_YR live).
    const metric = await prisma.communeMetric.findUnique({
      where: { codeInsee: parsed.data.citycode },
      select: { revenuMedianEurUce: true, partProprietaires: true },
    });
    const [revenuMedianScore, partProprietairesScore] = await Promise.all([
      scoreRevenuMedian(metric?.revenuMedianEurUce ?? null),
      scorePartProprietaires(metric?.partProprietaires ?? partProprietaires),
    ]);

    return NextResponse.json({
      revenuMedianEurYr,
      partLocataires,
      partProprietaires,
      filosofiYear,
      rpYear,
      revenuMedianScore,
      partProprietairesScore,
    });
  } catch {
    return NextResponse.json({ error: "upstream_error" }, { status: 502 });
  }
}

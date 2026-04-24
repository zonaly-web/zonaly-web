import { NextRequest, NextResponse } from "next/server";
import {
  CeremaPrixQuerySchema,
  GeomutationPageSchema,
  type GeomutationProperties,
} from "@/lib/cerema/schemas";

const UPSTREAM = "https://apidf-preprod.cerema.fr/dvf_opendata/geomutations/";
const CODTYPBIEN = "121";
const PAGE_SIZE = 500;
const YEAR_PROBE_MAX = 5;

function buildUrl(citycode: string, year: number, page: number) {
  const url = new URL(UPSTREAM);
  url.searchParams.set("code_insee", citycode);
  url.searchParams.set("anneemut", String(year));
  url.searchParams.set("codtypbien", CODTYPBIEN);
  url.searchParams.set("page_size", String(PAGE_SIZE));
  url.searchParams.set("page", String(page));
  return url;
}

async function fetchPage(citycode: string, year: number, page: number) {
  const res = await fetch(buildUrl(citycode, year, page), {
    next: { revalidate: 60 * 60 * 24 },
  });
  if (!res.ok) throw new Error(`upstream_${res.status}`);
  const json = await res.json();
  return GeomutationPageSchema.parse(json);
}

async function fetchAllMutations(citycode: string, year: number) {
  const first = await fetchPage(citycode, year, 1);
  if (first.count === 0) return [];
  const totalPages = Math.ceil(first.count / PAGE_SIZE);
  if (totalPages === 1) return first.features;
  const rest = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, i) => fetchPage(citycode, year, i + 2)),
  );
  return [first, ...rest].flatMap((p) => p.features);
}

async function findLatestYear(citycode: string) {
  const currentYear = new Date().getFullYear();
  for (let y = currentYear; y >= currentYear - YEAR_PROBE_MAX; y--) {
    const probe = await fetchPage(citycode, y, 1);
    if (probe.count > 0) return y;
  }
  return null;
}

function medianPriceM2(props: GeomutationProperties[]): number | null {
  const prices = props
    .filter((p) => p.libnatmut.startsWith("Vente"))
    .filter((p) => p.sbati > 0 && p.valeurfonc > 0)
    .map((p) => p.valeurfonc / p.sbati)
    .sort((a, b) => a - b);
  const n = prices.length;
  if (n === 0) return null;
  const mid = Math.floor(n / 2);
  return n % 2 === 0 ? (prices[mid - 1] + prices[mid]) / 2 : prices[mid];
}

export async function GET(req: NextRequest) {
  const parsed = CeremaPrixQuerySchema.safeParse({
    citycode: req.nextUrl.searchParams.get("citycode") ?? "",
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_query" }, { status: 400 });
  }

  const citycode = parsed.data.citycode;

  try {
    const latestYear = await findLatestYear(citycode);
    if (latestYear == null) {
      return NextResponse.json({
        latestYear: 0,
        baseYear: 0,
        prixMedianM2: null,
        evolution5Y: null,
      });
    }
    const baseYear = latestYear - 5;

    const [latestFeatures, baseFeatures] = await Promise.all([
      fetchAllMutations(citycode, latestYear),
      fetchAllMutations(citycode, baseYear),
    ]);

    const prixMedianM2 = medianPriceM2(latestFeatures.map((f) => f.properties));
    const basePx = medianPriceM2(baseFeatures.map((f) => f.properties));

    const evolution5Y =
      basePx != null && prixMedianM2 != null && basePx !== 0
        ? (prixMedianM2 - basePx) / basePx
        : null;

    return NextResponse.json({
      latestYear,
      baseYear,
      prixMedianM2,
      evolution5Y,
    });
  } catch {
    return NextResponse.json({ error: "upstream_error" }, { status: 502 });
  }
}

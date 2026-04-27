import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  GeorisquesQuerySchema,
  RadonResponseSchema,
  RgaResponseSchema,
  SspResponseSchema,
} from "@/lib/georisques/schemas";
import { countSitesPollues, mapRadonClasse, mapRgaMax } from "@/lib/georisques/utils";

const BASE = "https://www.georisques.gouv.fr/api/v2";

async function fetchUpstream<S extends z.ZodType>(
  path: string,
  params: Record<string, string>,
  token: string,
  schema: S,
): Promise<z.infer<S>> {
  const url = new URL(`${BASE}${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    next: { revalidate: 60 * 60 * 24 * 7 },
  });
  if (!res.ok) throw new Error(`upstream_${path}_${res.status}`);
  const json = await res.json();
  return schema.parse(json);
}

export async function GET(req: NextRequest) {
  const parsed = GeorisquesQuerySchema.safeParse({
    codeInsee: req.nextUrl.searchParams.get("codeInsee") ?? "",
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_query" }, { status: 400 });
  }

  const token = process.env.GEORISQUES_API_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "missing_token" }, { status: 500 });
  }

  const { codeInsee } = parsed.data;

  try {
    const params = { codesInsee: codeInsee };
    const [radon, ssp, rga] = await Promise.all([
      fetchUpstream("/radon", params, token, RadonResponseSchema),
      fetchUpstream("/ssp", params, token, SspResponseSchema),
      fetchUpstream("/rga", params, token, RgaResponseSchema),
    ]);

    return NextResponse.json({
      sitesPolluesCount: countSitesPollues(ssp),
      radon: mapRadonClasse(radon.content[0]?.classePotentiel),
      argile: mapRgaMax(rga),
    });
  } catch {
    return NextResponse.json({ error: "upstream_error" }, { status: 502 });
  }
}

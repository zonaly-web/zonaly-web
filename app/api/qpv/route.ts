import { prisma } from "@/lib/prisma/prisma";
import { QpvQuerySchema } from "@/lib/qpv/schemas";
import { toMasterCommune } from "@/lib/atmo/utils";
import { scoreQpv } from "@/lib/scoring/rules";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const parsed = QpvQuerySchema.safeParse({
    citycode: req.nextUrl.searchParams.get("citycode") ?? "",
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_query" }, { status: 400 });
  }

  const citycode = toMasterCommune(parsed.data.citycode);

  try {
    const count = await prisma.qpv.count({
      where: {
        OR: [
          { insee_com: citycode },
          { insee_com: { startsWith: `${citycode}, ` } },
          { insee_com: { endsWith: `, ${citycode}` } },
          { insee_com: { contains: `, ${citycode}, ` } },
        ],
      },
    });
    return NextResponse.json({ count, score: scoreQpv(count) });
  } catch {
    return NextResponse.json({ error: "db_error" }, { status: 502 });
  }
}

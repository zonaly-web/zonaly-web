import { communeIdentity, type SourceModule } from "../context";
import type { Logger } from "@/lib/batch/logger";

const PLM_MOTHER_CODES = new Set(["75056", "69123", "13055"]);
const GEO_API_BASE = "https://geo.api.gouv.fr";
const REVERSE_GEO_CONCURRENCY = 5;

type Centroid = { id: number; insee_com?: string; lat: number; lon: number };

/**
 * Reverse-geocode a (lat, lon) point to an INSEE commune code. For PLM
 * (Paris/Lyon/Marseille), prefer the arrondissement municipal code (e.g.
 * `75119`) over the mother commune (`75056`).
 */
async function reverseGeocode(lat: number, lon: number): Promise<string | null> {
  const armUrl = `${GEO_API_BASE}/communes?lat=${lat}&lon=${lon}&type=arrondissement-municipal&fields=code`;
  const armRes = await fetch(armUrl);
  if (armRes.ok) {
    const arr = (await armRes.json()) as Array<{ code?: string }>;
    if (arr.length > 0 && arr[0].code) return arr[0].code;
  }
  const comUrl = `${GEO_API_BASE}/communes?lat=${lat}&lon=${lon}&fields=code`;
  const comRes = await fetch(comUrl);
  if (comRes.ok) {
    const arr = (await comRes.json()) as Array<{ code?: string }>;
    if (arr.length > 0 && arr[0].code) return arr[0].code;
  }
  return null;
}

async function reverseGeocodeMany<T extends { lat: number; lon: number }>(
  items: T[],
  log: Logger,
  label: string,
): Promise<Map<T, string | null>> {
  const result = new Map<T, string | null>();
  for (let i = 0; i < items.length; i += REVERSE_GEO_CONCURRENCY) {
    const batch = items.slice(i, i + REVERSE_GEO_CONCURRENCY);
    const codes = await Promise.all(batch.map((it) => reverseGeocode(it.lat, it.lon)));
    batch.forEach((it, idx) => result.set(it, codes[idx]));
    if ((i + batch.length) % 50 === 0 || i + batch.length === items.length) {
      log.info(`${label} reverse-geocoded`, { done: i + batch.length, total: items.length });
    }
  }
  return result;
}

export const qpvQrrCountSource: SourceModule = {
  name: "qpv_qrr_count",
  async run(ctx, log) {
    const today = new Date().toISOString().slice(0, 10);

    log.info("loading QPV centroids");
    const qpvRows = await ctx.prisma.$queryRaw<Centroid[]>`
      SELECT id, insee_com, ST_Y(ST_Centroid(geometry))::float AS lat, ST_X(ST_Centroid(geometry))::float AS lon
      FROM "Qpv"
    `;

    const qpvPlm: Centroid[] = [];
    const qpvCounts = new Map<string, number>();
    for (const q of qpvRows) {
      const codes = (q.insee_com ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      let resolved = false;
      const others: string[] = [];
      for (const code of codes) {
        if (PLM_MOTHER_CODES.has(code)) {
          if (!resolved) {
            qpvPlm.push(q);
            resolved = true;
          }
        } else {
          others.push(code);
        }
      }
      for (const c of others) qpvCounts.set(c, (qpvCounts.get(c) ?? 0) + 1);
    }
    log.count("rowsIn", qpvRows.length);
    log.info("QPV split", { total: qpvRows.length, plm: qpvPlm.length });

    if (qpvPlm.length > 0) {
      log.info("reverse-geocoding QPV PLM", { count: qpvPlm.length });
      const resolved = await reverseGeocodeMany(qpvPlm, log, "QPV");
      let unresolved = 0;
      for (const [, code] of resolved) {
        if (!code) {
          unresolved++;
          continue;
        }
        qpvCounts.set(code, (qpvCounts.get(code) ?? 0) + 1);
      }
      if (unresolved > 0) log.warn("QPV unresolved after geocoding", { count: unresolved });
    }

    log.info("loading QRR centroids");
    const qrrRows = await ctx.prisma.$queryRaw<Centroid[]>`
      SELECT id, ST_Y(ST_Centroid(geometry))::float AS lat, ST_X(ST_Centroid(geometry))::float AS lon
      FROM "Qrr"
    `;
    log.count("rowsIn", qrrRows.length);
    log.info("reverse-geocoding QRR", { count: qrrRows.length });

    const qrrCounts = new Map<string, number>();
    const qrrResolved = await reverseGeocodeMany(qrrRows, log, "QRR");
    let qrrUnresolved = 0;
    for (const [, code] of qrrResolved) {
      if (!code) {
        qrrUnresolved++;
        continue;
      }
      qrrCounts.set(code, (qrrCounts.get(code) ?? 0) + 1);
    }
    if (qrrUnresolved > 0) log.warn("QRR unresolved after geocoding", { count: qrrUnresolved });

    if (ctx.dryRun) {
      log.info("dry-run: skipping CommuneMetric updates", {
        qpv_communes: qpvCounts.size,
        qrr_communes: qrrCounts.size,
      });
      return;
    }

    log.info("resetting all rows to qpvCount=0/qrrCount=0");
    const reset = await ctx.prisma.communeMetric.updateMany({
      data: { qpvCount: 0, qrrCount: 0, qpvQrrAsOf: today },
    });
    log.info("reset done", { rows: reset.count });

    const allCodes = new Set<string>([...qpvCounts.keys(), ...qrrCounts.keys()]);
    log.info("upserting non-zero counts", { communes: allCodes.size });

    const updates = [...allCodes].map((codeInsee) => {
      const id = communeIdentity(codeInsee);
      const qpv = qpvCounts.get(codeInsee) ?? 0;
      const qrr = qrrCounts.get(codeInsee) ?? 0;
      return ctx.prisma.communeMetric.upsert({
        where: { codeInsee },
        create: {
          codeInsee,
          isArm: id.isArm,
          masterCodeInsee: id.masterCodeInsee,
          departement: id.departement,
          qpvCount: qpv,
          qrrCount: qrr,
          qpvQrrAsOf: today,
        },
        update: {
          qpvCount: qpv,
          qrrCount: qrr,
          qpvQrrAsOf: today,
        },
      });
    });

    let written = 0;
    for (let i = 0; i < updates.length; i += 200) {
      await ctx.prisma.$transaction(updates.slice(i, i + 200));
      written += Math.min(200, updates.length - i);
      log.count("rowsUpserted", Math.min(200, updates.length - i));
    }
    log.info("upsert done", { rows: written });
  },
};

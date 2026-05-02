import { downloadToCache, openCacheReadStream } from "@/lib/batch/download";
import { iterateCsvRows } from "@/lib/batch/csvStream";
import { upsertCommuneMetrics } from "@/lib/batch/writer";
import type { SitadelPermitRow } from "@/lib/sitadel/schemas";
import { aggregatePermits, isoDateNMonthsAgo, postalCodeToArmCitycode } from "@/lib/sitadel/utils";
import { communeIdentity, SourceModule } from "../context";

const URL = "https://www.data.gouv.fr/api/1/datasets/r/65a9e264-7a20-46a9-9d98-66becb817bc3";
const WINDOW_MONTHS = 12;
const PLM_MOTHER_CODES = new Set(["75056", "69123", "13055"]);

function parseInteger(raw: string | undefined): number | null {
  if (!raw) return null;
  const t = raw.trim();
  if (!t || t === "NA") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export const sitadelSource: SourceModule = {
  name: "sitadel",
  async run(ctx, log) {
    const path = await downloadToCache({
      url: URL,
      cacheDir: ctx.cacheDir,
      noCache: ctx.noCache,
      logger: log,
      filename: "sitadel.csv",
    });

    const cutoff = isoDateNMonthsAgo(new Date(), WINDOW_MONTHS);
    log.info("parsing started", { cutoff, window_months: WINDOW_MONTHS });

    const grouped = new Map<string, SitadelPermitRow[]>();
    for await (const row of iterateCsvRows(openCacheReadStream(path), { delimiter: ";" })) {
      log.count("rowsIn");
      const date = row.DATE_REELLE_AUTORISATION?.trim();
      if (!date || date < cutoff) continue;
      const comm = row.COMM?.trim();
      if (!comm) continue;

      let codeInsee: string | null = comm;
      if (PLM_MOTHER_CODES.has(comm)) {
        const postalCode = row.ADR_CODPOST_TER?.trim();
        codeInsee = postalCode ? postalCodeToArmCitycode(postalCode) : null;
        if (!codeInsee) continue;
      }

      log.count("rowsKept");
      const sitadelRow: SitadelPermitRow = {
        NUM_DAU: row.NUM_DAU?.trim() || null,
        DATE_REELLE_AUTORISATION: date,
        NB_LGT_TOT_CREES: parseInteger(row.NB_LGT_TOT_CREES),
        ETAT_DAU: parseInteger(row.ETAT_DAU),
      };
      let bucket = grouped.get(codeInsee);
      if (!bucket) {
        bucket = [];
        grouped.set(codeInsee, bucket);
      }
      bucket.push(sitadelRow);
    }

    log.info("aggregating", { communes: grouped.size });
    const today = new Date().toISOString().slice(0, 10);
    const updates: { codeInsee: string; data: Record<string, unknown> }[] = [];
    for (const [codeInsee, rows] of grouped.entries()) {
      const agg = aggregatePermits(rows);
      const id = communeIdentity(codeInsee);
      updates.push({
        codeInsee,
        data: {
          isArm: id.isArm,
          masterCodeInsee: id.masterCodeInsee,
          departement: id.departement,
          permitsLogementsAutorises12m: agg.logementsAutorises,
          permitsCount12m: agg.permitsCount,
          sitadelAsOf: today,
        },
      });
    }
    log.info("parsing done", { rows_kept: updates.length });
    await upsertCommuneMetrics(ctx.prisma, updates, log, { dryRun: ctx.dryRun });
  },
};

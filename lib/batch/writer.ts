import type { PrismaClient } from "@/lib/prisma/generated/client";
import type { Logger } from "./logger";

type CommuneMetricUpdate = {
  codeInsee: string;
  data: Record<string, unknown>;
};

const BATCH_SIZE = 200;

/**
 * Upsert a batch of partial CommuneMetric rows. Each row updates only its provided fields ;
 * unspecified fields are left untouched. Identity is `codeInsee`.
 *
 * For new rows, default required fields (`isArm`, `lastRefreshedAt`) come from
 * the schema defaults and the call's `data`.
 */
export async function upsertCommuneMetrics(
  prisma: PrismaClient,
  rows: CommuneMetricUpdate[],
  logger: Logger,
  options: { dryRun: boolean },
): Promise<number> {
  if (options.dryRun) {
    logger.info("upsert skipped (dry-run)", { rows: rows.length });
    return 0;
  }
  if (rows.length === 0) return 0;

  let written = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    await prisma.$transaction(
      batch.map((r) =>
        prisma.communeMetric.upsert({
          where: { codeInsee: r.codeInsee },
          create: { codeInsee: r.codeInsee, ...r.data },
          update: r.data,
        }),
      ),
    );
    written += batch.length;
    logger.count("rowsUpserted", batch.length);
  }
  logger.info("upsert done", { rows: written });
  return written;
}

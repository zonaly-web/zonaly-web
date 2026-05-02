import { readdirSync } from "node:fs";
import path from "node:path";
import * as shapefile from "shapefile";
import { downloadToCache } from "@/lib/batch/download";
import { extractZipToDir } from "@/lib/batch/zipExtract";
import type { SourceModule } from "../context";

const URL = "https://www.data.gouv.fr/api/1/datasets/r/e94de15e-7e5d-4683-8882-9ff3b3ac9295";
const BATCH_SIZE = 100;

type QrrProperties = {
  nom: string;
  dep: string;
  service: string;
  vague: number;
  code_qrr: string;
};

type QrrFeature = {
  properties: QrrProperties;
  geometry: { type: string; coordinates: unknown };
};

export const qrrSource: SourceModule = {
  name: "qrr",
  async run(ctx, log) {
    const zipPath = await downloadToCache({
      url: URL,
      cacheDir: ctx.cacheDir,
      noCache: ctx.noCache,
      logger: log,
      filename: "qrr.zip",
    });

    const extractDir = path.join(ctx.cacheDir, "qrr-extracted");
    log.info("extracting zip", { extractDir });
    await extractZipToDir(zipPath, extractDir, { force: ctx.noCache });

    const files = readdirSync(extractDir);
    const shp = files.find((f) => f.toLowerCase().endsWith(".shp"));
    if (!shp) throw new Error(`no .shp file found in extracted zip at ${extractDir}`);
    const shpPath = path.join(extractDir, shp);
    const dbfPath = shpPath.replace(/\.shp$/i, ".dbf");
    log.info("shp selected", { shp });

    const features: QrrFeature[] = [];
    const source = await shapefile.open(shpPath, dbfPath);
    let res = await source.read();
    while (!res.done) {
      features.push(res.value as unknown as QrrFeature);
      res = await source.read();
    }
    log.info("parsed features", { count: features.length });
    log.count("rowsIn", features.length);

    if (ctx.dryRun) {
      log.info("dry-run: skipping qrr insert");
      log.count("rowsKept", features.length);
      return;
    }

    log.info("truncating Qrr table");
    const before = await ctx.prisma.qrr.count();
    await ctx.prisma.qrr.deleteMany({});
    log.info("table cleared", { rows_deleted: before });

    log.info("inserting", { rows: features.length, batch_size: BATCH_SIZE });
    let inserted = 0;
    for (let i = 0; i < features.length; i += BATCH_SIZE) {
      const batch = features.slice(i, i + BATCH_SIZE);
      await ctx.prisma.$transaction(
        batch.map((f) => {
          const p = f.properties;
          const geom = JSON.stringify(f.geometry);
          return ctx.prisma.$executeRaw`
            INSERT INTO "Qrr" (nom, dep, service, vague, code_qrr, geometry)
            VALUES (
              ${p.nom},
              ${p.dep},
              ${p.service},
              ${p.vague},
              ${p.code_qrr},
              ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON(${geom}), 4326))
            )
          `;
        }),
      );
      inserted += batch.length;
      log.count("rowsKept", batch.length);
      log.count("rowsUpserted", batch.length);
    }
    log.info("insert done", { rows: inserted });
  },
};

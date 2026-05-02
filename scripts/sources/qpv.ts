import { readFileSync } from "node:fs";
import path from "node:path";
import { downloadToCache } from "@/lib/batch/download";
import { extractZipToDir } from "@/lib/batch/zipExtract";
import type { SourceModule } from "../context";

const URL = "https://www.data.gouv.fr/api/1/datasets/r/942d4ee8-8142-4556-8ea1-335537ce1119";
const TARGET_GEOJSON = "GEOJSON/QP2024_France_Hexagonale_Outre_Mer_WGS84.geojson";
const BATCH_SIZE = 200;

type QpvProperties = {
  fid: number;
  code_qp: string;
  lib_qp: string;
  insee_reg: string | null;
  lib_reg: string;
  insee_dep: string;
  lib_dep: string;
  insee_com: string;
  lib_com: string;
  siren_epci: string;
};

type QpvFeature = {
  type: "Feature";
  properties: QpvProperties;
  geometry: { type: string; coordinates: unknown };
};

export const qpvSource: SourceModule = {
  name: "qpv",
  async run(ctx, log) {
    const zipPath = await downloadToCache({
      url: URL,
      cacheDir: ctx.cacheDir,
      noCache: ctx.noCache,
      logger: log,
      filename: "qpv-2024.zip",
    });

    const extractDir = path.join(ctx.cacheDir, "qpv-extracted");
    log.info("extracting zip", { extractDir });
    await extractZipToDir(zipPath, extractDir, { force: ctx.noCache });

    const geojsonPath = path.join(extractDir, TARGET_GEOJSON);
    log.info("reading geojson", { file: geojsonPath });
    const fc = JSON.parse(readFileSync(geojsonPath, "utf8")) as {
      features: QpvFeature[];
    };
    log.info("parsed features", { count: fc.features.length });
    log.count("rowsIn", fc.features.length);

    if (ctx.dryRun) {
      log.info("dry-run: skipping qpv insert");
      log.count("rowsKept", fc.features.length);
      return;
    }

    log.info("truncating Qpv table");
    const before = await ctx.prisma.qpv.count();
    await ctx.prisma.qpv.deleteMany({});
    log.info("table cleared", { rows_deleted: before });

    log.info("inserting", { rows: fc.features.length, batch_size: BATCH_SIZE });
    let inserted = 0;
    for (let i = 0; i < fc.features.length; i += BATCH_SIZE) {
      const batch = fc.features.slice(i, i + BATCH_SIZE);
      await ctx.prisma.$transaction(
        batch.map((f) => {
          const p = f.properties;
          const geom = JSON.stringify(f.geometry);
          return ctx.prisma.$executeRaw`
            INSERT INTO "Qpv" (fid, code_qp, lib_qp, insee_reg, lib_reg, insee_dep, lib_dep, insee_com, lib_com, siren_epci, geometry)
            VALUES (
              ${p.fid},
              ${p.code_qp},
              ${p.lib_qp},
              ${p.insee_reg},
              ${p.lib_reg},
              ${p.insee_dep},
              ${p.lib_dep},
              ${p.insee_com},
              ${p.lib_com},
              ${p.siren_epci},
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

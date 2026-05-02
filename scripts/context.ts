import type { PrismaClient } from "@/lib/prisma/generated/client";
import type { Logger, RootLogger } from "@/lib/batch/logger";
import { isArmCitycode } from "@/lib/insee/utils";
import { toMasterCommune } from "@/lib/atmo/utils";

export type BatchContext = {
  prisma: PrismaClient;
  cacheDir: string;
  logsDir: string;
  noCache: boolean;
  dryRun: boolean;
  rootLogger: RootLogger;
};

export type SourceModule = {
  name: string;
  run: (ctx: BatchContext, log: Logger) => Promise<void>;
};

export type CommuneIdentity = {
  codeInsee: string;
  isArm: boolean;
  masterCodeInsee: string;
  departement: string;
};

export function communeIdentity(codeInsee: string): CommuneIdentity {
  const isArm = isArmCitycode(codeInsee);
  return {
    codeInsee,
    isArm,
    masterCodeInsee: isArm ? toMasterCommune(codeInsee) : codeInsee,
    departement: codeInsee.slice(0, 2),
  };
}

import { MelodiObservation } from "./schemas";

const GEO_VINTAGE = "2025";
const TSH_OWNER = "100";
const TSH_TENANT_UNFURNISHED = "211";
const TSH_TENANT_FURNISHED_SUBLET = "212_222";
const TSH_TENANT_HLM = "221";
const TSH_TOTAL = "_T";

export function parseFilosofi(obs: MelodiObservation[] | null): {
  revenuMedianEurYr: number | null;
  year: number | null;
} {
  if (!obs || obs.length === 0) return { revenuMedianEurYr: null, year: null };
  const match = obs.find(
    (o) => o.dimensions.FILOSOFI_MEASURE === "MED_SL" && o.dimensions.UNIT_MEASURE === "EUR_YR",
  );
  if (!match) return { revenuMedianEurYr: null, year: null };
  const year = Number(match.dimensions.TIME_PERIOD);
  return {
    revenuMedianEurYr: match.measures.OBS_VALUE_NIVEAU.value,
    year: Number.isFinite(year) ? year : null,
  };
}

export function parseRpLogement(obs: MelodiObservation[] | null): {
  partLocataires: number | null;
  partProprietaires: number | null;
  year: number | null;
} {
  const empty = { partLocataires: null, partProprietaires: null, year: null };
  if (!obs || obs.length === 0) return empty;

  const values = new Map<string, number>();
  let year: number | null = null;

  for (const o of obs) {
    const d = o.dimensions;
    if (
      d.RP_MEASURE !== "DWELLINGS" ||
      d.OCS !== "DW_MAIN" ||
      d.NRG_SRC !== "_T" ||
      d.CARS !== "_T" ||
      d.NOR !== "_T" ||
      d.BUILD_END !== "_T" ||
      d.TDW !== "_T" ||
      d.CARPARK !== "_T" ||
      d.L_STAY !== "_T"
    ) {
      continue;
    }
    values.set(d.TSH, o.measures.OBS_VALUE_NIVEAU.value);
    const y = Number(d.TIME_PERIOD);
    if (Number.isFinite(y)) year = y;
  }

  const owner = values.get(TSH_OWNER) ?? 0;
  const tenantUnfurnished = values.get(TSH_TENANT_UNFURNISHED) ?? 0;
  const tenantFurnished = values.get(TSH_TENANT_FURNISHED_SUBLET) ?? 0;
  const tenantHlm = values.get(TSH_TENANT_HLM) ?? 0;
  const total = values.get(TSH_TOTAL) ?? 0;

  if (total <= 0) return empty;

  return {
    partLocataires: ((tenantUnfurnished + tenantFurnished + tenantHlm) / total) * 100,
    partProprietaires: (owner / total) * 100,
    year,
  };
}

export function isArmCitycode(citycode: string): boolean {
  if (/^751\d{2}$/.test(citycode)) {
    const n = Number(citycode);
    return n >= 75101 && n <= 75120;
  }
  if (/^6938\d$/.test(citycode)) {
    const n = Number(citycode);
    return n >= 69381 && n <= 69389;
  }
  if (/^132\d{2}$/.test(citycode)) {
    const n = Number(citycode);
    return n >= 13201 && n <= 13216;
  }
  return false;
}

export function citycodeToGeo(citycode: string): string {
  const level = isArmCitycode(citycode) ? "ARM" : "COM";
  return `${GEO_VINTAGE}-${level}-${citycode}`;
}

const CITYCODE_REGEX = /^\d{5}[AB]?$/;

function parseEuroAmount(raw: string | undefined): number | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (trimmed.length === 0 || trimmed === "NA") return null;
  const n = Number(trimmed.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export type FilosofiCsvParsed = {
  codeInsee: string;
  libelle: string | null;
  revenuMedianEurUce: number | null;
};

export function parseFilosofiCsvRow(row: Record<string, string>): FilosofiCsvParsed | null {
  const codeInsee = row["Code géographique"]?.trim();
  if (!codeInsee || !CITYCODE_REGEX.test(codeInsee)) return null;
  return {
    codeInsee,
    libelle: row["Libellé géographique"]?.trim() || null,
    revenuMedianEurUce: parseEuroAmount(row["[DISP] Médiane (€)"]),
  };
}

const RP_TOTAL_KEYS = ["P21_RP", "P20_RP", "P19_RP"] as const;
const RP_LOC_KEYS = ["P21_RP_LOC", "P20_RP_LOC", "P19_RP_LOC"] as const;
const RP_PROP_KEYS = ["P21_RP_PROP", "P20_RP_PROP", "P19_RP_PROP"] as const;

function pickNumber(row: Record<string, string>, keys: readonly string[]): number | null {
  for (const k of keys) {
    const raw = row[k];
    if (raw == null) continue;
    const n = Number(String(raw).replace(",", "."));
    if (Number.isFinite(n)) return n;
  }
  return null;
}

export type RpLogementCsvParsed = {
  codeInsee: string;
  libelle: string | null;
  partLocataires: number | null;
  partProprietaires: number | null;
};

export function parseRpLogementCsvRow(row: Record<string, string>): RpLogementCsvParsed | null {
  const codeInsee = row.CODGEO?.trim() ?? row.codgeo?.trim();
  if (!codeInsee || !CITYCODE_REGEX.test(codeInsee)) return null;
  const total = pickNumber(row, RP_TOTAL_KEYS);
  const loc = pickNumber(row, RP_LOC_KEYS);
  const prop = pickNumber(row, RP_PROP_KEYS);
  const libelle = row.LIBGEO?.trim() ?? row.libgeo?.trim() ?? null;
  if (total == null || total <= 0) {
    return { codeInsee, libelle, partLocataires: null, partProprietaires: null };
  }
  return {
    codeInsee,
    libelle,
    partLocataires: loc == null ? null : (loc / total) * 100,
    partProprietaires: prop == null ? null : (prop / total) * 100,
  };
}

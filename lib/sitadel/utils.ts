import type { SitadelPermitRow } from "./schemas";

export function isoDateNMonthsAgo(now: Date, months: number): string {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  d.setUTCMonth(d.getUTCMonth() - months);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const ETAT_DAU_ANNULE = 4;

function isMoreRecent(a: SitadelPermitRow, b: SitadelPermitRow): boolean {
  return (a.DATE_REELLE_AUTORISATION ?? "") > (b.DATE_REELLE_AUTORISATION ?? "");
}

export function aggregatePermits(rows: SitadelPermitRow[]): {
  logementsAutorises: number;
  permitsCount: number;
  lastAuthorizationDate: string | null;
} {
  const byNumDau = new Map<string, SitadelPermitRow>();
  const orphans: SitadelPermitRow[] = [];

  for (const r of rows) {
    if (r.ETAT_DAU === ETAT_DAU_ANNULE) continue;
    if (!r.NUM_DAU) {
      orphans.push(r);
      continue;
    }
    const prev = byNumDau.get(r.NUM_DAU);
    if (!prev || isMoreRecent(r, prev)) byNumDau.set(r.NUM_DAU, r);
  }

  const kept = [...byNumDau.values(), ...orphans];

  let logements = 0;
  let lastDate: string | null = null;
  for (const r of kept) {
    logements += r.NB_LGT_TOT_CREES ?? 0;
    const d = r.DATE_REELLE_AUTORISATION;
    if (d && (!lastDate || d > lastDate)) lastDate = d;
  }
  return {
    logementsAutorises: logements,
    permitsCount: kept.length,
    lastAuthorizationDate: lastDate,
  };
}

export function armCitycodeToPostalCode(citycode: string): string | null {
  if (/^751\d{2}$/.test(citycode)) {
    const n = Number(citycode);
    if (n >= 75101 && n <= 75120) return String(n - 100).padStart(5, "0");
  }
  if (/^6938\d$/.test(citycode)) {
    const n = Number(citycode);
    if (n >= 69381 && n <= 69389) return String(n - 380).padStart(5, "0");
  }
  if (/^132\d{2}$/.test(citycode)) {
    const n = Number(citycode);
    if (n >= 13201 && n <= 13216) return String(n - 200).padStart(5, "0");
  }
  return null;
}

/**
 * Inverse de `armCitycodeToPostalCode` : à partir d'un code postal de
 * Paris/Lyon/Marseille (ex. `"75001"`), retourne le code INSEE de
 * l'arrondissement (ex. `"75101"`). Renvoie `null` si le code postal n'est
 * pas un arrondissement PLM connu.
 */
export function postalCodeToArmCitycode(postalCode: string): string | null {
  if (!/^\d{5}$/.test(postalCode)) return null;
  const n = Number(postalCode);
  if (n >= 75001 && n <= 75020) return String(n + 100);
  if (n >= 69001 && n <= 69009) return String(n + 380);
  if (n >= 13001 && n <= 13016) return String(n + 200);
  return null;
}

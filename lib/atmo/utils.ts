import { isArmCitycode } from "../insee/utils";

/**
 * Si le citycode correspond à un arrondissement de Paris/Lyon/Marseille,
 * retourne le code de la commune mère. Sinon, retourne le citycode inchangé.
 */
export function toMasterCommune(citycode: string): string {
  if (!isArmCitycode(citycode)) return citycode;
  if (/^751\d{2}$/.test(citycode)) return "75056"; // Paris
  if (/^6938\d$/.test(citycode)) return "69123"; // Lyon
  if (/^132\d{2}$/.test(citycode)) return "13055"; // Marseille
  return citycode;
}

const BAD_QUAL_THRESHOLD = 4;

export type AtmoDailyRow = {
  code_qual: number | null;
};

/**
 * Agrège un tableau de bulletins quotidiens ATMO pour une commune.
 * - `indiceMoyen` : moyenne arithmétique des `code_qual` (1..6) sur la fenêtre.
 * - `joursMauvais` : nombre de jours avec `code_qual >= 4` (mauvais ou pire).
 * Les lignes sans `code_qual` sont ignorées.
 */
export function aggregateAtmo(rows: AtmoDailyRow[]): {
  indiceMoyen: number | null;
  joursMauvais: number;
  joursTotal: number;
} {
  let sum = 0;
  let count = 0;
  let bad = 0;
  for (const r of rows) {
    if (r.code_qual == null) continue;
    sum += r.code_qual;
    count++;
    if (r.code_qual >= BAD_QUAL_THRESHOLD) bad++;
  }
  return {
    indiceMoyen: count === 0 ? null : sum / count,
    joursMauvais: bad,
    joursTotal: count,
  };
}

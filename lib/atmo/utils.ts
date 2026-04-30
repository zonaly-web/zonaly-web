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

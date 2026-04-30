import { isArmCitycode } from "@/lib/insee/utils";

export function getMasterCitycode(citycode: string): string {
  if (!isArmCitycode(citycode)) return citycode;
  if (/^751\d{2}$/.test(citycode)) return "75056";
  if (/^6938\d$/.test(citycode)) return "69123";
  if (/^132\d{2}$/.test(citycode)) return "13055";
  return citycode;
}

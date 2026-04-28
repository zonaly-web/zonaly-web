// Le fichier QPV de l'État stocke les arrondissements de Paris/Marseille/Lyon
// sous le code commune principale, alors que la géocodeuse renvoie le code arrondissement.
export function normalizeCitycode(code: string): string {
  if (/^751[0-2]\d$/.test(code)) return "75056"; // Paris 75101-75120
  if (/^132(0[1-9]|1[0-6])$/.test(code)) return "13055"; // Marseille 13201-13216
  if (/^6938[1-9]$/.test(code)) return "69123"; // Lyon 69381-69389
  return code;
}

import "dotenv/config";
import { config as loadEnvFile } from "dotenv";
loadEnvFile({ path: ".env.local", override: false });

import { prisma } from "@/lib/prisma/prisma";

const BASE = "http://localhost:3000";

const WITNESSES = [
  // Big non-PLM cities
  { code: "31555", category: "big", label: "Toulouse" },
  { code: "44109", category: "big", label: "Nantes" },
  { code: "67482", category: "big", label: "Strasbourg" },
  { code: "33063", category: "big", label: "Bordeaux" },
  { code: "59350", category: "big", label: "Lille" },
  { code: "35238", category: "big", label: "Rennes" },
  { code: "34172", category: "big", label: "Montpellier" },
  { code: "06088", category: "big", label: "Nice" },
  { code: "21231", category: "big", label: "Dijon" },
  { code: "37261", category: "big", label: "Tours" },
  // PLM commune-mères
  { code: "75056", category: "plm-mother", label: "Paris (mère)" },
  { code: "69123", category: "plm-mother", label: "Lyon (mère)" },
  { code: "13055", category: "plm-mother", label: "Marseille (mère)" },
  // ARM Paris
  { code: "75101", category: "arm-paris", label: "Paris 1er" },
  { code: "75108", category: "arm-paris", label: "Paris 8e" },
  { code: "75112", category: "arm-paris", label: "Paris 12e" },
  { code: "75116", category: "arm-paris", label: "Paris 16e" },
  { code: "75119", category: "arm-paris", label: "Paris 19e" },
  // ARM Marseille
  { code: "13201", category: "arm-marseille", label: "Marseille 1er" },
  { code: "13206", category: "arm-marseille", label: "Marseille 6e" },
  { code: "13215", category: "arm-marseille", label: "Marseille 15e" },
  // ARM Lyon
  { code: "69381", category: "arm-lyon", label: "Lyon 1er" },
  { code: "69384", category: "arm-lyon", label: "Lyon 4e" },
  { code: "69387", category: "arm-lyon", label: "Lyon 7e" },
  // Petites rurales
  { code: "01001", category: "rural", label: "L'Abergement-Clémenciat" },
  { code: "01002", category: "rural", label: "L'Abergement-de-Varey" },
  { code: "26008", category: "rural", label: "Ancône" },
  { code: "21377", category: "rural", label: "Marcellois" },
  { code: "25201", category: "rural", label: "Dommartin" },
  { code: "12001", category: "rural", label: "Agen-d'Aveyron" },
  { code: "23001", category: "rural", label: "Ahun" },
  { code: "32001", category: "rural", label: "Aignan" },
  { code: "49001", category: "rural", label: "Andigné" },
  { code: "50001", category: "rural", label: "Acqueville" },
  // Corse
  { code: "2A001", category: "corse", label: "Afa" },
  { code: "2A004", category: "corse", label: "Ajaccio" },
  { code: "2B033", category: "corse", label: "Bastia" },
  // DOM-TOM
  { code: "97411", category: "dom", label: "Saint-Denis (Réunion)" },
  { code: "97302", category: "dom", label: "Cayenne" },
  { code: "97209", category: "dom", label: "Fort-de-France" },
  { code: "97615", category: "dom", label: "Mamoudzou" },
  { code: "97120", category: "dom", label: "Saint-Claude (Guadeloupe)" },
  // Banlieue / périphérie
  { code: "92012", category: "banlieue", label: "Boulogne-Billancourt" },
  { code: "94028", category: "banlieue", label: "Créteil" },
];

type ApiInsee = {
  revenuMedianEurYr: number | null;
  partLocataires: number | null;
  partProprietaires: number | null;
  filosofiYear: number | null;
  rpYear: number | null;
};
type ApiGeorisques = {
  sitesPolluesCount: number;
  radon: string;
  argile: string;
};
type ApiSsmsi = {
  year: number;
  cambriolagesPer1000Logements: number | null;
  agressionsPer1000Habitants: number | null;
};
type ApiSitadel = {
  logementsAutorises: number;
  permitsCount: number;
  windowMonths: number;
  granularity: string;
};
type ApiAtmo = {
  codeQual: number | null;
  libQual: string | null;
  dateEch: string | null;
  fallbackUsed: boolean;
};

async function fetchJson<T>(url: string): Promise<T | { error: string }> {
  try {
    const res = await fetch(url);
    if (!res.ok) return { error: `${res.status}` };
    return (await res.json()) as T;
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

const TOL_PCT = 0.05; // 5% tolerance for numeric comparison
const TOL_ABS = 50; // absolute tolerance (for small values)

function diffNum(api: number | null | undefined, db: number | null | undefined): string {
  if (api == null && db == null) return "✓ both null";
  if (api == null && db != null) return `⚠ api=null db=${db}`;
  if (api != null && db == null) return `⚠ api=${db != null ? db : "?"} db=null  (api=${api})`;
  if (api == null || db == null) return "?";
  const diff = Math.abs(api - db);
  const pct = api === 0 ? 0 : diff / Math.abs(api);
  if (diff <= TOL_ABS || pct <= TOL_PCT) return `✓ api=${api} db=${db}`;
  return `❌ api=${api} db=${db} diff=${diff.toFixed(1)} (${(pct * 100).toFixed(1)}%)`;
}
function diffStr(api: string | null | undefined, db: string | null | undefined): string {
  if (api == null && db == null) return "✓ both null";
  if (api === db) return `✓ "${api}"`;
  return `❌ api="${api}" db="${db}"`;
}

type Row = {
  code: string;
  category: string;
  label: string;
  fields: Record<string, string>;
  notes: string[];
};

async function compareCommune(w: (typeof WITNESSES)[number]): Promise<Row> {
  const code = w.code;
  const dbRow = await prisma.communeMetric.findUnique({ where: { codeInsee: code } });
  const notes: string[] = [];

  const [insee, georisques, ssmsi, sitadel, atmo] = await Promise.all([
    fetchJson<ApiInsee>(`${BASE}/api/insee?citycode=${code}`),
    fetchJson<ApiGeorisques>(`${BASE}/api/georisques?codeInsee=${code}`),
    fetchJson<ApiSsmsi>(`${BASE}/api/ssmsi?citycode=${code}`),
    fetchJson<ApiSitadel>(`${BASE}/api/sitadel?citycode=${code}`),
    fetchJson<ApiAtmo>(`${BASE}/api/atmo?citycode=${code}`),
  ]);

  const fields: Record<string, string> = {};

  if (!dbRow) {
    notes.push("⚠ commune absente de CommuneMetric");
  }

  // Filosofi
  if ("error" in insee) {
    fields.revenu = `(api err: ${insee.error})`;
  } else {
    fields.revenu = diffNum(insee.revenuMedianEurYr, dbRow?.revenuMedianEurUce);
    fields.partLoc = diffNum(insee.partLocataires, dbRow?.partLocataires);
  }

  // Géorisques radon
  if ("error" in georisques) {
    fields.radon = `(api err: ${georisques.error})`;
  } else {
    const apiRadon = georisques.radon === "Aucun" ? null : georisques.radon;
    fields.radon = diffStr(apiRadon, dbRow?.radonClasse);
  }

  // SSMSI
  if ("error" in ssmsi) {
    fields.cambriolages = `(api err: ${ssmsi.error})`;
  } else {
    fields.cambriolages = diffNum(
      ssmsi.cambriolagesPer1000Logements,
      dbRow?.cambriolagesPer1000Logements,
    );
    fields.agressions = diffNum(
      ssmsi.agressionsPer1000Habitants,
      dbRow?.agressionsPer1000Habitants,
    );
  }

  // Sitadel
  if ("error" in sitadel) {
    fields.permits = `(api err: ${sitadel.error})`;
  } else {
    fields.permits = diffNum(sitadel.logementsAutorises, dbRow?.permitsLogementsAutorises12m);
  }

  // ATMO — note: runtime returns latest day, batch averages 3 days
  if ("error" in atmo) {
    fields.atmo = `(api err: ${atmo.error})`;
  } else {
    fields.atmo = diffNum(atmo.codeQual, dbRow?.atmoIndiceMoyen);
    if (atmo.fallbackUsed) notes.push("ATMO fallback to commune-mère");
  }

  return { code, category: w.category, label: w.label, fields, notes };
}

async function main() {
  console.log(`Comparing ${WITNESSES.length} witnesses...`);
  const results: Row[] = [];
  // 5 in parallel to not hammer dev server
  for (let i = 0; i < WITNESSES.length; i += 5) {
    const batch = WITNESSES.slice(i, i + 5);
    const r = await Promise.all(batch.map(compareCommune));
    results.push(...r);
    process.stdout.write(`. ${results.length}/${WITNESSES.length}\n`);
  }

  // Print categorized report
  console.log("\n=== RAPPORT ===\n");
  const categories = [...new Set(results.map((r) => r.category))];
  for (const cat of categories) {
    console.log(`\n--- ${cat.toUpperCase()} ---`);
    for (const r of results.filter((x) => x.category === cat)) {
      const issues = Object.entries(r.fields).filter(
        ([, v]) => v.startsWith("❌") || v.startsWith("⚠"),
      );
      const prefix = issues.length === 0 ? "✓" : "⚠";
      console.log(`${prefix} ${r.code} ${r.label}`);
      if (issues.length > 0 || r.notes.length > 0) {
        for (const [field, v] of Object.entries(r.fields))
          console.log(`    ${field.padEnd(12)} ${v}`);
        for (const n of r.notes) console.log(`    note: ${n}`);
      }
    }
  }

  // Summary
  console.log("\n=== SUMMARY ===");
  const fields = [
    "revenu",
    "partLoc",
    "radon",
    "cambriolages",
    "agressions",
    "permits",
    "atmo",
  ] as const;
  for (const f of fields) {
    const vals = results.map((r) => r.fields[f] ?? "");
    const ok = vals.filter((v) => v.startsWith("✓")).length;
    const warn = vals.filter((v) => v.startsWith("⚠")).length;
    const fail = vals.filter((v) => v.startsWith("❌")).length;
    const err = vals.filter((v) => v.startsWith("(api err")).length;
    console.log(`${f.padEnd(14)} ✓=${ok}  ⚠=${warn}  ❌=${fail}  err=${err}  /${results.length}`);
  }

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});

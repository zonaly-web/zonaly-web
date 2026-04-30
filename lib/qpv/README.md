# QPV (Quartiers Prioritaires de la Ville)

Notes internes — implémentation, jeu de données, pièges. Ne pas committer (gitignored).

## Source des données

- **Fichier** : `QP2024_France_Hexagonale_Outre_Mer_WGS84.geojson` (10,5 Mo, 1584 features)
- **Producteur** : État (cadre légal : décret 2014-1750)
- **Périmètre** : Hexagone + Outre-Mer
- **Mise à jour** : annuelle (refresh manuel, pas automatique)
- **Stocké dans** : `scripts/data/` (gitignored)

### Schéma `properties` du GeoJSON source

```
fid, code_qp, lib_qp, insee_reg, lib_reg, insee_dep, lib_dep, insee_com, lib_com, siren_epci
```

Pas de code arrondissement, pas d'IRIS, pas de population. Juste un polygone par QPV avec son code commune.

## Import en base

Le fichier est chargé tel quel dans la table `Qpv` via `ogr2ogr` (GDAL) :

```bash
./scripts/import-qpv.sh
```

→ Crée la table avec geometry MULTIPOLYGON en EPSG:4326, indexée GiST.
→ Indices supplémentaires Prisma sur `insee_com` et `insee_dep`.
→ Extension `postgis` activée via la migration `20260428162957_enable_postgis`.

## Architecture côté app

```
ResultCard (citycode geocoder)
   └─→ useQpv(citycode)          [lib/qpv/use-qpv.ts]
        └─→ GET /api/qpv?citycode=XXXXX     [app/api/qpv/route.ts]
             ├─→ normalizeCitycode()         [lib/qpv/utils.ts]
             └─→ prisma.qpv.count(...)       [lib/db/prisma.ts]
                  → { count: number }
```

Pattern calqué sur les autres intégrations externes (SSMSI, INSEE, Cerema, Géorisques) : route handler `route.ts` avec Zod safeParse → React Query hook avec `staleTime` 24h → composant.

---

## ⚠️ Pièges et limites — À RELIRE AVANT DE TOUCHER À CE CODE

### 1. Pas de code arrondissement dans la source

Les QPV sont définis au niveau **commune** par le décret. Pour Paris/Marseille/Lyon, **toutes** les QPV partagent le code commune principale :

| Ville     | `insee_com` dans la source | Codes arrondissement (géocodeuse) |
| --------- | -------------------------- | --------------------------------- |
| Paris     | `75056`                    | `75101`–`75120`                   |
| Marseille | `13055`                    | `13201`–`13216`                   |
| Lyon      | `69123`                    | `69381`–`69389`                   |

**Conséquence** : la géocodeuse `geoplateforme` retourne le code arrondissement, pas le code commune. Sans normalisation → 0 QPV pour Paris/Marseille/Lyon → ~5M d'habitants cassés silencieusement.

→ **Solution** : `normalizeCitycode()` dans `utils.ts` (regex sur les plages d'arrondissements).

→ **Si tu veux du compte fin par arrondissement** : ne suffit pas. Il faut intersecter le `geometry` du QPV avec le contour de l'arrondissement (autre dataset IGN ou IRIS). Nouveau ticket.

### 2. `insee_com` composite

Quelques rows ont un `insee_com` du genre `"13055, 13070"` — un QPV qui chevauche plusieurs communes. Le champ est donc une **chaîne libre**, pas un FK strict.

**Conséquence** : un simple `where: { insee_com: citycode }` rate ces QPV.

→ **Solution dans la route** : `OR` à 4 clauses pour gérer les 4 positions possibles dans la chaîne CSV :

```ts
OR: [
  { insee_com: citycode }, // seul
  { insee_com: { startsWith: `${citycode}, ` } }, // "X, ..."
  { insee_com: { endsWith: `, ${citycode}` } }, // "..., X"
  { insee_com: { contains: `, ${citycode}, ` } }, // "..., X, ..."
];
```

⚠️ **Ne pas remplacer par `contains: citycode` tout court** : faux positifs garantis (`13070` ⊂ `130700`, `213070`, etc.). Les bornes `, ` font office de séparateurs de mots.

Alternative plus propre si tu en as marre du verbiage : `$queryRaw` avec regex Postgres `WHERE insee_com ~ '(^|, )<code>($|,)'` ou `string_to_array(insee_com, ', ') @> ARRAY['<code>']`. Au prix de la perte du typing Prisma.

### 3. Prisma 7 nécessite un driver adapter explicite

Le client généré (`prisma-client` provider, output dans `lib/generated/prisma/`) ne peut **pas** être instancié avec `new PrismaClient()` tout court. Il faut :

```ts
import { PrismaPg } from "@prisma/adapter-pg";
new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
```

Sinon : `PrismaClientInitializationError: PrismaClient needs to be constructed with a non-empty, valid PrismaClientOptions`.

**Deps obligatoires** côté runtime (pas devDeps) : `@prisma/client`, `@prisma/adapter-pg`, `pg`. Le package `prisma` seul (CLI) ne suffit pas.

C'est déjà câblé dans `lib/db/prisma.ts` (singleton avec dev-mode global). Réutiliser, pas réinstancier.

### 4. Geometry pas exploitable depuis Prisma typé

Le champ `geometry` est `Unsupported("geometry(MULTIPOLYGON, 4326)")` dans `schema.prisma`. Donc :

- Pas dans le type généré → pas accessible depuis l'API typée.
- Toute requête PostGIS (`ST_Intersects`, `ST_Contains`, etc.) doit passer par `prisma.$queryRaw`.

L'index GiST est là, prêt à servir. Pas utilisé pour ce ticket (count par citycode suffit), mais clé pour les features géo futures.

### 5. La table mélange QP et "QPV en veille"

Le préfixe `code_qp` (ex `QN00101M`, `QN00101I`) encode des infos qu'on n'a pas exploitées. Si un jour besoin de filtrer par statut (actif vs veille, métropole vs DROM), il faudra décoder ou enrichir.

---

## Vérification rapide

```bash
# Comptage table
psql -h localhost -p 54322 -U postgres -d postgres -c 'SELECT COUNT(*) FROM "Qpv";'
# → 1584

# Quelques cas
curl 'http://localhost:3000/api/qpv?citycode=75119'  # Paris 19e → 21 (via normalisation → 75056)
curl 'http://localhost:3000/api/qpv?citycode=13201'  # Marseille 1er → 41 (via normalisation → 13055)
curl 'http://localhost:3000/api/qpv?citycode=01053'  # Bourg-en-Bresse → 2
curl 'http://localhost:3000/api/qpv?citycode=01001'  # commune sans QPV → 0
curl 'http://localhost:3000/api/qpv?citycode=invalid' # → 400 invalid_query
```

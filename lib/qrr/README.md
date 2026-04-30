# QRR — Quartiers de Reconquête Républicaine

Affiche le **nombre de QRR** présents sur la commune (ou l'arrondissement) analysée dans la dimension Sécurité de la `ResultCard`.

## Jeu de données

**Source** : `contours_QRR.shp` — shapefile officiel de l'État (dispositif police 2018, mis à jour par vagues).

**Champs** : `nom`, `dep` (code département), `service` (PP / RG / DD…), `vague` (1, 2, 3…), `code_qrr`, `geometry` (MultiPolygon en EPSG:4326).

**Important** : le dataset ne contient **PAS de `insee_com`**. Uniquement le code département. C'est la limitation centrale qui guide toute l'implémentation.

## Import

Le shapefile est importé **directement en PostgreSQL/PostGIS** via `ogr2ogr` (cf. [`scripts/import-qrr.sh`](../../scripts/import-qrr.sh)) :

```bash
ogr2ogr -f "PostgreSQL" \
  "PG:postgresql://postgres:postgres@localhost:54322/postgres" \
  "scripts/data/qrr/contours_QRR.shp" \
  -nln Qrr -append -nlt MULTIPOLYGON -t_srs EPSG:4326
```

La table `Qrr` est définie dans [`prisma/schema.prisma`](../../prisma/schema.prisma) avec un index GIST sur `geometry` et un index B-tree sur `dep`. La migration PostGIS est dans `prisma/migrations/20260428162957_enable_postgis`.

## Implémentation

Pattern habituel (route API + Zod + hook React Query) :

- [`schemas.ts`](./schemas.ts) — `QrrQuerySchema` (citycode), `QrrApiResponseSchema` (`{ count }`), `CommuneContourSchema` (parse de la réponse `geo.api.gouv.fr`).
- [`use-qrr.ts`](./use-qrr.ts) — hook React Query (24h staleTime), appelle `/api/qrr?citycode=...`.
- [`app/api/qrr/route.ts`](../../app/api/qrr/route.ts) — fetch contour commune → intersection spatiale.

### Flux côté serveur

1. Valider `citycode` (regex `^\d{5}[AB]?$`).
2. **Fetch contour commune** via `https://geo.api.gouv.fr/communes/{citycode}?fields=contour&format=geojson&geometry=contour`.
3. **Intersection PostGIS** :
   ```sql
   SELECT COUNT(*)::int AS count
   FROM "Qrr"
   WHERE ST_Intersects(
     geometry,
     ST_SetSRID(ST_GeomFromGeoJSON($1), 4326)
   )
   ```

## Limites & décisions importantes (NE PAS OUBLIER)

### 1. Pas de `insee_com` dans la table → requête spatiale obligatoire

Contrairement à `Qpv` (qui a `insee_com` et utilise un `count` Prisma classique), `Qrr` impose une intersection PostGIS. **C'est plus lent** (mais l'index GIST le rend acceptable) et **ça impose un `$queryRaw`** — Prisma ne sait pas exprimer `ST_Intersects` nativement.

Si on voulait éviter ça à l'avenir, il faudrait pré-enrichir la table à l'import (jointure spatiale avec ADMIN-EXPRESS pour ajouter `insee_com`). Pas fait pour l'instant.

### 2. L'API de géocodage IGN ne fournit PAS le contour communal

L'endpoint `https://data.geopf.fr/geocodage/search` retourne uniquement un point + `citycode`. Le paramètre `returntruegeometry=1` concerne parcelles/POI, **pas** les communes. Donc impossible de piggyback sur le call existant — il faut un appel séparé à `geo.api.gouv.fr`.

Conséquence : **un appel HTTP supplémentaire par requête QRR**. Le cache React Query (24h) limite l'impact côté client mais la première requête paie le coût.

### 3. Granularité = arrondissement (pas commune principale)

**Pas de `normalizeCitycode`** dans cette route, contrairement à QPV. Pourquoi :

- `geo.api.gouv.fr/communes/75112` accepte les codes d'arrondissement et renvoie le polygone du 12e arr. spécifiquement.
- Du coup `75112` → 0 QRR (le 12e n'en a pas), `75118` → 1 (Goutte d'Or), `75056` → 2 (Paris entier).
- Choix assumé : la zone de sécurité prioritaire est par nature locale, donc l'arrondissement est plus pertinent que la commune entière.

**Attention** : QPV dans la même carte UI affiche au niveau commune (Paris entier) parce que la table QPV ne stocke que `insee_com = "75056"`. Donc QPV et QRR n'ont **pas la même granularité** sur Paris/Marseille/Lyon — c'est volontaire mais à expliquer si on revoit l'UI.

### 4. Communes inconnues de `geo.api.gouv.fr` → `count: 0`

On renvoie `{ count: 0 }` en cas de 404 sur le contour. Cas marginal (communes très récentes ou fusions/scissions) mais à garder en tête : un 0 peut signifier "pas de QRR" OU "commune introuvable".

### 5. Coordonnées du polygone passées en paramètre `$queryRaw`

On passe `JSON.stringify(geometry)` à `prisma.$queryRaw` via template tag — l'échappement est géré par Prisma, **ne pas** revenir à une concaténation string.

## Vérification

```bash
curl 'http://localhost:3000/api/qrr?citycode=93001'  # Aubervilliers → 2
curl 'http://localhost:3000/api/qrr?citycode=75118'  # Paris 18e → 1
curl 'http://localhost:3000/api/qrr?citycode=75112'  # Paris 12e → 0
curl 'http://localhost:3000/api/qrr?citycode=06088'  # Nice → 1
curl 'http://localhost:3000/api/qrr?citycode=22059'  # Bretagne rurale → 0
curl 'http://localhost:3000/api/qrr?citycode=invalid' # → 400
```

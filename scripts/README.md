# Pipeline de métriques par commune — V1

Script local qui télécharge les sources publiques (CSV, ZIP, Shapefile) et alimente :

- la table `CommuneMetric` (1 ligne par code INSEE — commune ou arrondissement de Paris/Lyon/Marseille)
- les tables PostGIS `Qpv` et `Qrr` (contours géométriques)

Le **runtime continue d'appeler les APIs upstream** pour l'analyse à la volée d'une adresse. Ce batch n'est **pas** consommé en runtime — il sert à pré-calculer les distributions nationales pour le scoring.

---

## Lancer le script

```bash
# Toutes les sources
pnpm data:refresh

# Sélection
pnpm data:refresh --only=filosofi,radon

# Forcer le re-téléchargement (ignore le cache disque)
pnpm data:refresh --no-cache

# Parser et agréger sans toucher la DB
pnpm data:refresh --dry-run
```

**Prérequis** : `DATABASE_URL` (et idéalement `DIRECT_URL`) dans `.env.local`. Connexion réseau pour les téléchargements upstream.

---

## Architecture

```
scripts/
├── refresh.ts           # orchestrateur (--only, --no-cache, --dry-run)
├── context.ts           # BatchContext + communeIdentity() (isArm, masterCodeInsee, departement)
├── sources/             # un fichier par source (interface SourceModule { name, run(ctx, log) })
│   ├── filosofi.ts
│   ├── rpLogement.ts
│   ├── radon.ts
│   ├── ssmsi.ts
│   ├── atmo.ts
│   ├── sitadel.ts
│   ├── dvf.ts
│   ├── qpv.ts
│   ├── qrr.ts
│   └── qpvQrrCount.ts   # tourne après qpv et qrr, agrège les compteurs par commune
├── compare/             # outil de validation runtime ↔ batch (script ad-hoc)
├── cache/               # gitignored — CSV/ZIP téléchargés, réutilisés entre runs
└── logs/                # gitignored — un fichier de log par run
```

Les utilitaires partagés (download, csv-stream, zip-extract, prisma writer, logger, dbInsights) vivent dans `lib/batch/`. La logique de calcul des métriques (médiane DVF, agrégation SSMSI, parsing Filosofi, etc.) est dans `lib/<source>/utils.ts` et est partagée avec les routes API runtime quand c'est possible.

---

## Sources couvertes

| Source          | Tables alimentées                                                                                                              | Millésime                    | Volume                                   |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------ | ---------------------------- | ---------------------------------------- |
| `filosofi`      | `CommuneMetric.revenuMedianEurUce`, `filosofiAsOf`                                                                             | 2021                         | ~5 Mo                                    |
| `rp_logement`   | `CommuneMetric.partLocataires`, `partProprietaires`, `rpLogementAsOf`                                                          | 2021                         | ~99 Mo (zip)                             |
| `radon`         | `CommuneMetric.radonClasse`, `radonAsOf`                                                                                       | **2019** (limitation connue) | ~1 Mo                                    |
| `ssmsi`         | `CommuneMetric.cambriolagesPer1000Logements`, `agressionsPer1000Habitants`, `ssmsiAsOf`                                        | dernière année du fichier    | ~40 Mo (gz)                              |
| `atmo`          | `CommuneMetric.atmoIndiceMoyen`, `atmoJoursMauvais`, `atmoAsOf`                                                                | bulletin glissant 3 jours    | ~17 Mo                                   |
| `sitadel`       | `CommuneMetric.permitsLogementsAutorises12m`, `permitsCount12m`, `sitadelAsOf`                                                 | 12 derniers mois             | ~830 Mo                                  |
| `dvf`           | `CommuneMetric.prixMedianM2Eur`, `prixMedianM2EurNMinus5`, `prixMedianM2EvolutionPct`, `ventesCount`, `dvfAsOf`, `dvfBaseYear` | courant 2025 vs 2021 (4 ans) | 2× ~95 Mo (gz)                           |
| `qpv`           | `Qpv` (PostGIS, contours quartiers prioritaires)                                                                               | 2024                         | ~10 Mo (zip)                             |
| `qrr`           | `Qrr` (PostGIS, contours quartiers de reconquête républicaine)                                                                 | 2021                         | ~360 Ko (zip)                            |
| `qpv_qrr_count` | `CommuneMetric.qpvCount`, `qrrCount`, `qpvQrrAsOf`                                                                             | dérivé des tables Qpv/Qrr    | reverse-geo geo.api.gouv.fr (~150 calls) |

### Détails d'implémentation par source

- **`qpv` et `qrr`** : DL ZIP data.gouv → extraction → parsing pur Node (`shapefile` npm pour QRR, `JSON.parse` pour QPV) → `prisma.deleteMany` + INSERT via `prisma.$executeRaw` avec `ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON(...), 4326))` pour la colonne `geometry`. **Pas d'`ogr2ogr`** (les anciens `.sh` sont obsolètes).
- **`qpv_qrr_count`** : tourne **après** `qpv` et `qrr`. Lit les centroïdes via PostGIS `ST_Centroid`, splitte les `insee_com` multi-communes (ex. `"69123, 69259"`), résout les PLM (commune-mère 75056/69123/13055) vers leur ARM via reverse-geocoding (`geo.api.gouv.fr/communes?lat&lon&type=arrondissement-municipal`). Pour QRR (sans `insee_com` natif), reverse-géocode tous les 62 centroïdes. Ensuite `updateMany({ qpvCount: 0, qrrCount: 0 })` puis upsert des compteurs non-nuls — sémantique : `0 = mesuré, aucun QPV/QRR` vs `NULL = pas encore mesuré`.

---

## Sources NON couvertes

Restent calculées **uniquement** par les routes API runtime — la table aura `NULL` sur les colonnes correspondantes :

- **RGA** (retrait-gonflement argiles) — pas de bulk commune fiable. Voir limitation détaillée plus bas.
- **Sites pollués** (SIS / SUP / instructions ex-BASOL) — uniquement via API Géorisques `/ssp`. Voir limitation.
- **Inondation** — pas encore implémentée. Source GASPAR identifiée mais non ingérée.
- **Overpass** (transports / commerces / écoles à 500m / 2km) — hors scope batch (volume OSM trop gros).

Voir `prisma/schema.prisma` (`model CommuneMetric`) pour le shape complet.

---

## Stratégie ARM (Paris/Lyon/Marseille)

Chaque source indexe les arrondissements municipaux différemment. Récap :

| Source      | Présence des 45 ARM                                                   | Comportement                                                                                 |
| ----------- | --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Filosofi    | Native (75101–75120, 69381–69389, 13201–13216)                        | Lecture directe                                                                              |
| RP Logement | Native                                                                | Lecture directe                                                                              |
| Radon       | Native                                                                | Lecture directe                                                                              |
| SSMSI       | Native (`CODGEO_2025`)                                                | Lecture directe                                                                              |
| ATMO        | Native (`code_zone`)                                                  | Lecture directe                                                                              |
| DVF         | Native dans le bulk (`code_commune`=75101 etc.)                       | Lecture directe — **pas besoin** des fichiers per-arrondissement                             |
| Sitadel     | `COMM` = commune-mère (75056) pour PLM                                | Dérive l'ARM depuis `ADR_CODPOST_TER` via `postalCodeToArmCitycode()` (lib/sitadel/utils.ts) |
| QPV / QRR   | QPV : `insee_com` = commune-mère pour PLM ; QRR : pas de code commune | Reverse-geocoding du centroïde via `geo.api.gouv.fr` à l'agrégation (`qpv_qrr_count`)        |

`isArm`, `masterCodeInsee`, `departement` sont remplis automatiquement via `communeIdentity()` (voir `scripts/context.ts`).

---

## Limitations & pièges rencontrés (à se souvenir)

> **Section critique**. Ces points ont coûté du temps à identifier, autant les noter pour ne pas refaire les mêmes erreurs si on remet les mains dedans.

### Filosofi

- **Confidentialité INSEE** (~12.5% des communes ont `revenuMedianEurUce: NULL`) : INSEE n'a pas le droit de publier la médiane pour les communes < 50 ménages fiscaux (secret statistique). La ligne existe dans le CSV avec code et libellé, mais la colonne `[DISP] Médiane (€)` est vide. **Aucun fallback légal possible** — c'est définitif pour ces ~3500 micro-communes rurales.
- **Décalage millésime potentiel runtime ↔ batch** : INSEE Melodi (utilisé en runtime) peut publier un nouveau millésime avant que le CSV bulk soit régénéré. En pratique aujourd'hui les deux ont 2021. Si Melodi passe à 2022 demain, le batch sera 1 an en retard.

### RP Logement

- **Méthodologies divergentes runtime ↔ batch** : le runtime utilise les dimensions Melodi `TSH` (statut d'occupation détaillé : propriétaire, locataire HLM, etc.), le batch utilise les colonnes agrégées `P21_RP_LOC` / `P21_RP_PROP`. Les deux donnent des valeurs proches mais **pas identiques** (ex. Paris 1er : API 61.56 % vs batch 61.48 %). C'est de l'INSEE pur, deux indicateurs publiés en parallèle qui ne sont pas conçus pour matcher au % près.

### Radon

- **Millésime 2019** : le CSV data.gouv le plus récent date de 2019. La donnée scientifique sous-jacente (zonage IRSN) date elle de ~2014 et n'a pas été republiée. L'API Géorisques sert la **même base IRSN** mais avec une couverture géographique plus à jour (36 390 communes vs 36 093 dans le CSV de 2019).
- **Bug parsing codes 4 chiffres** ([scripts/sources/radon.ts](sources/radon.ts)) : le CSV a perdu le `0` de tête pour les départements 01–09 (ex. `9313` au lieu de `09313`). Mon regex `/^\d{5}[AB]?$/` rejette ces codes → **3 191 communes droppées silencieusement** au moment de l'ingestion. **Fix** : padder à 5 caractères avant le test regex. Vérifié dans la comparaison runtime ↔ batch (témoins 01001, 01002 : API "Faible", DB NULL).
- **L'API ne renvoie pas l'année** : l'endpoint `/radon` retourne juste `classePotentiel`, pas de champ millésime. `radonAsOf="2019"` est hardcodé d'après le filename CSV.

### SSMSI

- **70% NULL sur `cambriolagesPer1000Logements`** : c'est de la **confidentialité SSMSI**. Pour les petites communes (< ~5 cambriolages/an), `taux_pour_mille=NA` et `est_diffuse=ndiff`. Sur les 34 920 lignes commune × cambriolage 2025, seules 10 665 ont une valeur publiée nominale.
- **Solution non implémentée** : SSMSI fournit `complement_info_taux` qui est le taux moyen de la **strate d'appartenance** (groupe de communes de même taille). Officiellement conçu comme proxy pour les `ndiff`. À implémenter dans `lib/ssmsi/utils.ts:computeMetrics()` :
  ```
  if (taux_pour_mille != null) → utiliser taux_pour_mille  (nominal)
  else if (nombre === 0)        → 0                          (vrai zéro)
  else if (complement_info_taux) → utiliser le proxy strate   (imputation)
  else                          → null
  ```
  Avec un flag `cambriolagesIsImputed: boolean` pour traçabilité au scoring.
- **Agressions ne souffre pas du même problème** car c'est une **somme** de 4 indicateurs distincts. Si 3 sont NA mais 1 a une valeur, on retourne quand même un total. D'où 2.8% de NULL seulement vs 70% pour cambriolages.
- **Resource ID différent runtime ↔ batch** : runtime utilise la tabular-api (`604d71b8-...`), batch utilise le bulk gz (`44ef4323-...`). Mêmes données SSMSI derrière, juste deux modes d'accès au même dataset.

### ATMO

- **Fenêtre glissante 3 jours seulement** (J−1, J, J+1), **pas un historique 365j**. `atmoIndiceMoyen` est donc une moyenne sur 3 jours et `atmoJoursMauvais` un compteur sur 3 jours max. Atmo France ne publie pas d'archive bulk historique.
- **Upstream `data.atmo-france.org` instable** : boucle parfois en redirect 301 sur lui-même (intermittent). Si le download échoue avec "redirect count exceeded" :
  - Soit relancer plus tard (souvent ça repasse)
  - Soit copier manuellement un CSV récent dans `scripts/cache/atmo-bulletin.csv` puis relancer (le cache hit sautera le download)
- **URL canonique** : la resource data.gouv `r/d2b9e8e6-...` redirige vers le WFS Atmo France. URL directe à utiliser : `https://data.atmo-france.org/geoserver/ind/ows?service=WFS&request=GetFeature&TypeNames=ind_atmo_2021&outputformat=csv`.
- **Méthodologie ≠ runtime** : le runtime renvoie le `code_qual` du **jour le plus récent** pour la commune (snapshot). Le batch fait une moyenne sur 3 jours. Comparable mais pas identique numériquement.

### DVF

- **Évolution 4 ans, pas 5** : les archives data.gouv geo-dvf ne contiennent que les millésimes **2021–2025**. Donc `prixMedianM2EurNMinus5` est en fait N−4 (2021 vs 2025). Le nom de la colonne est conservé pour cohérence avec l'objectif initial. À mesure que de nouvelles années s'accumulent, mettre à jour les constantes `CURRENT_YEAR`/`BASE_YEAR` dans `scripts/sources/dvf.ts`.
- **Surprise PLM utile** : le bulk DVF utilise déjà les codes ARM (`code_commune=75101` etc.) pour Paris/Lyon/Marseille, **pas** la commune-mère. Donc pas besoin de DL les 45 fichiers per-arrondissement séparés. Cohérence ARM gratuite.
- **Filtres pendant le stream** : on garde uniquement `nature_mutation='Vente'`, `code_type_local ∈ {1, 2}` (Maison ou Appartement), `valeur_fonciere > 0`, `surface_reelle_bati > 0`. ~5M rows initiales → ~2.5M rows kept.
- **Mémoire** : on stocke un `Map<codeInsee, number[]>` par millésime (~36k clés × ~140 prix/commune × 8 octets ≈ 40 Mo/an, × 2 millésimes = 80 Mo). RAM bornée, pas besoin de t-digest.

### Sitadel

- **Volume sous-estimé en doc** : le fichier réel pèse **~830 Mo** (pas 870 Ko comme certains documents data.gouv le laissent croire). 1.9M rows depuis 2017.
- **PLM via inverse postal code → ARM** : `COMM=75056` pour Paris dans le CSV. Ajout de `postalCodeToArmCitycode()` dans `lib/sitadel/utils.ts` qui fait `75001 → 75101` (inverse de `armCitycodeToPostalCode` existante).
- **Bug Paris 75056 — rows orphelines perdues** : le batch dispatch sur les ARM via le code postal. Mais certaines rows Sitadel ont un `ADR_CODPOST_TER` invalide ou hors arrondissement → on les skip. **2 426 permis Paris ne sont pas comptés en batch** (vs API Sitadel qui les compte). À corriger : pour les rows orphelines de PLM, soit fallback sur la commune-mère, soit répartir uniformément.

### QPV / QRR

- **QPV `insee_com` = commune-mère pour PLM** : toutes les QPV de Paris ont `insee_com=75056`, pas l'ARM. Idem 13055 / 69123. → résolution via reverse-geocoding du centroïde dans `qpvQrrCount.ts`.
- **QPV multi-communes** : certaines QPV chevauchent plusieurs communes, `insee_com="69123, 69259"`. → split sur virgule, +1 sur chaque commune membre.
- **QRR n'a pas de `insee_com` du tout** dans le shapefile (juste `nom`, `dep`, `service`, `vague`, `code_qrr`, `geometry`). → reverse-geocoding obligatoire pour les 62 features.
- **Endpoint reverse-geo qui marche** : `geo.api.gouv.fr/communes?lat=X&lon=Y&type=arrondissement-municipal` retourne l'ARM si applicable. **Le path `/arrondissements-municipaux` n'existe pas (404)** — c'est mon premier essai qui a foiré. Fallback ensuite sur `/communes?lat&lon` standard pour les non-PLM.
- **Source canonique QPV** : ⚠️ il y a 2 datasets QPV sur data.gouv. Le plus visible (Région Île-de-France, 298 features) est **incomplet**. Le bon est l'ANCT (`942d4ee8-...`, ZIP avec 1 584 features dont DOM-TOM).
- **Sémantique 0 vs NULL** : `qpvQrrCount` fait `updateMany({ qpvCount: 0 })` sur toutes les rows avant d'écraser celles avec ≥1. Donc `0 = mesuré, aucun QPV` vs `NULL = mesure pas encore faite`.

### RGA (non couvert — compromis)

- **CSV data.gouv granulaire EPCI uniquement** : les 2 ressources `cc42cf59-...` (par date construction) et `da1780e9-...` (surfaces globales) groupent par `EPCI_CODE`, pas par commune.
- **Forme de la donnée différente** : le CSV publie des **compteurs** de maisons et surfaces exposées par classe RGA, alors que l'API Géorisques `/rga` retourne une **classe d'exposition** (Faible/Moyen/Fort). Même si on désagrégeait par commune, ce ne serait pas la même métrique.
- **Pas de SHP commune-level chez BRGM** : vérifié sur mapsref.brgm.fr (16 layers, aucune RGA), infoterre, files.georisques.fr.
- **Solutions possibles si nécessaire plus tard** :
  1. Boucler l'API Géorisques `/rga?codesInsee=X` pour les 36k communes (~30-60 min de run)
  2. Désagréger l'EPCI vers ses communes membres (plus rapide, moins fin)
- Pour l'instant le runtime continue à appeler `/rga` à la volée.

### Sites pollués (non couvert — compromis)

- **3 sous-catégories** : SIS (~7 000 sites), ex-BASOL/instructions (~6 000), SUP (~2 000–3 000). Total ~15 000.
- **Pas de bulk national CSV** :
  - SIS : SHP BRGM (`SSP_CLASSIF_SIS_GE`, octobre 2025) **sans** colonne `code_insee`
  - ex-BASOL : SHP polygones + points (juin 2024) **sans** colonne `code_insee`
  - SUP : seulement **fragmenté en 99 datasets départementaux** sur data.gouv (un par préfecture, type `PM1`)
- **Découverte tardive** : l'API Géorisques `/api/v2/ssp?codesInsee=X` retourne déjà tout (les 4 catégories incluant SUP, avec `codeInsee` par site). Donc **pas besoin de spatial-join** comme je l'avais initialement présumé. Solution simple = boucle 36k communes (~30-60 min).
- **Pourquoi skipper SUP biaiserait gravement** : SUP = pollution la plus grave (servitude juridique). Concentré sur anciennes zones industrielles. Les omettre **sous-estimerait massivement les communes les plus polluées** — exactement le mauvais signal. Donc soit on prend les 3 catégories (boucle API), soit aucune.

### Inondation (non couvert — bonne piste identifiée)

- **Source GASPAR** : `data.gouv.fr/datasets/base-nationale-de-gestion-assistee-...-gaspar/` (BRGM, mise à jour décembre 2025). Un ZIP unique de 6.6 Mo contenant 8 CSV nationaux.
- **Fichiers pertinents** :
  - `pprn_gaspar.csv` (15 Mo) : Plans de Prévention Risques Naturels par commune avec procédure, dates, codes risque (`11` = Inondation)
  - `azi_gaspar.csv` (3.7 Mo) : Atlas Zones Inondables par commune
  - `risq_gaspar.csv` : risques par commune (mais "Inondation" est listé sur quasi toutes les communes → trop bruité)
- **Mapping prévu** (cf. `lib/georisques/README.md` du projet) :
  ```
  PPRN approuvé hits inondation → risqueInondation = "Élevé"
  AZI seul hits                  → "Modéré"
  rien                           → "Aucun"
  ```
- **Aucun runtime à aligner** : la route `/api/v2/inondation` n'existe plus dans Géorisques v2. Le projet l'avait retirée car `/gaspar/risques` était trop bruité. Pas de problème de cohérence runtime ↔ batch puisqu'il n'y a rien en runtime.

### Comparaison runtime ↔ batch (validation V1)

Audit fait sur 44 témoins représentatifs (grandes villes + ARM + Corse + DOM-TOM + rurales). Voir `scripts/compare/runtime-vs-db.ts`.

**Alignement par dimension** :

| Champ              | Aligné (✓) | Divergence partielle (⚠)                                | Vraie divergence (❌)            |
| ------------------ | ---------- | ------------------------------------------------------- | -------------------------------- |
| revenu Filosofi    | 16         | 3                                                       | 0 (25 erreurs API 502 transient) |
| partLocataires RP  | 19         | 0                                                       | 0                                |
| radon              | 36         | 0                                                       | **5 (bug 4 chiffres) **          |
| cambriolages SSMSI | 41         | 0                                                       | 0                                |
| agressions SSMSI   | 41         | 0                                                       | 0                                |
| permits Sitadel    | 33         | **8 (Paris 75056 + petits ruraux où API=0 / DB=NULL) ** | 0                                |
| atmo               | 41         | 0                                                       | 0                                |

**Bugs identifiés à fixer** (encore non implémentés) :

1. **Radon** : padder les codes 4 chiffres avant le test regex (~3 200 communes manquantes).
2. **Sitadel** : récupérer les 2 426 permis Paris orphelins (rows avec `COMM=75056` et `ADR_CODPOST_TER` non mappable).

---

## Cache et logs

- `scripts/cache/` — fichiers téléchargés. Réutilisés tant que `--no-cache` n'est pas passé. Gitignored.
- `scripts/logs/refresh-<timestamp>.log` — un fichier par run, format texte, 1 événement par ligne. Gitignored.

À chaque fin de run :

- Bloc `===== NULL COUNTS (CommuneMetric) =====` : pour chaque champ, nombre et pourcentage de NULL. Suivi du nombre de lignes en `Qpv` et `Qrr`. Skippé en `--dry-run`.
- Bloc `===== SUMMARY =====` : statut par source (OK / FAILED), volumes (`rows_in`, `rows_kept`, `rows_upserted`), warnings, errors, durée.

Le script renvoie `exit(0)` si toutes les sources passent, `exit(1)` sinon (utile pour CI plus tard).

---

## Tester l'alignement runtime ↔ batch

```bash
# 1. Lancer le dev server
pnpm dev

# 2. Dans un autre terminal
pnpm tsx scripts/compare/runtime-vs-db.ts
```

Le script appelle les routes API runtime (`/api/insee`, `/api/georisques`, `/api/ssmsi`, `/api/sitadel`, `/api/atmo`) sur 44 communes témoins, lit la DB, et imprime un rapport de divergences avec un tableau de synthèse.

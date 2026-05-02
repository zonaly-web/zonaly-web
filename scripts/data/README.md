# Pipeline de métriques par commune

Ce dossier contient le script local qui télécharge les CSV publics des sources de données utilisées par Zonaly et alimente la table `CommuneMetric` (1 ligne par code INSEE — commune ou arrondissement de Paris/Lyon/Marseille).

Le runtime continue d'appeler les APIs upstream pour l'analyse à la volée d'une adresse. Ce batch n'est **pas** appelé en runtime ; il sert à pré-calculer des distributions nationales pour le scoring.

## Lancer le script

```bash
# Toutes les sources
pnpm data:refresh

# Une ou plusieurs sources seulement
pnpm data:refresh --only=filosofi
pnpm data:refresh --only=filosofi,radon

# Forcer le re-téléchargement (ignore le cache disque)
pnpm data:refresh --no-cache

# Parser et agréger sans toucher la DB
pnpm data:refresh --dry-run
```

Prérequis :

- `DATABASE_URL` (et idéalement `DIRECT_URL`) configurés dans `.env.local`. Le script charge `.env.local` automatiquement.
- Connexion réseau pour télécharger les CSV.

## Sources couvertes (Phase 1)

| Source        | Tables alimentées                                                                       | Millésime                                       | Volume        |
| ------------- | --------------------------------------------------------------------------------------- | ----------------------------------------------- | ------------- |
| `filosofi`    | `CommuneMetric.revenuMedianEurUce`, `filosofiAsOf`                                      | 2021                                            | ~5 Mo         |
| `rp_logement` | `CommuneMetric.partLocataires`, `partProprietaires`, `rpLogementAsOf`                   | 2021                                            | ~99 Mo (zip)  |
| `radon`       | `CommuneMetric.radonClasse`, `radonAsOf`                                                | **2019** (millésime ancien — limitation connue) | ~1 Mo         |
| `ssmsi`       | `CommuneMetric.cambriolagesPer1000Logements`, `agressionsPer1000Habitants`, `ssmsiAsOf` | dernière année du fichier                       | ~40 Mo (gz)   |
| `qpv`         | `Qpv` (PostGIS, contours quartiers prioritaires)                                        | 2024                                            | ~10 Mo (zip)  |
| `qrr`         | `Qrr` (PostGIS, contours quartiers de reconquête républicaine)                          | 2021                                            | ~360 Ko (zip) |

`qpv` et `qrr` téléchargent une archive ZIP depuis data.gouv (datasets ANCT et Ministère de l'intérieur), l'extraient dans le cache, parsent le GeoJSON / Shapefile en pur Node (`shapefile` npm), vident la table cible (`prisma.deleteMany`), puis insèrent ligne par ligne via `prisma.$executeRaw` avec `ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON(...), 4326))` pour la colonne `geometry`.

## Sources non couvertes en V1

Les dimensions suivantes restent calculées **uniquement** par les routes API runtime :

- DVF (`prixMedianM2Eur`, évolution)
- ATMO (qualité de l'air)
- RGA (retrait-gonflement argiles)
- Sites pollués (SIS / SUP / instructions ex-BASOL) — pas de CSV national propre
- Sitadel (permis de construire)
- Overpass — hors scope batch

Voir `prisma/schema.prisma` (`model CommuneMetric`) pour le shape complet ; les colonnes des dimensions non couvertes existeront simplement comme `NULL` jusqu'à ce qu'une session ultérieure les ajoute.

## Stratégie ARM (Paris/Lyon/Marseille)

| Source      | Présence des 45 ARM                            | Comportement    |
| ----------- | ---------------------------------------------- | --------------- |
| Filosofi    | Native (75101–75120, 69381–69389, 13201–13216) | Lecture directe |
| RP Logement | Native                                         | Lecture directe |
| Radon       | Native                                         | Lecture directe |
| SSMSI       | Native (`CODGEO_2025`)                         | Lecture directe |

`isArm`, `masterCodeInsee`, `departement` sont remplis automatiquement via `communeIdentity()` (voir `scripts/data/context.ts`).

## Cache et logs

- `scripts/data/cache/` — fichiers téléchargés, hash SHA256(URL) en suffixe ou nom logique. Gitignored.
- `scripts/data/logs/refresh-<timestamp>.log` — un fichier par run, format texte, 1 événement par ligne. Gitignored.

À chaque fin de run :

- Bloc `===== NULL COUNTS (CommuneMetric) =====` : pour chaque champ de la table, nombre et pourcentage de NULL. Suivi du nombre de lignes en `Qpv` et `Qrr`. Skippé en `--dry-run`.
- Bloc `===== SUMMARY =====` : statut par source (OK / FAILED), volumes (`rows_in`, `rows_kept`, `rows_upserted`), warnings, errors, durée.

Le script renvoie `exit(0)` si toutes les sources passent, `exit(1)` sinon (utile pour CI plus tard).

## Limitations connues

- **Radon** : le millésime data.gouv le plus récent est 2019. À surveiller si Géorisques republie un fichier plus frais.
- **Filosofi `parseRpLogement` runtime ↔ batch** : le runtime utilise les dimensions Melodi (TSH par type de statut d'occupation), le batch utilise les colonnes agrégées `P21_RP_LOC` / `P21_RP_PROP` du recensement. Les deux doivent donner des valeurs proches mais peuvent différer marginalement (méthodologies INSEE distinctes).
- **DOM-TOM** : couverture héritée des sources upstream. Aucune commune n'est forcée à apparaître ; la table grandit à mesure que les sources les mentionnent.

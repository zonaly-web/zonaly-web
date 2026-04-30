# Notes internes — Intégration INSEE Melodi

Mémo des choix, pièges et limitations rencontrés en implémentant cette intégration.
**Ne pas committer** (déjà gitignored).

## Ce qu'on récupère

- **Revenu médian** (niveau de vie) → dataset `DS_FILOSOFI_CC`, mesure `MED_SL`
- **Part propriétaires / locataires** → dataset `DS_RP_LOGEMENT_PRINC`, mesure `DWELLINGS`

Endpoint : `https://api.insee.fr/melodi/data/{dataset}` — pas d'auth requise.

## Format GEO (le piège du début)

Melodi n'accepte pas un citycode brut. Il faut construire un identifiant `MILLESIME-NIVEAU-CODE` :

- `2025-COM-31555` pour Toulouse (commune normale)
- `2025-ARM-75118` pour Paris 18e (arrondissement municipal)
- ARM aussi pour Lyon (69381-69389) et Marseille (13201-13216)

Logique dans `geo.ts`. Le millésime `2025` est hardcodé — à vérifier chaque année.

## Le pattern SDMX (cube multi-dimensionnel)

Melodi suit SDMX : chaque observation = un point dans un hypercube. Pour le RP_LOGEMENT_PRINC, on a ~10 dimensions (TSH, NRG_SRC, BUILD_END, CARS, NOR, TDW, CARPARK, L_STAY, OCS, RP_MEASURE).

**Il n'y a pas de flag "ligne totale"**. Pour récupérer un total, il faut filtrer la valeur magique `"_T"` sur **toutes** les dimensions sauf celle qu'on veut ventiler.

Exemple : pour avoir le nombre total de propriétaires (toutes époques, tous chauffages confondus), on cherche la ligne où :
```
TSH = "100"            (statut spécifique)
NRG_SRC = "_T"         (toutes énergies)
BUILD_END = "_T"       (toutes époques)
CARS = "_T"            (toutes voitures)
... (toutes les autres à _T)
```

Si on omet UN filtre `_T`, on récupère plusieurs lignes ventilées et on double-compte.

## Les codes TSH (gros piège — j'ai perdu 2h dessus)

**Mon mapping initial était faux**. Voici la vérité après cross-check avec ADIL Paris :

| Code | Signification |
|------|---------------|
| `100` | Propriétaires (tous types confondus) |
| `211` | Locataires d'un logement vide non-HLM |
| `212_222` | Locataires meublé + sous-locataires |
| `221` | Locataires HLM |
| `300` | Logés gratuitement |
| `_T` | Total tous statuts |

**Validation contre Paris (75056)** : 33,4% propriétaires, 18% HLM — colle aux stats ADIL.

⚠️ Si on additionne `100 + 211 + 212_222 + 221 + 300`, on obtient bien `_T`. C'est la preuve que ce sont des frères, pas des parents/enfants.

## Le piège des codelists

L'API codelist d'INSEE (`/melodi/codelist/CL_TSH`) renvoie 404 sur tous les paths testés. **Pas de moyen public** de récupérer la signification des codes — il faut les déduire en cross-checkant avec une source officielle (ADIL, INSEE.fr, recensement papier).

**Si nouveau code rencontré** : vérifier sur Paris (75056) en premier, où les stats officielles sont publiques et précises.

## Pourcentages : toujours calculés, jamais bruts

Le dataset `DS_RP_LOGEMENT_PRINC` n'expose **que des comptages absolus** (`DWELLINGS`, `DWELLINGS_ROOMS`, `DWELLINGS_POPSIZE`, `DWELLING_L_STAY`). Aucune variante "_PCT" ou "_SHARE".

→ On calcule nous-même `(loc) / total × 100`. Cohérent avec la stratégie : récupérer la ligne `TSH=_T` comme dénominateur garantit que les pourcentages somment à 100%.

À l'inverse, FILOSOFI expose directement des indicateurs calculés (`MED_SL` = niveau de vie médian en €/an). On lit la valeur brute sans calcul.

## Année des données (limites de fraîcheur)

| Dataset | Année max disponible (avril 2026) | Délai typique |
|---------|-----------------------------------|----------------|
| `DS_FILOSOFI_CC` | **2021** | N-3 voire N-4 |
| `DS_RP_LOGEMENT_PRINC` | **2022** | N-3 (recensement glissant 5 ans) |

⚠️ `TIME_PERIOD=2022` est **hardcodé** dans `route.ts`. À bumper manuellement quand INSEE publiera RP 2023 (probablement mi-2026). Pour FILOSOFI on ne filtre pas — on prend ce qui vient.

## Bruit statistique (secret statistique)

Les valeurs renvoyées sont **décimales** même pour des comptages de logements (`194546.232`). C'est volontaire : INSEE ajoute du bruit pour préserver l'anonymat dans les petites zones. Ne pas s'en émouvoir, les ratios finaux restent précis (bruit centré).

## Communes sans données

Certaines petites communes ne sont pas dans FILOSOFI (seuil de secret statistique). L'API renvoie alors un payload vide ou un 404. On gère :
- `fetchMelodi()` retourne `null` sur 404/400
- Les parsers retournent `null` sur dataset vide
- L'UI affiche "N/A" via `MetricValue`

Ne **pas** faire échouer toute la page si une métrique manque — on peut avoir FILOSOFI sans RP ou inversement.

## Architecture du fetch

`Promise.all` en parallèle pour les 2 datasets — ils sont indépendants. Cache ISR Next.js 24h (`next: { revalidate: 60*60*24 }`) + cache React Query 1h côté client.

`maxResult=500` est suffisant pour une commune — au-delà il faudrait paginer (jamais rencontré le cas).

## Validation des données — toujours cross-checker

Méthode qui m'a sauvé :
1. Tester sur Paris global (75056) où les stats sont largement publiées
2. Comparer à ADIL Paris ou INSEE.fr
3. Si écart > 2 points, le mapping de codes est probablement faux

Ne pas se fier à la mémoire pour les "stats officielles" — fact-checker contre source primaire avant d'affirmer qu'un chiffre est juste.

## Idées si besoin d'évoluer

- **Granularité IRIS** : Melodi supporte aussi `2025-IRIS-XXXXXXXXX`. Demanderait un reverse-geocoding lat/lon → IRIS (pas dans la Geoplateforme actuelle).
- **Probe du dernier millésime RP** : remplacer le hardcode 2022 par une logique "essaie 2024, sinon 2023, sinon 2022" comme `findLatestYear` côté Cerema.
- **Plus d'indicateurs FILOSOFI** : taux de pauvreté (`PR_MD60`), part des retraites (`S_RET_PEN_DI`), déciles (`D1_SL`, `D9_SL`) — tous dispo sur la même requête, on filtre par `FILOSOFI_MEASURE`.

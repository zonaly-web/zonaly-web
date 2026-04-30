# Notes internes — Intégration Sit@del2 (permis de construire)

Mémo des choix, pièges et limitations rencontrés en implémentant cette intégration.
**Ne pas committer** (déjà gitignored).

## Ce qu'on récupère

- **Logements créés** sur les 12 derniers mois, avec : `permitsCount` (nombre de permis distincts) + `logementsAutorises` (somme des `NB_LGT_TOT_CREES`)
- Granularité : commune (INSEE) ou arrondissement (Paris/Lyon/Marseille)

Resource data.gouv.fr : `65a9e264-7a20-46a9-9d98-66becb817bc3` ("Liste des autorisations d'urbanisme créant des logements")

Endpoint : `https://tabular-api.data.gouv.fr/api/resources/{rid}/data/json/` — pas d'auth requise.

## Choix de la source — DiDo abandonnée pour data.gouv.fr

L'origine SDES expose le même Sit@del2 sur **deux APIs** :

1. **DiDo** (`data.statistiques.developpement-durable.gouv.fr/dido/api/v1`)
2. **Tabular-API** sur data.gouv.fr (`tabular-api.data.gouv.fr/api/resources`)

J'ai **commencé par DiDo** (datasets agrégés mensuels par commune). Migré vers tabular-api. Les raisons :

- DiDo expose un agrégat `LOG_AUT` mensuel par commune mais **pas de granularité arrondissement** — `COMM=75056` pour tous les permis parisiens, indistinctement.
- Tabular-API expose les **permis individuels** avec `ADR_CODPOST_TER` (code postal du terrain) → permet de filtrer le 18e (`75018`), le 1er (`75001`), etc.

## Le piège des arrondissements (ARM)

Le champ `COMM` ne contient **PAS** les codes INSEE arrondissement (75101..75120, 69381..69389, 13201..13216). Pour Paris, tous les permis ont `COMM=75056`. Idem Lyon (`69123`) et Marseille (`13055`).

Pour distinguer un arrondissement, il faut filtrer sur `ADR_CODPOST_TER` (code postal du terrain) :

| INSEE arrondissement     | Code postal  | Filtre                         |
| ------------------------ | ------------ | ------------------------------ |
| 75101..75120 (Paris)     | 75001..75020 | `ADR_CODPOST_TER__exact=75001` |
| 69381..69389 (Lyon)      | 69001..69009 | idem                           |
| 13201..13216 (Marseille) | 13001..13016 | idem                           |

Mapping codé dans `armCitycodeToPostalCode()` : `INSEE - 100` (Paris), `-380` (Lyon), `-200` (Marseille).

⚠️ **Code postal ≠ INSEE arrondissement conceptuellement** — l'un vient de La Poste, l'autre de l'INSEE. En pratique pour P/L/M ils coïncident parfaitement, mais c'est un proxy. Hors P/L/M, les codes postaux ne sont pas fiables (1 commune peut avoir N codes postaux ; ex: Toulouse a 31000, 31100, 31200…).

→ La logique route :

- ARM détecté → filtre `ADR_CODPOST_TER`
- Sinon → filtre `COMM`

## Le piège du dataset non-résidentiel (timeout DiDo)

Le datafile DiDo non-résidentiel (`595d7249-...`, 62M lignes) **timeoute systématiquement (504) en 50s** même avec `CODE_INSEE+ANNEE` filtrés. Idem en single-year. L'index n'a pas le même comportement que le datafile logements (28M lignes).

→ Décision : **on n'intègre pas le non-résidentiel pour l'instant**. Cf. `~/.claude/projects/-Users-enzo-zonaly-app/memory/project_permis_recents_scope.md` — si on l'ajoute plus tard, **métrique séparée** (m² ≠ logements, ne pas combiner).

À retenter via tabular-api (resource `8f23d65f-7142-4ac5-94c1-077b028255bf`) — en théorie indexée correctement par data.gouv.fr.

## NUM_DAU pas strictement unique

D'après le dictionnaire (XLS `b7ebaa95-...`), `NUM_DAU` est un identifiant 13 chars unique. **En pratique ~1% de doublons** observés sur Paris all-time (33 sur 3525).

Inspection : les doublons partagent `NUM_DAU` mais ont des `DATE_REELLE_AUTORISATION` différentes (parfois 1-17 mois d'écart). Hypothèse la plus probable : **modificatifs / transferts** d'un même dossier. Le SDES expose le `NUM_DAU` racine sans suffixe `M01`/`M02`/`T01`, donc on perd la distinction d'événement administratif.

→ Dédup côté client dans `aggregatePermits` : on garde la ligne avec **DATE_REELLE_AUTORISATION la plus récente** par NUM_DAU. Sur les fenêtres 12 mois testées (Paris, Lyon, Toulouse, Kremlin-Bicêtre, Saint-Denis), **0 doublon dans la fenêtre** — les modificatifs arrivent généralement >12 mois après l'initial. Filet de sécurité plutôt que correction d'effet observé.

⚠️ **Coût caché** : si un modificatif change `NB_LGT_TOT_CREES` (ex: passe de 10 à 25), on prend la valeur du modificatif. C'est probablement le bon choix mais à vérifier sur un cas réel si on en croise un.

## Mapping ETAT_DAU (extrait du dictionnaire SDES)

| Code | Signification           |
| ---- | ----------------------- |
| 2    | Autorisé                |
| 4    | **Annulé**              |
| 5    | Commencé (DOC déposée)  |
| 6    | Terminé (DAACT déposée) |

Notes du dictionnaire : _"Toutes les DAU du fichier ont été autorisées"_ — les permis refusés/en instruction n'apparaissent **pas** dans le dataset. On voit uniquement les permis qui ont reçu le feu vert administratif.

→ Filtre `ETAT_DAU !== 4` dans `aggregatePermits` pour exclure les annulés. Effet observé : Paris −1 logt/permis sur 12 mois, Toulouse −47 logts / −3 permis. Marginal mais propre.

## Pagination silencieusement ignorée

L'API tabular accepte les params `page` et `page_size` **mais ne les respecte pas**. `page_size=2` renvoie tout le dataset filtré (~106 lignes pour Paris commune sur 12 mois, ~220 KB). `pageSize` (camelCase) renvoie 400.

→ Pas de pagination implémentée côté client. Acceptable car le payload reste petit après filtrage temporel. Si un jour on veut une fenêtre plus longue, prévoir le découpage par année.

## Date de filtrage : DATE_REELLE_AUTORISATION

Trois dates sont disponibles par permis :

- `DATE_REELLE_AUTORISATION` — date de la décision (= "permis autorisé")
- `DATE_REELLE_DOC` — date d'ouverture de chantier
- `DATE_REELLE_DAACT` — date d'achèvement et conformité

On filtre sur `DATE_REELLE_AUTORISATION__greater={cutoff}` car c'est la date qui matérialise l'événement "permis récent". Les permis autorisés mais sans chantier démarré font partie de notre périmètre (signal d'arrivée future).

⚠️ Si un jour on veut "permis ACTIFS uniquement" (entre DOC et DAACT), il faut combiner `DATE_REELLE_DOC__isnotnull` + `DATE_REELLE_DAACT__isnull`. On perdrait alors les permis tout juste autorisés — donc moins pertinent comme métrique "récent".

## Couverture territoriale

Métropole + Corse + DOM "classiques" (Guadeloupe 971, Martinique 972, Guyane 973, Réunion 974, Mayotte 976).

**Non couverts** (régime juridique d'urbanisme distinct) :

- Saint-Pierre-et-Miquelon (975)
- Saint-Martin / Saint-Barthélemy (977/978)
- Polynésie, Nouvelle-Calédonie, Wallis-et-Futuna, TAAF

## Périmètre de la métrique exposée — décisions produit

- **Source** : logements seuls (resource 65a9e264). Pas de non-résidentiel ni de PA/PD.
- **Fenêtre** : 12 mois glissants (`DATE_REELLE_AUTORISATION` >= today-12mo)
- **Format affiché** : `{permitsCount} permis · {logementsAutorises} logements`
- **Pas de scoring A-E** — affichage du chiffre brut. La promesse "Vie de quartier" se contente de l'absolu.

Comparaison Paris vs Kremlin-Bicêtre qui surprend (cf. session précédente) :

|                 | Permis | Logts | Logts/1000 hab |
| --------------- | -----: | ----: | -------------: |
| Paris commune   |    105 |  1267 |            0.6 |
| Kremlin-Bicêtre |      8 |   718 |           27.6 |

Une petite commune en mutation urbaine peut afficher plus de logements en absolu qu'un arrondissement parisien — c'est cohérent (foncier saturé Paris vs ZAC francilienne en cours), pas un bug.

## Validation des chiffres — méthode

Quand un chiffre semble louche :

1. **Curl direct upstream** sans notre route, vérifier la liste des permis individuels avec `DENOM_DEM`/`ADR_LIBVOIE_TER`. Souvent le chiffre est porté par 2-3 grosses opérations identifiables (Altarea, Pierre Promotion, Paris Habitat-OPH…).
2. **Somme par code postal** sur Paris : la somme des 20 arrondissements doit égaler le total `COMM=75056`. Si écart → fuite via `ADR_CODPOST_TER` null/erroné.
3. **Ratio logts/habitants** : Paris ~0.5-1 logt/1000 hab. Couronne en mutation 10-30 logt/1000 hab. Au-delà = anomalie probable.

## Pièges à se rappeler

- ❌ `pageSize` (camelCase) → 400. ✅ `page_size` (mais ignoré de toute façon)
- ❌ Filtrer sur `COMM=75101` → 0 résultats (les ARM ne sont pas dans COMM)
- ❌ `DATE_REELLE_AUTORISATION__strictly_greater` exclut le jour pile : préférer `__greater` (>=) pour fenêtres glissantes
- ❌ Le format ISO `YYYY-MM-DD` permet la comparaison string `>` correcte. Tout autre format casserait `isMoreRecent`.
- ❌ `NB_LGT_TOT_CREES` peut être `null` sur des transformations très marginales (très rare). On gère via `?? 0`.
- ❌ `ADR_CODPOST_TER` peut être `null` théoriquement. Pas observé sur Paris en 12 mois, mais à surveiller.

## Idées si besoin d'évoluer

- **Ajouter le non-résidentiel** via tabular-api (resource `8f23d65f-...`) — métrique séparée en m². L'API DiDo timeoutait, à reverifier sur tabular.
- **Utiliser DPC_AUT** (date prise en compte mensuelle, format `YYYY-MM`) plutôt que `DATE_REELLE_AUTORISATION` (jour exact) — plus stable d'un mois sur l'autre, mais plus grossier.
- **Détailler par typologie** : `TYPE_DAU` (PC vs DP) pour distinguer les vrais permis de construire des déclarations préalables.
- **Permis individuels en UI** : on a `DENOM_DEM`, `ADR_NUM_TER`, `ADR_LIBVOIE_TER` → potentiel pour afficher une liste des 3 plus gros projets récents par commune. Surface produit intéressante.
- **Score A-E** : possible via ratio `logementsAutorises / population` (pop via INSEE). Quintiles à calculer sur un échantillon national. Pas prioritaire.
- **Fenêtre glissante configurable** : la constante `WINDOW_MONTHS=12` est dans `route.ts`. Si on veut faire des graphiques d'évolution, la rendre paramètre URL.

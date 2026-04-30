# Cerema DV3F — notes d'implémentation

Notes internes (non commit). Ce qu'on a appris en intégrant l'API Cerema, et surtout les pièges où on est tombés.

## Endpoint utilisé

**Raw** : `https://apidf-preprod.cerema.fr/dvf_opendata/geomutations/`

Format : GeoJSON `FeatureCollection` paginée (clé `count`, `next`, `features`).

### Pourquoi pas l'aggrégé `/indicateurs/dv3f/prix/annuel/` ?

On a commencé avec celui-là (médianes pré-calculées, 1 requête, pas de pagination).
Avantages : trivial à consommer, données dispo depuis **2010**.
Limites qui nous ont fait basculer :

- **Données moins fraîches** : s'arrête à **2024**. Le raw va jusqu'à **2025** (et au-delà au fil du temps).
- Pas de granularité plus fine que la commune.

Trade-off retenu : on perd la profondeur historique (raw commence en **2014**, voir plus bas) pour gagner la fraîcheur.

## Paramètres clés

| Param        | Valeur                 | Note                                        |
| ------------ | ---------------------- | ------------------------------------------- |
| `code_insee` | citycode INSEE 5 chars | **Pas le code postal !** Cf. piège plus bas |
| `anneemut`   | année (int)            | Une seule année par requête                 |
| `codtypbien` | `121`                  | Voir piège ci-dessous                       |
| `page_size`  | `500`                  | Max testé qui passe ; défaut = 100          |
| `page`       | int ≥ 1                | Pagination 1-based                          |

## ⚠️ Piège #1 : `codtypbien` n'a PAS la même sémantique sur le raw que sur l'aggrégé

Sur l'**aggrégé** `cod121` (champ `pxm2_median_cod121`) = mutations d'un seul logement **avec dépendance** (segment de marché DV3F, hiérarchie `segmarche`).

Sur le **raw** `codtypbien=121` = **UN APPARTEMENT** uniquement (typologie de mutation, pas un segment de marché).

Mapping observé sur le raw (Bordeaux 2024) :

| `codtypbien` | `libtypbien`                        |
| ------------ | ----------------------------------- |
| 111          | UNE MAISON                          |
| **121**      | **UN APPARTEMENT** ← ce qu'on prend |
| 122          | DEUX APPARTEMENTS                   |
| 120          | APPARTEMENT INDETERMINE             |
| 131          | UNE DEPENDANCE                      |
| 132          | DES DEPENDANCES                     |
| 101          | VEFA sans descriptif                |
| 152          | BATI MIXTE (logement + activité)    |
| 14           | ACTIVITE                            |
| 21           | TERRAIN                             |

→ **Conséquence : aujourd'hui on n'indexe que les appartements, pas les maisons.** Pour avoir un "prix médian d'un logement", il faut filtrer `codtypbien ∈ {111, 121}` (deux requêtes upstream ou filtre côté code).

## ⚠️ Piège #2 : citycode ≠ zipcode

L'autocomplete Geopf (`/geocodage/completion`) ne renvoie **que `zipcode`** (code postal), pas le citycode INSEE. Seul `/geocodage/search` renvoie `properties.citycode`. Pas de table de correspondance triviale :

- Bordeaux : zipcode `33000`, INSEE `33063`
- Paris : un zipcode par arrondissement (75001…75020), INSEE décalé (75101…75120)

→ **Toujours appeler `/geocodage/search` avant Cerema** pour récupérer le citycode.

## ⚠️ Piège #3 : la regex citycode loupe la Corse

La regex `^\d{5}[AB]?$` (utilisée dans `CeremaPrixQuerySchema` et la garde sur `/analyse`) **ne matche pas la Corse**. INSEE corses = `2A004`, `2B033` (lettre en position 2, pas à la fin).

Correction si on veut couvrir la Corse : `^(?:\d{5}|2[AB]\d{3})$`.

## ⚠️ Piège #4 : `valeurfonc` et `sbati` sont des strings

L'API renvoie `"401700.00"` et `"83.00"` (chaînes), pas des nombres. D'où le `z.coerce.number()` dans `GeomutationPropertiesSchema`.

## Filtres médiane (`utils.ts`)

```ts
.filter((p) => p.libnatmut.startsWith("Vente"))   // exclut Echange, Expropriation, Adjudication
.filter((p) => p.sbati > 0 && p.valeurfonc > 0)   // évite division par 0 et ventes à 0 €
.map((p) => p.valeurfonc / p.sbati)
```

`startsWith("Vente")` garde **`"Vente"`** + **`"Vente en l'état futur d'achèvement"`** (VEFA), exclut le reste. Le filtre `codtypbien=121` upstream protège déjà contre les "Vente de terrain à bâtir" qui passeraient le `startsWith`. **Si on change un jour le `codtypbien`, ce filtre ne tient plus** — préférer un `Set` explicite des `libnatmut` autorisés.

## Profondeur historique

| Endpoint                | Première année dispo | Dernière |
| ----------------------- | -------------------- | -------- |
| Aggrégé `/prix/annuel/` | **2010**             | 2024     |
| Raw `/geomutations/`    | **2014**             | 2025+    |

Évolution **5 ans** : OK avec le raw (latest=2025 → base=2020).
Évolution **10 ans** : OK avec le raw aujourd'hui (2025 → 2015), **mais ça casse en janvier 2027** quand la base devient 2016 et qu'on essaiera de remonter à 2014, qui marchera, puis 2028 où il faudrait 2013 = vide.

## Volume / perf

- Bordeaux 2024 sans filtre : **5 412 mutations**, avec `codtypbien=121` : **2 863**.
- Avec `page_size=500` → 6 pages pour Bordeaux/an → 12 pages pour 2 années → **12 requêtes upstream par analyse cold**.
- Stratégie actuelle : `findLatestYear` séquentiel (1-N requêtes), puis `Promise.all` sur les pages des 2 années en parallèle.
- Cache Next : `revalidate: 60 * 60 * 24` (24 h) sur chaque page upstream → second hit ≈ instantané.

## Détection année courante (`findLatestYear`)

On part de l'année courante et on descend tant que `count === 0`, max `YEAR_PROBE_MAX = 5`. Pourquoi : en janvier l'année courante peut être vide ; on accepte de payer 1-2 requêtes en plus pour être robuste. Cache 24 h donc le coût n'est pas rejoué.

## Fiabilité upstream

Le **preprod Cerema est instable** :

- 502 / 503 fréquents (vu plusieurs fois pendant le dev).
- Timeouts > 30 s sans réponse, parfois 60 s.
- Pas de retry intégré côté backend ; si une page échoue, toute la requête plante (`Promise.all`).

Idées de robustification non implémentées :

- `retry` côté React Query (utilise les défauts du provider, à vérifier).
- Retry interne par page (3 essais espacés) avant de jeter.
- Fallback sur l'aggrégé si le raw timeout.

Pas de domaine prod connu (`apidf.cerema.fr` ne résout pas DNS) — on est coincés sur le preprod.

## Fields ignorés mais potentiellement utiles plus tard

- `geometry.coordinates` : position de la mutation. Permettrait un filtre par bbox/rayon autour de l'adresse (au lieu de toute la commune).
- `vefa: bool` : flag explicite à la place du `startsWith("Vente")`.
- `sterr` : surface terrain. Pertinent pour le m² maison.
- `nbpar`, `nblocmut`, `l_idpar` : multi-parcelles, multi-locaux — utile pour distinguer les vraies ventes individuelles.
- `valeurfonc` brute : stats au-delà de la médiane (Q1/Q3, écart-type, etc.).

## Référence DV3F

- Doc officielle : https://doc-datafoncier.cerema.fr/
- Guide DV3F volume et prix : https://doc-datafoncier.cerema.fr/doc/guide/dv3f/volume-et-prix
- Swagger preprod (souvent en panne) : https://apidf-preprod.cerema.fr/swagger/

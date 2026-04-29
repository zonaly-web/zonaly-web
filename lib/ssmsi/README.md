# SSMSI Délinquance — notes d'implémentation

Notes internes (non commit). Ce qu'on a appris en intégrant les bases statistiques de la délinquance SSMSI, et les pièges où on est tombés.

## Endpoint utilisé

**Tabular API** : `https://tabular-api.data.gouv.fr/api/resources/<RESOURCE_ID>/data/`

- `RESOURCE_ID = 604d71b8-337d-4869-9226-49e01bae87df` (base communale, format Parquet)
- Filtre principal : `CODGEO_2025__exact=<citycode>`
- Réponse JSON : `{ data: [...], meta, links }`

### Pourquoi pas le CSV.gz ou le Parquet directs ?

On a évalué les 3 ressources publiées :

| Format  | Resource ID  | Taille  | Avantage              | Inconvénient                                 |
| ------- | ------------ | ------- | --------------------- | -------------------------------------------- |
| XLSX    | `a2af06fc-…` | 3.6 Mo  | —                     | Pas exploitable côté serveur sans lib lourde |
| Parquet | `604d71b8-…` | 15.3 Mo | Structuré, requêtable | Lib parquet côté Node = pénible              |
| CSV.gz  | `44ef4323-…` | 38.1 Mo | Universel             | Faut tout DL + parser à chaque cold start    |

→ La **tabular-api** est la solution propre : 1 requête HTTP filtrée sur le citycode, ~10-150 lignes retournées (selon la commune), pas de gestion de fichier local. Cache Next 24 h derrière.

## Schéma des colonnes (toutes celles utiles)

| Colonne             | Type             | Description                                                      |
| ------------------- | ---------------- | ---------------------------------------------------------------- |
| `CODGEO_2025`       | string           | Code INSEE commune (note : "2025" dans le nom = millésime géo)   |
| `annee`             | int              | Année des faits (2016 → millésime le plus récent)                |
| `indicateur`        | string           | Catégorie de crime/délit (10 dispo en communal)                  |
| `unite_de_compte`   | string           | "Victime" / "Infraction" / "Véhicule" / etc.                     |
| `nombre`            | int              | Nombre de faits                                                  |
| `taux_pour_mille`   | float            | **/1000 hab pour la plupart, /1000 logements pour cambriolages** |
| `insee_pop`         | int              | Population municipale (millésime variable)                       |
| `insee_log`         | int              | Nombre de logements (millésime variable)                         |
| `est_diffuse`       | "diff" / "ndiff" | Secret statistique — voir piège #3                               |
| `complement_info_*` | float            | Moyennes départementales pour communes "ndiff"                   |

## ⚠️ Piège #1 : pas d'indicateur "Agressions" pré-calculé

Le SSMSI publie **18 indicateurs atomiques** (10 dispo en communal). Aucun n'est l'agrégat « agressions » qu'on veut afficher dans la card. On le **construit nous-mêmes** par somme de 4 indicateurs :

```ts
const AGRESSION_INDICATEURS = new Set([
  "Violences physiques hors cadre familial",
  "Violences sexuelles",
  "Vols violents sans arme",
  "Vols avec armes",
]);
```

### Pourquoi ces 4 et pas d'autres ?

Choix produit (cf. AskUserQuestion) : périmètre « agression de rue / espace public ».

**Volontairement exclu : `Violences physiques intrafamiliales`** — c'est techniquement une agression et le SSMSI les agrège avec hors-cadre-familial dans sa publication officielle (« Le total des violences physiques correspond à la somme des deux »). Mais pour un score de quartier, le risque pour un nouvel arrivant ne dépend pas du quartier mais du foyer. Inclure ces chiffres ferait apparaître certains quartiers comme dangereux à tort.

→ Si un jour on veut le périmètre SSMSI complet, ajouter `"Violences physiques intrafamiliales"` au Set, c'est tout.

**Indispo en communal mais pertinents au sens strict** :

- `Homicides`, `Tentatives d'homicide` — agression ultime mais volume trop faible (seuil de diffusion ≥ 5 faits / 3 ans).

**Non agressions, exclus à raison** :

- Cambriolages (atteinte aux biens, déjà exposé séparément)
- Vols sans violence, vols véhicules, dégradations (atteintes aux biens)
- Stupéfiants (pas de victime directe)
- Escroqueries (délit financier, et de toute façon attribué au lieu de résidence de la victime — non pertinent géographiquement)

## ⚠️ Piège #2 : `taux_pour_mille` n'a PAS la même unité partout

**Les cambriolages ont une unité de compte « Infraction » et leur `taux_pour_mille` est par 1 000 LOGEMENTS, pas habitants.** Doc méthodologique p.6 : « Le nombre de faits pour mille habitants (ou logements dans le cas des cambriolages) ».

→ Conséquence : le label de la card a été corrigé en `Cambriolages / 1 000 log.` (au lieu de `/ 1 000 hab.`).

Pour les 4 indicateurs d'agression, vérification empirique : `taux_pour_mille` est bien /1000 hab même quand `unite_de_compte = "Victime"` ou `"Infraction"`. Sanity check :

```
Σ nombre / insee_pop × 1000  ===  Σ taux_pour_mille
```

(testé sur Paris 2025, écart < 1e-6). On peut donc **sommer directement les `taux_pour_mille`** sans recalculer, ce qui simplifie `computeMetrics`.

## ⚠️ Piège #3 : chevauchements potentiels entre indicateurs ?

La doc PDF n'affirme pas explicitement que les 4 indicateurs choisis sont disjoints. Confiance ~95% basée sur la combinaison :

1. **NATINF disjoints** : violences physiques relèvent de la NFI section 02.A « Atteintes volontaires à l'intégrité de la personne » (codes CBV). Vols violents = NATINF spécifiques (7164, 7872B, 28153, 7861-7863). Pas de recouvrement.
2. **Qualification principale** : un fait = une seule NATINF principale (ex. un vol violent → NATINF 7861, PAS aussi en CBV).
3. **Le SSMSI publie l'agrégat « Violences physiques ou sexuelles » comme SOMME** des physiques + sexuelles → preuve qu'ils sont disjoints.
4. **Vols avec armes vs sans arme** : exclusif par définition.

Pas de garantie écrite à 100%, mais le sanity check empirique (notre 11.9 ‰ pour Paris cohérent avec l'atlas SSMSI) renforce la confiance.

## ⚠️ Piège #4 : communes non diffusées (`est_diffuse = "ndiff"`)

Pour les communes < 5 faits / 3 ans sur un indicateur (secret statistique), le SSMSI ne diffuse PAS le `nombre` ni le `taux_pour_mille`. Mais il diffuse `complement_info_nombre` et `complement_info_taux` qui sont les **moyennes départementales** des communes ndiff.

→ Notre code actuel **ignore ce cas** : si toutes les lignes d'un indicateur sont ndiff, le `find()` retourne quelque chose avec `taux_pour_mille = null` et on tombe sur le fallback `null` → "N/A" affiché. Pour des petites communes, c'est probablement le cas le plus fréquent.

Évolution possible : si `est_diffuse = "ndiff"`, fallback sur `complement_info_taux` (avec un visuel ~ ou astérisque pour signaler que c'est une moyenne départementale, pas la valeur communale).

## Cycle de publication

D'après la doc méthodo (p.5) :

- Comptabilisation d'une année **arrêtée début avril de l'année suivante** (requalifications, suppressions intégrées jusque-là).
- Le dataset data.gouv.fr est mis à jour **annuellement, mars/avril**.
- Donc en avril 2026, on a 2016 → 2025. **L'année 2026 ne sera dispo qu'en mars-avril 2027.**

`pickLatestYear` prend `max(annee)` sur les lignes retournées — robuste à la non-publication d'une année récente sur certaines communes.

## Indicateurs dispo en communal (10 sur 18)

| Indicateur                                  | Unité                         | Utilisé ?          |
| ------------------------------------------- | ----------------------------- | ------------------ |
| Violences physiques intrafamiliales         | Victime                       | ❌ (choix produit) |
| **Violences physiques hors cadre familial** | Victime                       | ✅ agressions      |
| **Violences sexuelles**                     | Victime                       | ✅ agressions      |
| **Vols avec armes**                         | Infraction                    | ✅ agressions      |
| **Vols violents sans arme**                 | Infraction                    | ✅ agressions      |
| Vols sans violence contre des personnes     | Victime entendue              | ❌                 |
| **Cambriolages de logement**                | Infraction                    | ✅ /1000 log       |
| Vols de véhicule / dans / accessoires       | Véhicule                      | ❌                 |
| Destructions et dégradations volontaires    | Infraction                    | ❌                 |
| Usage de stupéfiants (+ dont AFD)           | Mis en cause                  | ❌                 |
| Trafic de stupéfiants                       | Mis en cause                  | ❌                 |
| Escroqueries et fraudes                     | Victime (lieu de résidence !) | ❌                 |

**Non-communal** (seuil de diffusion) : Homicides, Tentatives d'homicide, Usage hors AFD.

## Méthode d'imputation des faits sans commune

Doc méthodo (p.10) : pour ~1% des faits dont la commune n'est pas connue, le SSMSI **assigne aléatoirement** une commune avec une pondération par volume. À garder en tête : sur les très petites communes, un fait peut être imputé sans avoir réellement eu lieu là.

## Géographie

`CODGEO_2025` = code INSEE commune au **1er janvier 2025**. Les fusions/scissions de communes postérieures ne sont pas reflétées dans ce dataset. Cohérent avec ce que renvoie le geocodeur Geopf actuellement, mais à surveiller si une commune est créée/fusionnée en cours d'année.

⚠️ La regex actuelle dans `SsmsiQuerySchema` est `^\d{5}[AB]?$` (cohérente avec Cerema), qui **ne matche pas la Corse** (`2A004`, `2B033` — lettre en position 2). Même piège que Cerema piège #3, à corriger ensemble si on couvre la Corse.

## Volume / perf

- Lignes par commune : ~10 indicateurs × 10 années = ~100 lignes (peut être moins si certains indicateurs sont ndiff).
- `page_size=200` → 1 seule requête upstream, pas de pagination à gérer.
- Cache Next : `revalidate: 60 * 60 * 24` (24 h). Cohérent avec un dataset mis à jour 1×/an.

## Liens utiles

- Dataset : https://www.data.gouv.fr/datasets/bases-statistiques-communale-departementale-et-regionale-de-la-delinquance-enregistree-par-la-police-et-la-gendarmerie-nationales
- Doc méthodologique PDF (mise à jour mars 2026) : https://www.data.gouv.fr/api/1/datasets/r/5e6dd067-3bba-45e3-b7ad-ed8c673bea5b
- Tabular API doc : https://tabular-api.data.gouv.fr/api/doc
- Glossaire SSMSI (définitions des indicateurs) : https://www.interieur.gouv.fr/Interstats/Sources-et-methodes-statistiques/Glossaire
- Interstats Méthode n°4 (NATINF & périmètres) : https://www.interieur.gouv.fr/content/download/90153/701043/file/IM4.pdf

# ATMO Qualité de l'air — notes d'implémentation

Notes internes (non commit). Ce qu'on a appris en intégrant l'indice ATMO de qualité de l'air, et les pièges où on est tombés.

## Endpoint utilisé

**Tabular API data.gouv.fr** : `https://tabular-api.data.gouv.fr/api/resources/<RESOURCE_ID>/data/`

- Dataset : [Indice de la qualité de l'air quotidien par commune (Indice ATMO)](https://www.data.gouv.fr/datasets/indice-de-la-qualite-de-lair-quotidien-par-commune-indice-atmo)
- `RESOURCE_ID = d2b9e8e6-8b0b-4bb6-9851-b4fa2efc8201` (CSV ~17 Mo, agrégé)
- Filtre principal : `code_zone__exact=<citycode>`
- On prend la ligne la plus récente : `date_ech__sort=desc&page_size=1`
- Réponse JSON : `{ data: [...], meta: { total, page, page_size }, links: {...} }`

### Pourquoi la tabular-api et pas le CSV ?

Le dataset publie aussi un CSV de 17 Mo et une couche WFS. La tabular-api est la solution propre : 1 requête filtrée par citycode → 1 ligne retournée, pas de gestion de fichier local, cache Next 6 h derrière (la donnée est quotidienne, plusieurs publications par jour).

## Schéma des colonnes utiles

| Colonne                                                     | Type    | Description                                                                         |
| ----------------------------------------------------------- | ------- | ----------------------------------------------------------------------------------- |
| `code_zone`                                                 | string  | Code INSEE commune (5 chiffres) **OU** code SIREN EPCI (9 chiffres) — voir piège #1 |
| `lib_zone`                                                  | string  | Nom de la zone ("Paris 1er Arrondissement", "CC du Pays Fouesnantais"…)             |
| `type_zone`                                                 | string  | `"commune"` ou `"EPCI"`                                                             |
| `code_qual`                                                 | int 1–6 | Indice ATMO global                                                                  |
| `lib_qual`                                                  | string  | "Bon" / "Moyen" / "Dégradé" / "Mauvais" / "Très mauvais" / "Extrêmement mauvais"    |
| `coul_qual`                                                 | string  | Code couleur hex officiel (ex: `#50CCAA` pour "Moyen")                              |
| `date_ech`                                                  | date    | Date de l'échéance (J, J+1 souvent J+2 — prévisions)                                |
| `code_no2`, `code_o3`, `code_pm10`, `code_pm25`, `code_so2` | int 0–3 | Sous-indices polluants (échelle 0–3, pas 1–6)                                       |
| `source`                                                    | string  | AASQA productrice ("Airparif", "Atmo Sud", "Air Breizh"…)                           |

## Échelle ATMO (rappel officiel)

| code_qual | lib_qual            | coul_qual |
| --------- | ------------------- | --------- |
| 1         | Bon                 | `#50F0E6` |
| 2         | Moyen               | `#50CCAA` |
| 3         | Dégradé             | `#F0E641` |
| 4         | Mauvais             | `#FF5050` |
| 5         | Très mauvais        | `#960032` |
| 6         | Extrêmement mauvais | `#7D2181` |

## ⚠️ Piège #1 : granularité hétérogène selon l'AASQA

Le dataset s'appelle « par commune » mais ce n'est **pas vrai partout**. Sur ~66 700 lignes :

- **66 011 lignes au niveau commune** (`type_zone="commune"`, `code_zone` = code INSEE 5 chiffres) — Airparif, Atmo Sud, Atmo NA, Atmo Aura, Atmo HdF, Atmo Grand Est, Atmo Normandie, Lig'Air, Madininair, Gwad'Air, Atmo Guyane…
- **711 lignes au niveau EPCI** (`type_zone="EPCI"`, `code_zone` = SIREN 9 chiffres) — **Air Breizh** (Bretagne : 22, 29, 35, 56) et **Air Pays de la Loire** (44, 49, 53, 72, 85)

**Conséquence** : un citycode 5 chiffres en Bretagne ou Pays-de-la-Loire ne matche **jamais** `code_zone__exact`. Exemple vécu : Bénodet `29006` → 0 ligne, alors que `CC du Pays Fouesnantais` (code 9 chiffres) en a.

### Solution prévue (pas encore implémentée)

Si la requête commune renvoie 0 ligne et que le département est dans { 22, 29, 35, 56, 44, 49, 53, 72, 85 } (ou plus simplement : toujours), interroger `https://geo.api.gouv.fr/communes/<citycode>?fields=codeEpci` pour récupérer le SIREN de l'EPCI, puis refaire `code_zone__exact=<siren>`.

À ce stade, on retourne `null` proprement et la card affiche `—` — pas de crash.

## ⚠️ Piège #2 : couverture DOM-TOM partielle

| Territoire                                                                                                      | Couvert ?        |
| --------------------------------------------------------------------------------------------------------------- | ---------------- |
| Métropole + Corse                                                                                               | ✅               |
| Guadeloupe (971xx)                                                                                              | ✅ (Gwad'Air)    |
| Martinique (972xx)                                                                                              | ✅ (Madininair)  |
| Guyane (973xx)                                                                                                  | ✅ (Atmo Guyane) |
| **Réunion** (974xx)                                                                                             | ❌ 0 ligne       |
| **Mayotte** (976xx)                                                                                             | ❌ 0 ligne       |
| Saint-Pierre-et-Miquelon, Saint-Barthélemy, Saint-Martin, Polynésie, Nouvelle-Calédonie, Wallis-et-Futuna, TAAF | ❌               |

La page data.gouv mentionne explicitement l'exclusion de Réunion + Nouvelle-Calédonie, mais en pratique Mayotte et le reste des COM lointains ne sont pas couverts non plus.

→ Pour ces territoires, on retourne `null` et la card affiche `—`. À gérer plus tard via un message « Donnée non disponible sur ce territoire » si besoin.

## ⚠️ Piège #3 : Paris / Lyon / Marseille = double publication

Pour les 3 villes à arrondissements, le dataset publie **les deux** :

- La commune mère (`75056` Paris, `69123` Lyon, `13055` Marseille) → 1 ligne par jour
- Chaque arrondissement (`75101..75120`, `69381..69389`, `13201..13216`) → 1 ligne par jour

C'est cohérent : ATMO calcule sur grille 1 km² puis agrège. Pour une grande commune l'indice est uniforme à l'échelle du quart d'arrondissement, donc commune ≈ arrondissement.

**On gère** : on tape directement le citycode reçu (arrondissement ou commune), et **fallback commune mère** si jamais l'arrondissement renvoie 0 ligne (filet de sécurité — testé, marche).

→ La fonction `getMasterCitycode()` dans `utils.ts` mappe `751XX → 75056`, `6938X → 69123`, `132XX → 13055`. Elle réutilise `isArmCitycode` exporté depuis `lib/insee/utils.ts`.

## ⚠️ Piège #4 : `coul_qual` casse variable

Observé selon les sources :

- Airparif → `#50CCAA` (majuscules)
- Atmo Aura, Atmo NA → `#50ccaa` (minuscules)

CSS s'en fout (`background: #50CCAA` et `#50ccaa` sont équivalents), mais si jamais on doit comparer cette string à un mapping côté code, normaliser en `.toLowerCase()`.

## ⚠️ Piège #5 : `lib_zone` parfois `null`

Pour certaines lignes (vu sur Lyon arrondissement `69381` notamment), `lib_zone` est `null` alors que la donnée existe. Ne jamais utiliser `lib_zone` comme clé d'identification — utiliser `code_zone` qui est toujours présent.

## ⚠️ Piège #6 : pas d'indice « du jour » garanti

Le dataset publie typiquement J + J+1 (+ parfois J+2 prévision), mais la fréquence n'est « pas respectée » selon les meta data.gouv. Si on tape pile au mauvais moment (entre minuit et la première publication), la dernière `date_ech` peut être de la veille.

→ On trie `date_ech__sort=desc&page_size=1` pour toujours avoir la valeur la plus récente, peu importe sa date. À surveiller : si on veut afficher la date à l'utilisateur, c'est `dateEch` dans la réponse normalisée (champ exposé par notre route mais pas affiché aujourd'hui).

## Granularité disponible

- **Plus petite granularité publiée** : la commune (ou l'EPCI selon l'AASQA, cf. piège #1)
- **Granularité interne de calcul** : grille **1 km²** par les AASQA (Airparif, Atmo Sud…), agrégée avant publication
- **La grille 1 km² n'est PAS exposée** par ce dataset → si un jour on en a besoin (ex. différencier Paris 7e vs Paris 19e qui peuvent diverger), il faut aller chercher chez chaque AASQA séparément (Airparif a une API), ce qui casse le modèle « 1 dataset national »

## Cache

- **Côté serveur** : Next `revalidate: 6 h`
- **Côté client** : TanStack Query `staleTime: 1 h`

Le dataset est mis à jour 1–3 fois par jour. 6 h serveur = compromis raisonnable entre fraîcheur et coût (l'utilisateur final ne perdra pas plus de 6 h de fraîcheur, et la donnée varie peu intra-journée).

## Réponse normalisée

Notre route renvoie un objet stable, indépendant du format upstream :

```ts
{
  codeQual: number | null,   // 1..6
  libQual: string | null,    // "Bon" .. "Extrêmement mauvais"
  coulQual: string | null,   // "#50CCAA"
  dateEch: string | null,    // "2026-04-15"
  fallbackUsed: boolean,     // true si on a rebasculé sur la commune mère
}
```

Tous à `null` = territoire non couvert ou commune absente du dataset (pas une erreur — la card affiche `—`). Une vraie erreur upstream renvoie `502 { error: "upstream_error" }`.

## Améliorations possibles

- **Fallback EPCI** (cf. piège #1) → couvre Bretagne + Pays-de-la-Loire
- **Affichage de la date** (`dateEch`) → utile si on veut indiquer « donnée d'aujourd'hui » vs « donnée d'hier »
- **Sous-indices polluants** (`code_no2`, `code_o3`, etc.) déjà dans la réponse upstream, pas exposés par notre route — si on veut les afficher dans une vue « détail », ajouter au schéma de réponse
- **Score global Environnement contextualisé** (1km² Airparif) — chantier séparé

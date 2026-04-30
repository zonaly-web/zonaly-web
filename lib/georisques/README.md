# Géorisques — notes d'implémentation

> **⚠️ Ce fichier est dans `.gitignore` — ne pas committer.**
> Notes internes sur les pièges de l'API Géorisques V2 pour ne pas refaire
> les mêmes erreurs si on remet les mains dans le code.

## Endpoints utilisés

3 appels en parallèle, tous via `codesInsee` (= `citycode` GeoPF) :

| Donnée affichée | Endpoint | Champ exploité |
|---|---|---|
| Radon | `/api/v2/radon` | `content[0].classePotentiel` (1/2/3) |
| Sites pollués (count) | `/api/v2/ssp` | somme des `totalElements` de **instructions + conclusionsSis + conclusionsSup** (CASIAS exclu, voir §8) |
| Argile (RGA) | `/api/v2/rga` | max des `codeExposition` (1/2/3) |

Token : `Authorization: Bearer ${GEORISQUES_API_TOKEN}` dans `.env.local`.
Base : `https://www.georisques.gouv.fr/api/v2`.
Spec OpenAPI V2 (cachée) : `https://www.georisques.gouv.fr/api/v3/api-docs/georisques-api-v2`.

## Pièges majeurs

### 1. Conventions de paramètres V1 vs V2

- **V1** : `code_insee`, `latlon=LON,LAT` (ordre inversé !)
- **V2** : `codesInsee`, `longitude` + `latitude` séparés, `codesParcelle`, `geometry`, `rayon`

Tester avec les mauvais noms renvoie souvent **toute la base** paginée
(le filtre est silencieusement ignoré → ex: `?code_insee=75056` sur V2 radon
renvoie les 36 390 communes de France).

### 2. Statut PLM (Paris/Lyon/Marseille) — chaque endpoint indexe différemment

GeoPF renvoie le `citycode` **arrondissement** (75101–75120, 69381–69389, 13201–13216),
pas la commune-mère. Mais l'indexation INSEE diffère selon l'endpoint :

| Endpoint | Indexé par | citycode GeoPF (75101) marche ? |
|---|---|---|
| `/radon` | arrondissement | ✅ oui (granularité géologique sub-commune) |
| `/ssp` casias | arrondissement | ✅ partiellement |
| `/ssp` SIS/SUP/instructions | commune-mère | ❌ non (perdu sur PLM) |
| `/rga` | commune-mère | ❌ non (renvoie 0 sur PLM) |
| `/gaspar/risques` | commune-mère | ❌ non |

Conséquence acceptée actuellement : sur Paris/Lyon/Marseille, RGA affiche
souvent "Aucun" et le décompte sites pollués sous-estime parce qu'on rate
les SIS/SUP indexés au niveau commune.

**Fix possible** : mapper le citycode → commune-mère pour `/rga` :
```ts
function communeMere(c: string) {
  if (/^751\d{2}$/.test(c)) return "75056";   // Paris
  if (/^6938\d$/.test(c))    return "69123";   // Lyon
  if (/^132\d{2}$/.test(c)) return "13055";   // Marseille
  return c;
}
```
Mais à appliquer endpoint par endpoint — radon ne veut PAS ce mapping.

### 3. SSP — base splittée à 2 niveaux d'INSEE

Test sur Paris 18e :

| Tiroir | `codesInsee=75118` (arr.) | `codesInsee=75056` (commune) |
|---|---|---|
| casias | 440 | 6 |
| instructions | 1 | 51 |
| conclusionsSis | 1 | 17 |
| conclusionsSup | 0 | 0 |

**Aucun chevauchement** entre les deux sets. Filtre strict `item.codeInsee == codesInsee`.
Pour avoir l'image complète sur PLM il faut faire les **2 appels** et additionner.
Pas de doublons.

Cas concret : le SIS "SARL Electricité Auto Radio" (21 rue Ordener Paris 18e)
est indexé `codeInsee=75056` dans la base, donc invisible si on filtre par 75118.

### 4. Recherche géométrique vs codesInsee — choix d'arbitrage

Pour les données **hyper-locales** (sols pollués, argile à fine échelle), `lat/lon + rayon`
est plus précis :
- Intersecte les MultiPolygons des SIS/SUP (testé OK avec rayon 500m)
- Renvoie la classe RGA exacte du point (pas l'inventaire commune)

Mais on a choisi `codesInsee` partout pour la simplicité. À garder en tête si
on veut plus de précision plus tard.

### 5. Plusieurs résultats sur PLM ou bordures de communes

`/radon` avec `codesInsee=75056` renvoie 0 (commune-mère pas reconnue pour radon).
`/radon` avec `codesInsee=87187` peut renvoyer 1 commune (Saint-Yrieix).
`/radon` avec `lat/lon + rayon=500` peut renvoyer 2+ communes voisines aux frontières.

Notre code prend `content[0]` pour radon → si plusieurs résultats, **ordre alphabétique INSEE**,
pas géographique. Risque d'afficher le mauvais niveau aux bordures.
RGA prend le **max** (principe de précaution).

### 6. Niveaux radon

L'API renvoie `"Risque Existant - faible|moyen|important"` (PAS "fort" malgré ce
qu'on pourrait croire). Mapping :
```
classePotentiel "1" → Faible
classePotentiel "2" → Modéré
classePotentiel "3" → Élevé    (libellé API: "important", pas "fort")
```

### 7. Endpoints existants en V1 mais pas V2

- `/api/v1/resultats_rapport_risque?adresse=...` → seul endpoint qui descendait
  à la **granularité adresse** (libelleStatutAdresse vs libelleStatutCommune).
  Pas d'équivalent V2. Utile si on veut un jour un score au niveau adresse.
- `/api/v1/gaspar/catnat` → arrêtés cat-nat historiques. V2 ne l'expose pas.

### 8. CASIAS volontairement exclu du count sites pollués

`/api/v2/ssp` renvoie 4 sous-collections représentant **4 stades de qualification**
de la pollution par l'État :

```
CASIAS  →  INSTRUCTIONS  →  conclusionsSis  →  conclusionsSup
"présomption"  "enquête"      "confirmé"      "interdit"
```

| Tiroir | Sens | Vérification réelle ? |
|---|---|---|
| **CASIAS** | Inventaire historique BASIAS (XIXe–XXe). "Il y a eu une activité polluante ici un jour" | Non, jamais (en général) |
| **instructions** | Procédure DREAL en cours ou clôturée | Oui, en cours |
| **conclusionsSis** | Pollution **mesurée et confirmée**, info ALUR obligatoire | Oui (mesures de sols) |
| **conclusionsSup** | **Restriction légale** d'usage du terrain (servitude PLU) | Oui + arrêté préfectoral |

**Pourquoi exclure CASIAS** :

- ~5 millions d'entrées en France (densité massive : 50–500 sites/km² en zone urbaine)
- ~70% concernent des activités arrêtées **avant 1980**
- Beaucoup de sites n'ont jamais été contrôlés depuis l'inscription
- Beaucoup n'ont en fait **jamais été pollués** (l'activité était classée polluante par
  précaution réglementaire mais ne l'était pas en pratique)
- Certains ont été dépollués sans mise à jour de la base

Compter CASIAS donne des chiffres énormes dénués de sens. Exemple Paris 18e :
**442** total → **2** sans CASIAS (la vraie pollution qualifiée par l'État).
Toulouse passe de 3039 → 87. Plazac de moyens → 0.

**À l'inverse, SIS et SUP sont toujours actifs** — ils enregistrent l'état du **sol**,
pas du bâtiment. Une usine démolie en 1995 reste classée SIS si les sols sont
toujours pollués. Métaleurop a fermé en 2003, ses SIS/SUP sont toujours en vigueur
20+ ans après. Pas de filtrage temporel à faire sur SIS/SUP.

**Caveat sur instructions** : peuvent avoir `statut: "Clôturée"` (parfois depuis
plusieurs années). Aujourd'hui on les compte quand même — pour un signal vraiment
actif il faudrait filtrer sur `statut === "En cours"`, ce qui impose de paginer
et lire `content` au lieu de juste `totalElements`. Trade-off acceptable : si
une instruction clôturée a abouti à pollution confirmée, le SIS qui en résulte
est de toute façon compté ailleurs.

## Pourquoi on a retiré l'inondation

`/api/v2/gaspar/risques` (DDRM) renvoie "Existant" sur quasi toutes les communes
françaises → bruit visuel, pas d'info actionnable.

Pour remettre l'inondation **utile** plus tard :
```
Promise.all([
  /api/v2/gaspar/azi?longitude&latitude&rayon=300,
  /api/v2/gaspar/pprn?longitude&latitude&rayon=300&codesAlea=11
])

// Mapping niveaux :
// pprn approuvé hits → Élevé   (zone réglementée)
// azi seul hits      → Modéré  (zone cartographiée)
// rien               → Aucun
```

## Pourquoi on a écarté radon en lat/lon

Le radon est par nature une **donnée communale** (cartographie IRSN par
géologie sous-jacente, mappée à la commune ou arrondissement pour PLM).
Sub-commune impossible. Donc `codesInsee` = sémantiquement plus juste.

V1 confirmait : `libelleStatutCommune` et `libelleStatutAdresse` étaient
toujours **identiques** pour radon. Pas d'info adresse-spécifique possible.

## Idées d'évolution

- **Niveau pollution pondéré** au lieu d'un count brut :
  ```
  SUP > 0           → Élevé
  SIS > 0           → Modéré
  Instructions > 0  → Faible
  sinon             → Aucun
  ```
- **Mapping commune-mère pour PLM** sur `/rga` (1 ligne, immédiat)
- **2 appels SSP sur PLM** (arrondissement + commune-mère, dédupliqués)
- **Filtrer instructions sur `statut === "En cours"`** (pagine + lit `content`)
- **Inondation graduée** : AZI + PPRN combinés
- **Autres dimensions Géorisques** vraiment utiles à un particulier :
  - Cavités souterraines (`/api/v2/cavites`) — Paris XV/XVI, Loire, mines
  - Mouvements de terrain (`/api/v2/mvt`)
  - Zonage sismique (`/api/v2/zonage_sismique`) — Sud-Est, Pyrénées
  - ICPE Seveso (`/api/v2/installations_classees?statutSeveso=...`)

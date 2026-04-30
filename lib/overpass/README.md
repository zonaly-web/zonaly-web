# Overpass / OpenStreetMap

Source des métriques **transports**, **commerces**, **écoles** de la dimension *Vie de quartier*.

> ⚠️ **Notes internes — non commitées (cf. `.gitignore`).** Documente l'implémentation et les **pièges** rencontrés, à relire avant toute évolution.

---

## Endpoint

```
POST https://overpass-api.de/api/interpreter
Content-Type: application/x-www-form-urlencoded
User-Agent: Zonaly/1.0 (+https://zonaly.fr)
Body:        data=<URL-encoded Overpass QL>
```

⚠️ **User-Agent obligatoire.** Sans header `User-Agent` identifiable, l'instance publique renvoie un **HTTP 406** avec `Apache/2.4 — Not Acceptable`. Le User-Agent par défaut de `fetch()` Node est filtré.

---

## Granularité : commune INSEE (ou ARM)

Les requêtes filtrent un `area` par tag `ref:INSEE` :

```overpassql
area["ref:INSEE"="${citycode}"]["admin_level"~"^(8|9)$"]->.a;
```

- `admin_level=8` → commune classique (~35 000 communes françaises)
- `admin_level=9` → arrondissement municipal (45 codes : Paris 75101–75120, Lyon 69381–69389, Marseille 13201–13216)

⚠️ **Bug silencieux si on filtre uniquement `admin_level=8`.** Une adresse parisienne géocodée renvoie `citycode=75101` (ARM) — qui n'existe pas en `admin_level=8` → set `.a` vide → **réponse `{0, 0, 0}` sans erreur**.

⚠️ **Codes Corse pas supportés** (`2A004`, `2B033`). Le regex de validation `/^\d{5}[AB]?$/` les refuse. Limitation héritée des autres sources (cerema, insee, georisques) — à traiter dans un chantier transverse.

---

## Métrique 1 — Transports = nombre de **lignes** uniques

Pas le nombre d'arrêts. Le nombre de lignes distinctes desservant la commune.

```overpassql
(
  node(area.a)[highway=bus_stop];
  node(area.a)[railway~"^(station|tram_stop|halt|subway_entrance)$"];
)->.stops;
rel(bn.stops)[type=route][route~"^(bus|subway|tram|train|light_rail|trolleybus)$"];
out tags;
```

Modes captés : **bus, subway, tram, train, light_rail, trolleybus**.
Pas captés : `ferry`, `funicular`, `aerialway`, `share_taxi`.

### Dédup

Côté TypeScript via `Set`, clé = `${route}:${ref ?? name ?? id}` (cf. `utils.ts > countUniqueLines`).

⚠️ **Pourquoi pas `route_master` côté Overpass ?** Test empirique : sur Brest, `route_master` seul renvoie 64 lignes alors qu'il y en a 67 réelles — **3 lignes sont orphelines** (mappées sans master parent). En Île-de-France la couverture est bonne, en province non. La dédup côté TS attrape les orphelines via leur `ref`.

### Pièges connus

⚠️ **Bus stops doublement taggués mais sur des nodes distincts.**
Un même arrêt est mappé sur 2 nodes :
- 1 sur la chaussée → `public_transport=stop_position`
- 1 sur le trottoir → `highway=bus_stop`

Comme ce sont 2 nodes avec 2 IDs différents, **Overpass ne déduplique pas** dans une union. Vérifié sur Paris/Kremlin-Bicêtre : `both = 0` ou ~1 sur 5000 → **les conventions sont sur des nodes séparés systématiquement**.

→ On a choisi de ne garder QUE `highway=bus_stop` (norme historique, ~100% de coverage en France) et d'écarter `public_transport=stop_position`. Sur Paris, retirer `PT=stop_position` rate ~530 arrêts modernes-only — mais ces arrêts servent quand même à trouver les routes via `rel(bn.stops)`, donc ça ne change pas le compte de lignes.

⚠️ **Métro = entrées, pas stations.**
`railway=subway_entrance` compte chaque bouche de métro. Une station Châtelet avec 13 sorties pèserait 13 dans le compteur d'arrêts. Sans impact sur le compte de lignes (notre métrique actuelle), mais à savoir si on revient un jour à du comptage d'arrêts.

⚠️ **`railway=station` mal taggué.**
Beaucoup de stations de métro Île-de-France sont taguées en plus comme `railway=station` (faux — `station` est censé désigner une gare ferroviaire). Pas un problème pour le compte de lignes (la dédup par `ref` règle ça), mais ça gonflerait artificiellement un compte d'arrêts.

---

## Métrique 2 — Commerces

```overpassql
(
  nwr(area.a)[shop];
  node(area.a)[amenity=marketplace];
);
out count;
```

- `[shop]` capte **toutes** les sous-catégories OSM (≈100 valeurs) : `bakery`, `clothes`, `hairdresser`, `optician`, `supermarket`, etc.
- `[amenity=marketplace]` ajoute les marchés municipaux.

### Pas inclus

Choix produit assumé :
- ❌ Restaurants / cafés / bars / fast-food (`amenity=restaurant|cafe|pub|bar|fast_food`)
- ❌ Pharmacies (`amenity=pharmacy`)
- ❌ Banques (`amenity=bank`)
- ❌ La Poste (`amenity=post_office`)
- ❌ Stations-service (`amenity=fuel`)

### Pièges connus

⚠️ **Faux positifs marginaux** (à 1-2 occurrences chacun) :
- `shop=outpost` → Amazon Locker, points relais
- `shop=storage_rental` → self-storage
- `shop=funeral_directors` → pompes funèbres

Pour 100+ commerces dans une ville, c'est du bruit < 2% — pas un sujet.

⚠️ **Doublons de mapping OSM.**
Cas réel à Kremlin-Bicêtre : *École Jeanne d'Arc* mappée 2 fois — 1 fois en `node` (point central), 1 fois en `way` (contour bâtiment). Idem pour *GiFi* et *Galerie Bicêtre* qui apparaissent en double avec 2 catégories différentes. **Aucun moyen de filtrer côté requête** — ce sont 2 entités distinctes au sens OSM. Marge d'erreur ~1-2% sur le compte.

⚠️ **Pas de dédoublonnage géographique.** Si tu voulais le faire, il faudrait du clustering par proximité (< 30-50 m) côté code après fetch des coordonnées. Coûteux. Non implémenté.

⚠️ **`[shop]` et `[amenity=marketplace]` ne se chevauchent pas.**
Vérification empirique : `nwr[shop][amenity=marketplace]` retourne `0` à Kremlin-Bicêtre, et seulement ~2000 dans le monde entier. Et même si un élément avait les 2 tags, l'union Overpass `( ; ; );` déduplique par ID. **Pas de double-comptage.**

---

## Métrique 3 — Écoles

```overpassql
(
  nwr(area.a)[amenity=school];
);
out count;
```

Capte **uniquement `amenity=school`** — qui en France couvre maternelle → lycée (sous-tags `school:FR=maternelle|primaire|élémentaire|collège|lycée`).

### Pas inclus

Choix produit (vise « écoles scolaires », exclut petite enfance + supérieur) :
- ❌ `amenity=kindergarten` → crèches, multi-accueils (mappées comme petite enfance en France, pas comme école)
- ❌ `amenity=college` → en OSM = post-bac (BTS, DUT, écoles d'ingé). **Ne pas confondre avec collège français** qui est `amenity=school + school:FR=collège`.
- ❌ `amenity=university` → fac, IUT

⚠️ **Piège de traduction `kindergarten`.**
En anglais US/UK = maternelle (3-6 ans). En OSM-FR = crèche (0-3 ans). La maternelle française est `amenity=school + school:FR=maternelle`. Ne pas se laisser piéger par le mot.

### Pièges connus

⚠️ **Doublons mapping OSM** (cf. section commerces, même cause).

---

## Réponse Overpass : 1 array, 3 catégories

La requête mixe 1 `out tags` + 2 `out count` → réponse hétérogène :

```json
{
  "elements": [
    { "type": "relation", ... },  // route 1
    { "type": "relation", ... },  // route 2
    ...
    { "type": "count", ... },     // commerces
    { "type": "count", ... }      // écoles
  ]
}
```

**Parsing** : `OverpassResponseSchema` (Zod) utilise `discriminatedUnion` + `transform` pour splitter en 3 props nommées `{ relations, commerces, ecoles }`. Le consommateur destructure directement, pas de filter ni de type predicate.

⚠️ **L'ordre des éléments est déterministe** car on contrôle la query. Si tu réordonnes les `out` statements dans `buildQuery`, mets à jour le destructuring (les counts arrivent dans l'ordre des `out count`).

---

## Performance & rate limit

### Cache Next.js

```ts
next: { revalidate: 60 * 60 * 24 * 7 }   // 7 jours
```

OSM bouge lentement, le cache long est tenable. Une commune populaire est servie depuis le cache 99% du temps.

### Rate limit Overpass (instance publique)

Deux mécanismes superposés :

1. **Slots** : 2 slots concurrents max par IP. Un slot = un verrou actif **pendant** la requête (pas un cooldown). Libéré dès que la requête finit.
2. **Crédit** : système de quota basé sur le **temps de calcul cumulé**. Quand le crédit est à plat → file d'attente puis timeout.

Statut en temps réel : `curl https://overpass-api.de/api/status` retourne le délai exact avant prochain slot disponible.

⚠️ **Symptôme rate-limit observé** : 502 après ~12-14s côté Next.js (= timeout côté Overpass après que la requête a végété en file). **Pas une erreur immédiate**.

⚠️ **Risque doublé si on revient à 2 requêtes parallèles** (`Promise.all`). On a testé cette approche puis on est revenu à **1 query unique** : moins « égoïste » côté Overpass, area calculé une seule fois côté serveur, et le typage est aussi simple grâce au transform Zod.

### Mitigations possibles si problème

1. Switch vers un mirror : `overpass.kumi.systems`, `overpass.private.coffee`, etc. (mêmes données OSM, autres limites).
2. Round-robin entre plusieurs mirrors.
3. Self-host Overpass sur un VPS (~100 GB disque, sync OSM diffs).

Aucune mitigation nécessaire pour l'instant grâce au cache 7 jours.

---

## Décisions produit verrouillées

| Sujet | Décision |
|---|---|
| Granularité | Commune INSEE (pas rayon métrique). Wording front-end nettoyé : « à 500 m » / « à 2 km » retiré. |
| Score / barre / insight de la card | Restent **en dur** (cohérent avec les autres dimensions à ce stade). |
| Permis récents (4e métrique de la card) | Reste **en fake data** (pas de source OSM, à brancher sur Sitadel ou équivalent). |
| Métrique transports | **Lignes** (pas arrêts). 13 = parlable, exploitable à l'oral. |
| Modes transports | bus + subway + tram + train + light_rail + trolleybus. Hors : ferry / funiculaire / téléphérique. |
| Définition « commerces » | Retail OSM strict (`shop=*` + `marketplace`). Hors : restaurants, pharmacies, banques. |
| Définition « écoles » | `amenity=school` uniquement (maternelle → lycée). Hors : crèches, post-bac, fac. |

---

## Pour aller plus loin (hors scope actuel)

- Restaurants / cafés / pharmacies dans le compte commerces
- Approche **rayon** depuis l'adresse exacte (comme emplacement.immo / Lokimo) en complément du compte commune
- Score calculé depuis les chiffres OSM (nécessite référentiel national pour les seuils A-E)
- Affichage du **détail nominal** des lignes (« Métro 7, Bus 47, V5… »)
- Dédoublonnage géographique (clustering par proximité)
- Support codes Corse (2A/2B) — chantier transverse à toutes les sources

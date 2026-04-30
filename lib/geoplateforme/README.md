# Géoplateforme — notes d'implémentation

Notes internes sur l'intégration de l'API IGN/Géoplateforme (autocomplétion + géocodage) et les pièges rencontrés. **Ne pas commit** — voir `.gitignore`.

## Endpoints utilisés

| Usage            | URL                                          | Méthode | Auth                        |
| ---------------- | -------------------------------------------- | ------- | --------------------------- |
| Autocomplétion   | `https://data.geopf.fr/geocodage/completion` | GET     | Aucune (publique, gratuite) |
| Géocodage précis | `https://data.geopf.fr/geocodage/search`     | GET     | Aucune (publique, gratuite) |

Docs : https://cartes.gouv.fr/aide/fr/guides-utilisateur/utiliser-les-services-de-la-geoplateforme/geocodage/ et `.../autocompletion/`

## Architecture

Tous les appels passent par **un proxy Next.js** (`app/api/geoplateforme/*`) qui :

1. valide les query params avec Zod (`AutocompleteQuerySchema`, `GeocodeQuerySchema`)
2. appelle l'upstream IGN
3. valide la réponse upstream avec Zod (défense en profondeur)
4. transforme + filtre côté serveur
5. renvoie une shape stable au client

Côté browser, `lib/geoplateforme/use-geoplateforme.ts` expose deux hooks TanStack Query :

- `useAddressAutocomplete(query)` — debounce 300ms via `usehooks-ts`, `keepPreviousData` pour éviter le flicker du dropdown
- `useGeocodeAddress()` — mutation déclenchée au clic sur "Analyser"

## Pièges et limites rencontrés

### 1. Le champ `country` est mal nommé

Sur l'endpoint `/completion`, chaque résultat contient un champ `country` qui **n'est pas un pays**. C'est en réalité le **type** du résultat :

- `"StreetAddress"` → adresse postale précise (numéro + rue + ville + CP)
- `"PositionOfInterest"` → commune, hameau, lieu-dit, POI

C'est un legacy bizarre du nommage IGN. Ne pas se laisser piéger par le nom du champ.

### 2. Le param `type=StreetAddress` n'est pas fiable

On envoie `type=StreetAddress` à `/completion` pour ne récupérer que des adresses, mais **l'API laisse parfois passer des `PositionOfInterest`** sur des requêtes ambiguës. Du coup, on **re-filtre côté serveur** :

```ts
.filter((r) => r.country === "StreetAddress")
```

Ceinture + bretelles. Si on retire ce filter, le dropdown peut afficher des communes au lieu d'adresses précises.

### 3. Les deux endpoints ont des **shapes de réponse complètement différentes**

| Endpoint      | Shape                                                                          |
| ------------- | ------------------------------------------------------------------------------ |
| `/completion` | Custom JSON : `{ status, results: [{ country, fulltext, x, y, ... }] }`        |
| `/search`     | GeoJSON `FeatureCollection` : `{ type, features: [{ geometry, properties }] }` |

Schémas Zod séparés (`AutocompleteUpstreamResponseSchema` vs `GeocodeUpstreamResponseSchema`). Pas de réutilisation possible.

### 4. Les noms de paramètres diffèrent entre les deux endpoints

- `/completion` : query param **`text`**, limit param **`maximumResponses`**
- `/search` : query param **`q`**, limit param **`limit`**

C'est très facile à se tromper. Bien vérifier dans la route quel param on construit.

### 5. Deux systèmes de coordonnées dans la réponse

Le `/search` renvoie :

- `geometry.coordinates: [lon, lat]` — WGS84 (le standard GeoJSON)
- `properties.x` et `properties.y` — Lambert93 (système français), en mètres

Pour Zonaly on utilise **uniquement** WGS84 (`coordinates`). Lambert93 est utile si on appelle d'autres APIs IGN (cadastre, etc.) qui le requièrent.

⚠️ Sur `/completion`, `x` et `y` sont en **WGS84** (lon, lat) — différent du `/search`. Ne pas confondre.

### 6. Schémas Zod en mode `.passthrough()` sur les `properties`

Les réponses IGN contiennent des champs supplémentaires (`importance`, `district`, `_type`, etc.) qui ne sont pas documentés stablement. On utilise `.passthrough()` pour ne pas casser si l'IGN ajoute un champ. À l'inverse on fait un `.parse()` strict côté client (sur la réponse de notre proxy) car on contrôle nous-mêmes le contrat.

### 7. Longueur minimale de query : 3 caractères

Sous 3 caractères, l'API renvoie soit :

- une 400
- soit du bruit massif (toutes les rues commençant par "ru" pour "ru")

On bloque côté Zod (`z.string().trim().min(3)`) et côté hook (`enabled: trimmed.length >= 3`).

### 8. Pas de rate limit officiel mais soft-throttling possible

L'API est gratuite et publique, **sans clé**. Mais l'IGN peut throttle silencieusement en cas de spam (502 ou réponses tronquées). D'où :

- Debounce 300ms sur l'autocomplete
- `staleTime: 5 * 60_000` (5 min) sur le hook → on ne refetch pas si la même query a été tapée récemment
- `cache: "no-store"` côté route pour ne pas polluer le cache HTTP de Next.js (on veut nos propres règles via React Query)

### 9. Pas d'erreur exploitable côté client

L'API ne renvoie pas de message d'erreur structuré : juste un status HTTP, parfois 200 avec un tableau vide. Côté route on convertit ça en :

- `400` invalid_query (notre validation)
- `502 upstream_error` (HTTP non-OK)
- `502 upstream_invalid` (Zod rejette la shape)

Côté UI : on affiche juste un dropdown vide. Pas de toast d'erreur.

### 10. Le score du géocodage n'est pas un seuil fiable

`/search` renvoie `properties.score` (0..1). Tentation : filtrer en dessous de 0.7. **Mauvaise idée** — l'API renvoie 0.95+ même sur des matches partiels mauvais, et 0.6 sur des matches précis avec faute de frappe. On garde toujours `features[0]` sans filtrage par score.

### 11. `keepPreviousData` essentiel sur l'autocomplétion

Sans ça, le dropdown se ferme à chaque keystroke (data devient `undefined` pendant le fetch) puis se rouvre → flicker insupportable. Avec `placeholderData: keepPreviousData`, on garde l'ancien tableau de suggestions affiché tant que le nouveau n'est pas arrivé.

## TL;DR des trucs à ne pas oublier

- ✅ Toujours filter `country === "StreetAddress"` après l'autocomplete
- ✅ Param `text` pour completion, `q` pour search
- ✅ Garder `passthrough()` sur les schemas upstream
- ✅ Min 3 caractères, debounce 300ms, staleTime 5min, keepPreviousData
- ✅ WGS84 dans `geometry.coordinates`, Lambert93 dans `properties.x/y` (sur search uniquement)
- ❌ Ne pas filtrer par score
- ❌ Ne pas faire confiance au `type=StreetAddress` côté API
- ❌ Ne pas confondre `x/y` de completion (WGS84) et de search (Lambert93)

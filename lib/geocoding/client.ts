import {
  AutocompleteApiResponseSchema,
  GeocodeApiResponseSchema,
  type AutocompleteResult,
  type GeocodeFeature,
} from "./schemas";

export async function fetchAutocomplete(q: string): Promise<AutocompleteResult[]> {
  const res = await fetch(`/api/geocode/autocomplete?q=${encodeURIComponent(q)}`);
  if (!res.ok) throw new Error(`autocomplete_failed_${res.status}`);
  const json = await res.json();
  return AutocompleteApiResponseSchema.parse(json).results;
}

export async function fetchGeocode(q: string): Promise<GeocodeFeature | null> {
  const res = await fetch(`/api/geocode/search?q=${encodeURIComponent(q)}`);
  if (!res.ok) throw new Error(`geocode_failed_${res.status}`);
  const json = await res.json();
  return GeocodeApiResponseSchema.parse(json).feature;
}

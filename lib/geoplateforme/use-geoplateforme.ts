import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";
import { useDebounceValue } from "usehooks-ts";
import {
  AutocompleteApiResponseSchema,
  GeocodeApiResponseSchema,
  type AutocompleteResult,
  type GeocodeFeature,
} from "./schemas";

export async function fetchAutocomplete(q: string): Promise<AutocompleteResult[]> {
  const res = await fetch(`/api/geoplateforme/auto-complete?q=${encodeURIComponent(q)}`);
  if (!res.ok) throw new Error(`autocomplete_failed_${res.status}`);
  const json = await res.json();
  return AutocompleteApiResponseSchema.parse(json).results;
}

export async function fetchGeocode(q: string): Promise<GeocodeFeature | null> {
  const res = await fetch(`/api/geoplateforme/geocode?q=${encodeURIComponent(q)}`);
  if (!res.ok) throw new Error(`geocode_failed_${res.status}`);
  const json = await res.json();
  return GeocodeApiResponseSchema.parse(json).feature;
}

export function useAddressAutocomplete(query: string) {
  const [debounced] = useDebounceValue(query, 300);
  const trimmed = debounced.trim();

  return useQuery({
    queryKey: ["autocomplete", trimmed],
    queryFn: () => fetchAutocomplete(trimmed),
    enabled: trimmed.length >= 3,
    staleTime: 5 * 60_000,
    placeholderData: keepPreviousData,
  });
}

export function useGeocodeAddress() {
  return useMutation({
    mutationFn: (q: string) => fetchGeocode(q),
  });
}

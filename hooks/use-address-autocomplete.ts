"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useDebounceValue } from "usehooks-ts";
import { fetchAutocomplete } from "@/lib/geocoding/client";

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

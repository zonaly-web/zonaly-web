"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchCeremaPrix } from "@/lib/cerema/client";

export function useCeremaPrix(citycode: string | null | undefined) {
  return useQuery({
    queryKey: ["cerema-prix", citycode],
    queryFn: () => fetchCeremaPrix(citycode!),
    enabled: !!citycode,
    staleTime: 60 * 60 * 1000,
  });
}

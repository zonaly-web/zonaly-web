"use client";

import { useQuery } from "@tanstack/react-query";
import { CeremaPrixApiResponse, CeremaPrixApiResponseSchema } from "./schemas";

async function fetchCeremaPrix(citycode: string): Promise<CeremaPrixApiResponse> {
  const res = await fetch(`/api/cerema?citycode=${encodeURIComponent(citycode)}`);
  if (!res.ok) throw new Error(`cerema_failed_${res.status}`);
  const json = await res.json();
  const validated = CeremaPrixApiResponseSchema.parse(json);
  return validated;
}

export function useCeremaPrix(citycode: string | null | undefined) {
  return useQuery({
    queryKey: ["cerema-prix", citycode],
    queryFn: () => fetchCeremaPrix(citycode!),
    enabled: !!citycode,
    staleTime: 60 * 60 * 1000,
  });
}

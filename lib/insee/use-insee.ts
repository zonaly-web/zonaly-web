"use client";

import { InseeCommuneApiResponse, InseeCommuneApiResponseSchema } from "@/lib/insee/schemas";
import { useQuery } from "@tanstack/react-query";

async function fetchInseeCommune(citycode: string): Promise<InseeCommuneApiResponse> {
  const res = await fetch(`/api/insee?citycode=${encodeURIComponent(citycode)}`);
  if (!res.ok) throw new Error(`insee_failed_${res.status}`);
  const json = await res.json();
  return InseeCommuneApiResponseSchema.parse(json);
}

export function useInseeCommune(citycode: string | null | undefined) {
  return useQuery({
    queryKey: ["insee-commune", citycode],
    queryFn: () => fetchInseeCommune(citycode!),
    enabled: !!citycode,
    staleTime: 60 * 60 * 1000,
  });
}

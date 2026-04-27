"use client";

import { useQuery } from "@tanstack/react-query";
import { SsmsiApiResponse, SsmsiApiResponseSchema } from "./schemas";

async function fetchSsmsi(citycode: string): Promise<SsmsiApiResponse> {
  const res = await fetch(`/api/ssmsi?citycode=${encodeURIComponent(citycode)}`);
  if (!res.ok) throw new Error(`ssmsi_failed_${res.status}`);
  const json = await res.json();
  return SsmsiApiResponseSchema.parse(json);
}

export function useSsmsi(citycode: string | null | undefined) {
  return useQuery({
    queryKey: ["ssmsi", citycode],
    queryFn: () => fetchSsmsi(citycode!),
    enabled: !!citycode,
    staleTime: 60 * 60 * 1000,
  });
}

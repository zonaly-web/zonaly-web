"use client";

import { AtmoApiResponse, AtmoApiResponseSchema } from "@/lib/atmo/schemas";
import { useQuery } from "@tanstack/react-query";

async function fetchAtmo(citycode: string): Promise<AtmoApiResponse> {
  const res = await fetch(`/api/atmo?citycode=${encodeURIComponent(citycode)}`);
  if (!res.ok) throw new Error(`atmo_failed_${res.status}`);
  const json = await res.json();
  return AtmoApiResponseSchema.parse(json);
}

export function useAtmo(citycode: string | null | undefined) {
  return useQuery({
    queryKey: ["atmo", citycode],
    queryFn: async () => {
      const res = await fetchAtmo(citycode!);
      console.log("fetchAtmo", res);
      return res;
    },
    enabled: !!citycode,
    staleTime: 60 * 60 * 1000,
  });
}

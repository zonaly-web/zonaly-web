import { GeorisquesEnvApiResponseSchema, type GeorisquesEnvApiResponse } from "./schemas";
import { useQuery } from "@tanstack/react-query";

async function fetchGeorisques(codeInsee: string): Promise<GeorisquesEnvApiResponse> {
  const res = await fetch(`/api/georisques?codeInsee=${encodeURIComponent(codeInsee)}`);
  if (!res.ok) throw new Error(`georisques_failed_${res.status}`);
  const json = await res.json();
  return GeorisquesEnvApiResponseSchema.parse(json);
}

export function useGeorisques(codeInsee: string | null | undefined) {
  return useQuery({
    queryKey: ["georisques", codeInsee],
    queryFn: () => fetchGeorisques(codeInsee!),
    enabled: !!codeInsee,
    staleTime: 60 * 60 * 1000,
  });
}

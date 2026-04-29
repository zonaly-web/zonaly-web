import { OverpassApiResponseSchema, type OverpassApiResponse } from "./schemas";
import { useQuery } from "@tanstack/react-query";

async function fetchOverpass(citycode: string): Promise<OverpassApiResponse> {
  const res = await fetch(`/api/overpass?citycode=${encodeURIComponent(citycode)}`);
  if (!res.ok) throw new Error(`overpass_failed_${res.status}`);
  const json = await res.json();
  return OverpassApiResponseSchema.parse(json);
}

export function useOverpass(citycode: string | null | undefined) {
  return useQuery({
    queryKey: ["overpass", citycode],
    queryFn: () => fetchOverpass(citycode!),
    enabled: !!citycode,
    staleTime: 60 * 60 * 1000,
  });
}

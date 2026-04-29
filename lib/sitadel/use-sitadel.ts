import { SitadelApiResponseSchema, type SitadelApiResponse } from "./schemas";
import { useQuery } from "@tanstack/react-query";

async function fetchSitadel(citycode: string): Promise<SitadelApiResponse> {
  const res = await fetch(`/api/sitadel?citycode=${encodeURIComponent(citycode)}`);
  if (!res.ok) throw new Error(`sitadel_failed_${res.status}`);
  const json = await res.json();
  return SitadelApiResponseSchema.parse(json);
}

export function useSitadel(citycode: string | null | undefined) {
  return useQuery({
    queryKey: ["sitadel", citycode],
    queryFn: () => fetchSitadel(citycode!),
    enabled: !!citycode,
    staleTime: 60 * 60 * 1000,
  });
}

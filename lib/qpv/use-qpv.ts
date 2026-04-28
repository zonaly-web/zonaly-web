"use client";

import { useQuery } from "@tanstack/react-query";
import { QpvApiResponse, QpvApiResponseSchema } from "./schemas";

async function fetchQpv(citycode: string): Promise<QpvApiResponse> {
  const res = await fetch(`/api/qpv?citycode=${encodeURIComponent(citycode)}`);
  if (!res.ok) throw new Error(`qpv_failed_${res.status}`);
  const json = await res.json();
  return QpvApiResponseSchema.parse(json);
}

export function useQpv(citycode: string | null | undefined) {
  return useQuery({
    queryKey: ["qpv", citycode],
    queryFn: () => fetchQpv(citycode!),
    enabled: !!citycode,
    staleTime: 24 * 60 * 60 * 1000,
  });
}

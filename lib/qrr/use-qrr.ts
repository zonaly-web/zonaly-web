"use client";

import { useQuery } from "@tanstack/react-query";
import { QrrApiResponse, QrrApiResponseSchema } from "./schemas";

async function fetchQrr(citycode: string): Promise<QrrApiResponse> {
  const res = await fetch(`/api/qrr?citycode=${encodeURIComponent(citycode)}`);
  if (!res.ok) throw new Error(`qrr_failed_${res.status}`);
  const json = await res.json();
  return QrrApiResponseSchema.parse(json);
}

export function useQrr(citycode: string | null | undefined) {
  return useQuery({
    queryKey: ["qrr", citycode],
    queryFn: () => fetchQrr(citycode!),
    enabled: !!citycode,
    staleTime: 24 * 60 * 60 * 1000,
  });
}

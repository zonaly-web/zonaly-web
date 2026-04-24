"use client";

import { useMutation } from "@tanstack/react-query";
import { fetchGeocode } from "@/lib/geocoding/client";

export function useGeocodeAddress() {
  return useMutation({
    mutationFn: (q: string) => fetchGeocode(q),
  });
}

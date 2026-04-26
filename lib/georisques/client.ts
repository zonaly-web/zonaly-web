import { GeorisquesEnvApiResponseSchema, type GeorisquesEnvApiResponse } from "./schemas";

export async function fetchGeorisques(codeInsee: string): Promise<GeorisquesEnvApiResponse> {
  const res = await fetch(`/api/georisques?codeInsee=${encodeURIComponent(codeInsee)}`);
  if (!res.ok) throw new Error(`georisques_failed_${res.status}`);
  const json = await res.json();
  return GeorisquesEnvApiResponseSchema.parse(json);
}

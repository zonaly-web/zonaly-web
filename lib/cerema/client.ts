import { CeremaPrixApiResponseSchema, type CeremaPrixApiResponse } from "./schemas";

export async function fetchCeremaPrix(citycode: string): Promise<CeremaPrixApiResponse> {
  const res = await fetch(`/api/cerema/prix?citycode=${encodeURIComponent(citycode)}`);
  if (!res.ok) throw new Error(`cerema_failed_${res.status}`);
  const json = await res.json();
  const validated = CeremaPrixApiResponseSchema.parse(json);
  console.log("validated", validated);
  return validated;
}

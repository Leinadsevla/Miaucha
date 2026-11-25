import { ALERT_GEOHASH_PRECISION, encodeGeohash } from "@miaucha/shared";
import type { GetLocation } from "@/features/location/currentLocation";

export type SyncResult = "sent" | "unchanged" | "no-location" | "failed";

/**
 * AL-06: mantém no servidor a região aproximada do usuário (geohash de 6 caracteres, ~1 km), calculada aqui.
 * Só envia quando o usuário muda de célula (deslocamento significativo); a coordenada nunca sai do aparelho.
 */
export function createLocationSync({ getLocation, send }: { getLocation: GetLocation; send: (geohash: string) => Promise<void> }) {
  let lastSent: string | null = null;
  let running: Promise<SyncResult> | null = null;

  async function run(): Promise<SyncResult> {
    const location = await getLocation();
    if (location.status !== "ok") return "no-location";
    const geohash = encodeGeohash(location.coords.lat, location.coords.lng, ALERT_GEOHASH_PRECISION);
    if (geohash === lastSent) return "unchanged";
    try {
      await send(geohash);
      lastSent = geohash;
      return "sent";
    } catch {
      return "failed";
    }
  }

  return function sync(): Promise<SyncResult> {
    running ??= run().finally(() => {
      running = null;
    });
    return running;
  };
}

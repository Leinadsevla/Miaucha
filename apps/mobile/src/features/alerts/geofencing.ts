import {
  ALERT_GEOHASH_PRECISION,
  decodeGeohash,
  encodeGeohash,
  GEOFENCE_LIMITS,
  GEOFENCE_RECALC_METERS,
  pickGeofenceRegions,
  shouldRecalculateGeofences,
  type AlertPreferences,
  type GeofencePlatform,
  type LatLng,
  type OccurrenceType,
} from "@miaucha/shared";

/**
 * AL-02 / AL-03: alerta ao entrar na área de uma ocorrência, mesmo com o app fechado.
 * Exige permissão de localização "sempre", `expo-task-manager` e development build; fica atrás da flag
 * `EXPO_PUBLIC_GEOFENCING=1` e nunca liga no Expo Go. A parte nativa está em `geofencingNative.ts`.
 */
export type GeofencingAvailability = "enabled" | "expo-go" | "flag-off" | "unsupported";

export function geofencingAvailability({ os, isExpoGo, flag }: { os: string; isExpoGo: boolean; flag: string | undefined }): GeofencingAvailability {
  if (os !== "ios" && os !== "android") return "unsupported";
  if (isExpoGo) return "expo-go";
  return flag === "1" ? "enabled" : "flag-off";
}

/** Região especial em volta do usuário: ao sair dela, recalcula as monitoradas. */
export const RECALC_REGION_ID = "recalc";

export type NativeRegion = {
  identifier: string;
  latitude: number;
  longitude: number;
  radius: number;
  notifyOnEnter: boolean;
  notifyOnExit: boolean;
};

export function planGeofences({
  occurrences,
  here,
  lastCenter,
  os,
  previousIds,
}: {
  occurrences: { id: string; publicLocation: LatLng }[];
  here: LatLng;
  lastCenter: LatLng | null;
  os: GeofencePlatform;
  /** Ocorrências monitoradas hoje: se mudarem (ex.: alertas desligados), recalcula mesmo parado. */
  previousIds?: string[];
}): { recalculate: false } | { recalculate: true; regions: NativeRegion[] } {
  const nearest = pickGeofenceRegions(occurrences, here, os, { reserve: 1 }).map((r) => ({
    identifier: r.id,
    latitude: r.latitude,
    longitude: r.longitude,
    radius: r.radius,
    notifyOnEnter: true,
    notifyOnExit: false,
  }));
  const sameIds =
    previousIds === undefined ||
    (previousIds.length === nearest.length && nearest.every((r) => previousIds.includes(r.identifier)));
  if (!shouldRecalculateGeofences(lastCenter, here) && sameIds) return { recalculate: false };
  const recalc: NativeRegion = {
    identifier: RECALC_REGION_ID,
    latitude: here.lat,
    longitude: here.lng,
    radius: GEOFENCE_RECALC_METERS,
    notifyOnEnter: false,
    notifyOnExit: true,
  };
  return { recalculate: true, regions: [recalc, ...nearest].slice(0, GEOFENCE_LIMITS[os]) };
}

/** Notificação local ao entrar numa região; null para a região de recálculo ou ocorrência já avisada (AL-05). */
export function geofenceNotification(regionId: string, alreadyNotified: string[]) {
  if (regionId === RECALC_REGION_ID || alreadyNotified.includes(regionId)) return null;
  return { title: "Você está perto de um pet perdido", body: "Toque para ver a ocorrência e ajudar.", data: { occurrenceId: regionId } };
}

type NearbyOccurrence = { id: string; type: OccurrenceType; isMine: boolean; publicLocation: LatLng };

/**
 * Ocorrências que viram regiões monitoradas: só pets perdidos de outras pessoas, no raio das preferências.
 * Com os alertas desligados, nenhuma (a notificação local sairia mesmo assim).
 */
export async function nearbyGeofenceCandidates<T extends NearbyOccurrence>({
  here,
  nearby,
  getPreferences,
}: {
  here: LatLng;
  nearby: (query: LatLng & { radiusKm: number }) => Promise<T[]>;
  getPreferences: () => Promise<AlertPreferences>;
}): Promise<T[]> {
  const prefs = await getPreferences();
  if (!prefs.enabled) return [];
  // AL-06: a posição exata não sai do aparelho; a API só recebe o centro do geohash de ~1 km.
  const cell = decodeGeohash(encodeGeohash(here.lat, here.lng, ALERT_GEOHASH_PRECISION)).center;
  const list = await nearby({ ...cell, radiusKm: prefs.radiusKm });
  return list.filter((o) => o.type === "lost" && !o.isMine);
}

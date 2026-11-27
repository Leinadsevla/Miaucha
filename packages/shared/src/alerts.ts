import { distanceMeters, type LatLng } from "./geo";
import type { OccurrenceType } from "./theme";
import type { OccurrenceStatus, Species } from "./types";

/** AL-04: raios que o usuário pode escolher. */
export const ALERT_RADII_KM = [1, 3, 5] as const;
export type AlertRadiusKm = (typeof ALERT_RADII_KM)[number];

/** Horário de silêncio em hora local ("HH:MM"). Pode atravessar a meia-noite (22:00–07:00). Fim não incluso. */
export type QuietHours = { start: string; end: string };

export type AlertPreferences = { enabled: boolean; radiusKm: AlertRadiusKm; quietHours: QuietHours | null };

export const DEFAULT_ALERT_PREFERENCES: AlertPreferences = { enabled: true, radiusKm: 3, quietHours: null };

/** Todos os usuários são tratados no fuso de São Paulo (o app é lançado no Brasil). */
export const ALERT_TIME_ZONE = "America/Sao_Paulo";

export type AlertPreferencesErrors = Partial<Record<"enabled" | "radiusKm" | "quietStart" | "quietEnd", string>>;

export const ALERT_MESSAGES = {
  enabled: "Informe se os alertas estão ligados",
  radiusKm: "Escolha um raio de 1, 3 ou 5 km",
  time: "Use o formato HH:MM (ex.: 22:00)",
  sameTime: "O fim precisa ser diferente do início",
};

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** "HH:MM" (24 h) → minutos desde a meia-noite; null se o formato não bate. */
export function parseTime(value: string): number | null {
  const match = TIME_RE.exec(value);
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

export function minutesToTime(minutes: number): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
}

export function validateAlertPreferences(prefs: AlertPreferences): AlertPreferencesErrors {
  const errors: AlertPreferencesErrors = {};
  if (typeof prefs.enabled !== "boolean") errors.enabled = ALERT_MESSAGES.enabled;
  if (!(ALERT_RADII_KM as readonly unknown[]).includes(prefs.radiusKm)) errors.radiusKm = ALERT_MESSAGES.radiusKm;
  if (prefs.quietHours !== null) {
    const start = parseTime(prefs.quietHours?.start);
    const end = parseTime(prefs.quietHours?.end);
    if (start === null) errors.quietStart = ALERT_MESSAGES.time;
    if (end === null) errors.quietEnd = ALERT_MESSAGES.time;
    if (start !== null && start === end) errors.quietEnd = ALERT_MESSAGES.sameTime;
  }
  return errors;
}

/** Minutos desde a meia-noite no fuso dado. */
function localMinutes(now: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(now);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return (get("hour") % 24) * 60 + get("minute");
}

/** AL-04: se `now` está dentro do horário de silêncio (início incluso, fim não), no fuso dado. */
export function isInQuietHours(quiet: QuietHours | null, now: Date, timeZone: string = ALERT_TIME_ZONE): boolean {
  if (!quiet) return false;
  const start = parseTime(quiet.start);
  const end = parseTime(quiet.end);
  if (start === null || end === null || start === end) return false;
  const minutes = localMinutes(now, timeZone);
  return start < end ? minutes >= start && minutes < end : minutes >= start || minutes < end;
}

const PUSH_TOKEN_RE = /^Expo(nent)?PushToken\[[A-Za-z0-9_-]{1,200}\]$/;

/** Token do Expo Push: `ExponentPushToken[...]` (ou `ExpoPushToken[...]`). */
export function isValidPushToken(value: unknown): value is string {
  return typeof value === "string" && PUSH_TOKEN_RE.test(value);
}

/** Alerta recebido, como `GET /me/alerts` devolve. Só dados públicos da ocorrência (MP-07, CH-02). */
export type AlertItem = {
  id: string;
  occurrenceId: string;
  /**
   * Distância aproximada em metros: do centro da célula do usuário até o ponto público ou, num avistamento
   * do pet do usuário (`sighting`), do avistamento até onde o pet sumiu.
   */
  distanceMeters: number;
  /** "Vi este pet": alguém avistou o pet perdido deste usuário. */
  sighting: boolean;
  createdAt: string;
  seenAt: string | null;
  occurrence: {
    type: OccurrenceType;
    species: Species;
    petName: string | null;
    breed: string | null;
    color: string | null;
    approxAddress: string | null;
    status: OccurrenceStatus;
    createdAt: string;
    /** URL assinada da foto de capa (NF-05), ou null. */
    photoUrl: string | null;
  };
};

/** AL-03: limite de regiões monitoradas pelo sistema operacional. */
export const GEOFENCE_LIMITS = { ios: 20, android: 100 } as const;
export type GeofencePlatform = keyof typeof GEOFENCE_LIMITS;

export type GeofenceRegion = { id: string; latitude: number; longitude: number; radius: number };

/** Raio padrão de cada região: entrar a ~300 m do ponto público (que já está deslocado ~150 m do real). */
export const GEOFENCE_RADIUS_METERS = 300;
/** Recalcula as regiões ao se deslocar mais que isto desde o último cálculo. */
export const GEOFENCE_RECALC_METERS = 1_000;

/**
 * AL-03: as ocorrências mais próximas que cabem no limite da plataforma, da mais perto para a mais longe.
 * `reserve` deixa vagas livres (ex.: uma região em volta do usuário para disparar o recálculo).
 */
export function pickGeofenceRegions(
  occurrences: { id: string; publicLocation: LatLng }[],
  here: LatLng,
  platform: GeofencePlatform,
  { radiusMeters = GEOFENCE_RADIUS_METERS, reserve = 0 }: { radiusMeters?: number; reserve?: number } = {},
): GeofenceRegion[] {
  const limit = Math.max(0, GEOFENCE_LIMITS[platform] - reserve);
  return occurrences
    .map((o) => ({ o, d: distanceMeters(here, o.publicLocation) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, limit)
    .map(({ o }) => ({ id: o.id, latitude: o.publicLocation.lat, longitude: o.publicLocation.lng, radius: radiusMeters }));
}

export function shouldRecalculateGeofences(lastCenter: LatLng | null, here: LatLng, thresholdMeters = GEOFENCE_RECALC_METERS): boolean {
  return lastCenter === null || distanceMeters(lastCenter, here) > thresholdMeters;
}

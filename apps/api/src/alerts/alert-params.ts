import {
  ALERT_GEOHASH_PRECISION,
  ALERT_MESSAGES,
  formatApproxDistance,
  isValidGeohash,
  validateAlertPreferences,
  type AlertPreferences,
  type AlertPreferencesErrors,
  type OccurrenceType,
  type Species,
} from "@miaucha/shared";
import type { PushMessage } from "./push-sender";

/**
 * AL-06: o corpo é só `{ geohash }` de precisão 6. Qualquer outro campo (lat, lng, precisão...) é recusado,
 * para o app nunca mandar a coordenada por engano.
 */
export function parseLocationBody(body: unknown): { geohash: string } | { error: string } {
  const error = { error: `Envie só o geohash de ${ALERT_GEOHASH_PRECISION} caracteres da região aproximada` };
  if (!body || typeof body !== "object") return error;
  const keys = Object.keys(body);
  const geohash = (body as { geohash?: unknown }).geohash;
  if (keys.length !== 1 || keys[0] !== "geohash" || !isValidGeohash(geohash, ALERT_GEOHASH_PRECISION)) return error;
  return { geohash };
}

export function parsePreferencesBody(body: unknown): { prefs: AlertPreferences } | { errors: AlertPreferencesErrors } {
  const b = (body ?? {}) as Record<string, unknown>;
  const rawQuiet = b.quietHours;
  let quietHours: AlertPreferences["quietHours"] = null;
  if (rawQuiet !== undefined && rawQuiet !== null) {
    const q = typeof rawQuiet === "object" ? (rawQuiet as Record<string, unknown>) : {};
    quietHours = { start: typeof q.start === "string" ? q.start : "", end: typeof q.end === "string" ? q.end : "" };
  }
  const prefs = { enabled: b.enabled, radiusKm: b.radiusKm, quietHours } as AlertPreferences;
  const errors = validateAlertPreferences(prefs);
  // Um horário inválido de cada lado já basta; "fim igual ao início" só faz sentido com os dois válidos.
  if (errors.quietEnd === ALERT_MESSAGES.sameTime && errors.quietStart) delete errors.quietEnd;
  return Object.keys(errors).length > 0 ? { errors } : { prefs };
}

const TITLES: Record<OccurrenceType, string> = {
  lost: "Pet perdido perto de você",
  seen: "Pet avistado perto de você",
  found: "Pet encontrado perto de você",
};

const SPECIES = { dog: "cão", cat: "gato" } as const;

export type AlertPushInput = {
  occurrenceId: string;
  alertId: string;
  type: OccurrenceType;
  species: Species;
  petName: string | null;
  approxAddress: string | null;
  distanceMeters: number;
};

export function buildAlertPush(alert: AlertPushInput, token: string): PushMessage {
  const species = SPECIES[alert.species];
  const who = alert.petName ? `${alert.petName} (${species})` : `${species.charAt(0).toUpperCase()}${species.slice(1)} sem nome`;
  const parts = [who, `a ${formatApproxDistance(alert.distanceMeters)}`];
  if (alert.approxAddress) parts.push(alert.approxAddress);
  return {
    to: token,
    title: TITLES[alert.type],
    body: parts.join(" · "),
    data: { occurrenceId: alert.occurrenceId, alertId: alert.alertId },
  };
}

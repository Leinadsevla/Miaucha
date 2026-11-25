import {
  ALERT_GEOHASH_PRECISION,
  DEFAULT_ALERT_PREFERENCES,
  isValidGeohash,
  validateAlertPreferences,
  type AlertItem,
  type AlertPreferences,
} from "@miaucha/shared";
import type { ApiSession } from "@/features/auth/apiSession";

export type AlertsClient = {
  /** Alertas recebidos, mais recentes primeiro (AL-01). */
  list(): Promise<AlertItem[]>;
  markSeen(alertId: string): Promise<void>;
  getPreferences(): Promise<AlertPreferences>;
  savePreferences(prefs: AlertPreferences): Promise<AlertPreferences>;
  /** AL-06: só o geohash de 6 caracteres; a coordenada nunca sai do aparelho. */
  updateLocation(geohash: string): Promise<void>;
  registerPushToken(token: string): Promise<void>;
  removePushToken(token: string): Promise<void>;
};

export function createHttpAlertsClient({ session }: { session: ApiSession }): AlertsClient {
  return {
    list: () => session.authed<AlertItem[]>("GET", "/me/alerts"),
    markSeen: async (id) => void (await session.authed("POST", `/me/alerts/${encodeURIComponent(id)}/seen`)),
    getPreferences: () => session.authed<AlertPreferences>("GET", "/me/alert-preferences"),
    savePreferences: (prefs) => session.authed<AlertPreferences>("PUT", "/me/alert-preferences", prefs),
    updateLocation: async (geohash) => void (await session.authed("PUT", "/me/location", { geohash })),
    registerPushToken: async (token) => void (await session.authed("POST", "/me/push-token", { token })),
    removePushToken: async (token) => void (await session.authed("DELETE", "/me/push-token", { token })),
  };
}

/** Alertas em memória para desenvolver sem a API (sem disparo: a lista começa com o que for passado). */
export function createMockAlertsClient({ alerts = [] }: { alerts?: AlertItem[] } = {}): AlertsClient {
  const items = alerts.map((a) => ({ ...a }));
  let prefs: AlertPreferences = DEFAULT_ALERT_PREFERENCES;
  return {
    list: async () => items.map((a) => ({ ...a })),
    async markSeen(id) {
      const found = items.find((a) => a.id === id);
      if (!found) throw new Error("Alerta não encontrado");
      found.seenAt ??= new Date().toISOString();
    },
    getPreferences: async () => prefs,
    async savePreferences(next) {
      const firstError = Object.values(validateAlertPreferences(next))[0];
      if (firstError) throw new Error(firstError);
      prefs = next;
      return prefs;
    },
    async updateLocation(geohash) {
      if (!isValidGeohash(geohash, ALERT_GEOHASH_PRECISION)) throw new Error("Geohash inválido");
    },
    registerPushToken: async () => {},
    removePushToken: async () => {},
  };
}

import * as Location from "expo-location";
import type { LatLng } from "@miaucha/shared";

export type LocationResult = { status: "ok"; coords: LatLng } | { status: "denied"; canAskAgain: boolean } | { status: "unavailable" };

type Position = { coords: { latitude: number; longitude: number } };

/** Subconjunto do expo-location usado aqui; injetável nos testes. */
export type LocationApi = {
  requestForegroundPermissionsAsync(): Promise<{ granted: boolean; canAskAgain: boolean }>;
  getCurrentPositionAsync(options: { accuracy: number }): Promise<Position>;
  getLastKnownPositionAsync(options: { maxAge: number }): Promise<Position | null>;
  /** Só confere a permissão, sem abrir o diálogo (usado com `ask: false`). */
  getForegroundPermissionsAsync?(): Promise<{ granted: boolean; canAskAgain: boolean }>;
};

const LAST_KNOWN_MAX_AGE_MS = 10 * 60 * 1000;

const toLatLng = ({ coords }: Position): LatLng => ({ lat: coords.latitude, lng: coords.longitude });

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

/**
 * Localização atual com permissão só de primeiro plano (o "sempre" fica para a S5).
 * Nunca lança: a tela decide o que mostrar a partir do status.
 * Precisão "Balanced" (~100 m) basta: o ponto público é deslocado ~150 m de qualquer jeito.
 */
export function createLocationProvider(api: LocationApi = Location, { timeoutMs = 15_000, ask = true } = {}) {
  return async (): Promise<LocationResult> => {
    try {
      // `ask: false`: tarefas que rodam sozinhas (ex.: região dos alertas) nunca abrem o diálogo do sistema.
      const permission =
        ask || !api.getForegroundPermissionsAsync
          ? await api.requestForegroundPermissionsAsync()
          : await api.getForegroundPermissionsAsync();
      if (!permission.granted) return { status: "denied", canAskAgain: permission.canAskAgain };
    } catch {
      return { status: "denied", canAskAgain: true };
    }
    try {
      return { status: "ok", coords: toLatLng(await withTimeout(api.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }), timeoutMs)) };
    } catch {
      // GPS desligado ou sem sinal: a última posição conhecida (até 10 min) ainda serve.
    }
    try {
      const last = await api.getLastKnownPositionAsync({ maxAge: LAST_KNOWN_MAX_AGE_MS });
      if (last) return { status: "ok", coords: toLatLng(last) };
    } catch {
      // segue para unavailable
    }
    return { status: "unavailable" };
  };
}

export type GetLocation = ReturnType<typeof createLocationProvider>;

/** Provedor padrão do app (expo-location de verdade). */
export const getCurrentLocation = createLocationProvider();

/** Posição só se a permissão já foi dada (não pergunta nada ao usuário). */
export const getLocationIfAllowed = createLocationProvider(Location, { ask: false });

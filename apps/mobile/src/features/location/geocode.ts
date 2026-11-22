import * as Location from "expo-location";
import type { LatLng } from "@miaucha/shared";

/** Subconjunto do expo-location usado aqui; injetável nos testes. */
export type GeocodeApi = {
  requestForegroundPermissionsAsync(): Promise<{ granted: boolean; canAskAgain: boolean }>;
  geocodeAsync(address: string): Promise<{ latitude: number; longitude: number }[]>;
};

/**
 * Endereço digitado → ponto, pelo geocodificador do aparelho. No Android ele exige a permissão de
 * localização em primeiro plano. Nunca lança: sem resultado, sem permissão ou com erro, devolve null.
 */
export function createGeocoder(api: GeocodeApi = Location) {
  return async (address: string): Promise<LatLng | null> => {
    try {
      const permission = await api.requestForegroundPermissionsAsync();
      if (!permission.granted) return null;
      const [first] = await api.geocodeAsync(address);
      return first ? { lat: first.latitude, lng: first.longitude } : null;
    } catch {
      return null;
    }
  };
}

export const geocodeAddress = createGeocoder();

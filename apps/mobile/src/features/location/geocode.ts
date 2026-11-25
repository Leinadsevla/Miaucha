import * as Location from "expo-location";
import { distanceMeters, type LatLng } from "@miaucha/shared";

/** Endereço procurado só vale até esta distância de quem procura: a busca fica nas cidades próximas. */
export const NEARBY_GEOCODE_KM = 50;

type Point = { latitude: number; longitude: number };

/** Subconjunto do expo-location usado aqui; injetável nos testes. */
export type GeocodeApi = {
  requestForegroundPermissionsAsync(): Promise<{ granted: boolean; canAskAgain: boolean }>;
  geocodeAsync(address: string): Promise<Point[]>;
  reverseGeocodeAsync(location: Point): Promise<{ city: string | null; subregion: string | null; region: string | null }[]>;
};

const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

const toLatLng = ({ latitude, longitude }: Point): LatLng => ({ lat: latitude, lng: longitude });

/** "Rua Augusta, 100" → "Rua Augusta, 100, São Paulo, SP", com a cidade de quem procura (se não foi digitada). */
async function withNearbyCity(api: GeocodeApi, address: string, near: LatLng): Promise<string> {
  try {
    const [place] = await api.reverseGeocodeAsync({ latitude: near.lat, longitude: near.lng });
    // No Android a cidade às vezes vem em `subregion`.
    const city = place?.city ?? place?.subregion;
    if (!city || normalize(address).includes(normalize(city))) return address;
    return [address, city, place?.region].filter(Boolean).join(", ");
  } catch {
    return address;
  }
}

/**
 * Endereço digitado → ponto, pelo geocodificador do aparelho (no Android ele exige a permissão de
 * localização). Com `near`, procura na cidade de quem está procurando, escolhe o resultado mais próximo
 * e recusa o que passa de `NEARBY_GEOCODE_KM`. Nunca lança: sem resultado, sem permissão ou com erro, devolve null.
 */
export function createGeocoder(api: GeocodeApi = Location) {
  return async (address: string, near?: LatLng | null): Promise<LatLng | null> => {
    try {
      const permission = await api.requestForegroundPermissionsAsync();
      if (!permission.granted) return null;
      if (!near) {
        const [first] = await api.geocodeAsync(address);
        return first ? toLatLng(first) : null;
      }
      const results = (await api.geocodeAsync(await withNearbyCity(api, address, near))).map(toLatLng);
      const nearby = results
        .map((point) => ({ point, meters: distanceMeters(near, point) }))
        .filter(({ meters }) => meters <= NEARBY_GEOCODE_KM * 1000)
        .sort((a, b) => a.meters - b.meters);
      return nearby[0]?.point ?? null;
    } catch {
      return null;
    }
  };
}

export const geocodeAddress = createGeocoder();

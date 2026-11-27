import type { GeocodeApi } from "./geocode";

/**
 * Photon: geocodificador aberto com dados do OpenStreetMap (a mesma base do mapa), sem chave.
 * Usado só na web, onde o `expo-location` não geocodifica.
 */
export const PHOTON_URL = "https://photon.komoot.io";

type FetchJson = (url: string) => Promise<{ ok: boolean; json(): Promise<unknown> }>;
type Feature = { geometry?: { coordinates?: [number, number] }; properties?: { city?: string; county?: string; state?: string } };

/** ~1 km: o serviço externo só fica sabendo a região de quem procura, não o ponto exato (como o AL-06). */
const approx = (n: number) => Math.round(n * 100) / 100;

export function createPhotonGeocodeApi(fetchJson: FetchJson = (url) => fetch(url)): GeocodeApi {
  async function features(url: string): Promise<Feature[]> {
    const response = await fetchJson(url);
    if (!response.ok) return [];
    const body = (await response.json()) as { features?: Feature[] };
    return body.features ?? [];
  }

  return {
    requestForegroundPermissionsAsync: async () => ({ granted: true, canAskAgain: true }),
    async geocodeAsync(address) {
      const found = await features(`${PHOTON_URL}/api/?q=${encodeURIComponent(address)}&limit=5`);
      return found.flatMap((f) => {
        const [longitude, latitude] = f.geometry?.coordinates ?? [];
        return latitude === undefined || longitude === undefined ? [] : [{ latitude, longitude }];
      });
    },
    async reverseGeocodeAsync({ latitude, longitude }) {
      const found = await features(`${PHOTON_URL}/reverse?lat=${approx(latitude)}&lon=${approx(longitude)}`);
      return found.map(({ properties: p = {} }) => ({ city: p.city ?? null, subregion: p.county ?? null, region: p.state ?? null }));
    },
  };
}

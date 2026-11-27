import { createPhotonGeocodeApi, PHOTON_URL } from "../photon";

const feature = (lng: number, lat: number, props: Record<string, string> = {}) => ({ geometry: { coordinates: [lng, lat] }, properties: props });

function fakeFetch(body: unknown, ok = true) {
  return jest.fn(async (_url: string) => ({ ok, json: async () => body }));
}

describe("createPhotonGeocodeApi (busca de endereço na web)", () => {
  it("não precisa de permissão no navegador", async () => {
    const api = createPhotonGeocodeApi(fakeFetch({ features: [] }));
    expect(await api.requestForegroundPermissionsAsync()).toEqual({ granted: true, canAskAgain: true });
  });

  it("endereço → pontos (o GeoJSON vem em [lng, lat])", async () => {
    const fetch = fakeFetch({ features: [feature(-46.65, -23.55), feature(-46.7, -23.6)] });
    const api = createPhotonGeocodeApi(fetch);
    expect(await api.geocodeAsync("Rua Augusta, 100")).toEqual([
      { latitude: -23.55, longitude: -46.65 },
      { latitude: -23.6, longitude: -46.7 },
    ]);
    expect(fetch).toHaveBeenCalledWith(`${PHOTON_URL}/api/?q=Rua%20Augusta%2C%20100&limit=5`);
  });

  it("ponto → cidade e estado; a posição vai arredondada (~1 km), nunca a exata", async () => {
    const fetch = fakeFetch({ features: [feature(-46.63, -23.55, { city: "São Paulo", county: "São Paulo", state: "São Paulo" })] });
    const api = createPhotonGeocodeApi(fetch);
    expect(await api.reverseGeocodeAsync({ latitude: -23.550512, longitude: -46.633308 })).toEqual([
      { city: "São Paulo", subregion: "São Paulo", region: "São Paulo" },
    ]);
    expect(fetch).toHaveBeenCalledWith(`${PHOTON_URL}/reverse?lat=-23.55&lon=-46.63`);
  });

  it("resposta com erro vira lista vazia (o geocoder trata como 'não encontrado')", async () => {
    const api = createPhotonGeocodeApi(fakeFetch({}, false));
    expect(await api.geocodeAsync("x")).toEqual([]);
    expect(await api.reverseGeocodeAsync({ latitude: 0, longitude: 0 })).toEqual([]);
  });
});

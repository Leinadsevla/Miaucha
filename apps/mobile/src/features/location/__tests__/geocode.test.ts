import { NEARBY_GEOCODE_KM, createGeocoder, type GeocodeApi } from "../geocode";

const here = { lat: -23.5505, lng: -46.6333 }; // centro de São Paulo
const augustaSP = { latitude: -23.5558, longitude: -46.6622 };
const augustaLonge = { latitude: -22.9068, longitude: -43.1729 }; // Rio, ~360 km

function api(overrides: Partial<GeocodeApi> = {}) {
  return {
    requestForegroundPermissionsAsync: jest.fn(async () => ({ granted: true, canAskAgain: true })),
    geocodeAsync: jest.fn(async (_q: string) => [augustaSP]),
    reverseGeocodeAsync: jest.fn(async () => [{ city: "São Paulo", subregion: null, region: "SP" }]),
    ...overrides,
  } as GeocodeApi & { geocodeAsync: jest.Mock; reverseGeocodeAsync: jest.Mock; requestForegroundPermissionsAsync: jest.Mock };
}

describe("createGeocoder", () => {
  it("pede a permissão (exigida no Android) e devolve o ponto encontrado", async () => {
    const fake = api();
    expect(await createGeocoder(fake)("Rua Augusta, 100")).toEqual({ lat: augustaSP.latitude, lng: augustaSP.longitude });
    expect(fake.requestForegroundPermissionsAsync).toHaveBeenCalled();
  });

  it("perto de alguém, acrescenta a cidade e o estado dele quando não foram digitados", async () => {
    const fake = api();
    await createGeocoder(fake)("Rua Augusta, 100", here);
    expect(fake.geocodeAsync).toHaveBeenCalledWith("Rua Augusta, 100, São Paulo, SP");
  });

  it("não repete a cidade quando ela já está no texto (sem diferenciar acento e maiúscula)", async () => {
    const fake = api();
    await createGeocoder(fake)("rua augusta 100, sao paulo", here);
    expect(fake.geocodeAsync).toHaveBeenCalledWith("rua augusta 100, sao paulo");
  });

  it("no Android a cidade pode vir em subregion", async () => {
    const fake = api({ reverseGeocodeAsync: jest.fn(async () => [{ city: null, subregion: "Campinas", region: "SP" }]) });
    await createGeocoder(fake)("Rua X", here);
    expect(fake.geocodeAsync).toHaveBeenCalledWith("Rua X, Campinas, SP");
  });

  it(`escolhe o resultado mais próximo e recusa o que passa de ${NEARBY_GEOCODE_KM} km`, async () => {
    const both = api({ geocodeAsync: jest.fn(async () => [augustaLonge, augustaSP]) });
    expect(await createGeocoder(both)("Rua Augusta", here)).toEqual({ lat: augustaSP.latitude, lng: augustaSP.longitude });

    const farOnly = api({ geocodeAsync: jest.fn(async () => [augustaLonge]) });
    expect(await createGeocoder(farOnly)("Rua Augusta", here)).toBeNull();
  });

  it("sem localização de referência, aceita o primeiro resultado (não dá para medir a distância)", async () => {
    const fake = api({ geocodeAsync: jest.fn(async () => [augustaLonge]) });
    expect(await createGeocoder(fake)("Rua Augusta", null)).toEqual({ lat: augustaLonge.latitude, lng: augustaLonge.longitude });
    expect(fake.reverseGeocodeAsync).not.toHaveBeenCalled();
  });

  it("sem resultado, com erro, sem permissão, ou se a cidade não puder ser descoberta: nunca lança", async () => {
    expect(await createGeocoder(api({ geocodeAsync: jest.fn(async () => []) }))("x", here)).toBeNull();
    expect(await createGeocoder(api({ geocodeAsync: jest.fn(async () => Promise.reject(new Error("limite"))) }))("x", here)).toBeNull();
    const denied = api({ requestForegroundPermissionsAsync: jest.fn(async () => ({ granted: false, canAskAgain: false })) });
    expect(await createGeocoder(denied)("x", here)).toBeNull();
    expect(denied.geocodeAsync).not.toHaveBeenCalled();
    const noCity = api({ reverseGeocodeAsync: jest.fn(async () => Promise.reject(new Error("x"))) });
    expect(await createGeocoder(noCity)("Rua Augusta, 100", here)).toEqual({ lat: augustaSP.latitude, lng: augustaSP.longitude });
    expect(noCity.geocodeAsync).toHaveBeenCalledWith("Rua Augusta, 100");
  });
});

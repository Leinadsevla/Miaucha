import { parseOccurrenceSearch } from "./search-params";

const ok = (query: Record<string, unknown>) => {
  const result = parseOccurrenceSearch(query);
  if ("error" in result) throw new Error(result.error);
  return result;
};
const error = (query: Record<string, unknown>) => {
  const result = parseOccurrenceSearch(query);
  return "error" in result ? result.error : null;
};

describe("parseOccurrenceSearch", () => {
  it("busca por raio: lat, lng e radiusKm (em metros na saída)", () => {
    expect(ok({ lat: "-23.56", lng: "-46.65", radiusKm: "2.5" })).toEqual({
      area: { kind: "radius", lat: -23.56, lng: -46.65, radiusMeters: 2500 },
      filters: {},
    });
  });

  it("raio padrão de 5 km", () => {
    expect(ok({ lat: "0", lng: "0" }).area).toEqual({ kind: "radius", lat: 0, lng: 0, radiusMeters: 5000 });
  });

  it("raio acima de 30 km, zero ou negativo → erro", () => {
    expect(error({ lat: "0", lng: "0", radiusKm: "30.1" })).toBe("O raio máximo é de 30 km");
    expect(error({ lat: "0", lng: "0", radiusKm: "0" })).toBe("Informe um raio válido");
    expect(error({ lat: "0", lng: "0", radiusKm: "abc" })).toBe("Informe um raio válido");
    expect(ok({ lat: "0", lng: "0", radiusKm: "30" }).area).toMatchObject({ radiusMeters: 30000 });
  });

  it("lat/lng inválidos → erro", () => {
    expect(error({ lat: "91", lng: "0" })).toBe("Coordenadas inválidas");
    expect(error({ lat: "abc", lng: "0" })).toBe("Coordenadas inválidas");
    expect(error({ lat: "", lng: "" })).toBe("Coordenadas inválidas");
  });

  it("sem área → erro explicando as opções", () => {
    expect(error({})).toBe("Informe lat e lng (com radiusKm) ou bbox");
  });

  it("bbox minLng,minLat,maxLng,maxLat", () => {
    expect(ok({ bbox: "-46.7,-23.6,-46.6,-23.5" }).area).toEqual({
      kind: "bbox",
      minLng: -46.7,
      minLat: -23.6,
      maxLng: -46.6,
      maxLat: -23.5,
    });
  });

  it.each(["-46.7,-23.6,-46.6", "a,b,c,d", "-46.6,-23.6,-46.7,-23.5", "-46.7,-23.5,-46.6,-23.6", "0,-91,1,0", ""])(
    "bbox inválida (%s) → erro",
    (bbox) => {
      expect(error({ bbox })).toBe("bbox inválida: use minLng,minLat,maxLng,maxLat");
    },
  );

  it("filtros opcionais: tipo, espécie e período", () => {
    expect(ok({ bbox: "0,0,1,1", type: "seen", species: "cat", sinceDays: "7" }).filters).toEqual({
      type: "seen",
      species: "cat",
      sinceDays: 7,
    });
  });

  it("filtros inválidos → erro", () => {
    expect(error({ bbox: "0,0,1,1", type: "stolen" })).toBe("Tipo inválido");
    expect(error({ bbox: "0,0,1,1", species: "fish" })).toBe("Espécie inválida");
    expect(ok({ bbox: "0,0,1,1", species: "rabbit" }).filters).toMatchObject({ species: "rabbit" });
    expect(ok({ bbox: "0,0,1,1", species: "others" }).filters).toMatchObject({ species: "others" });
    expect(error({ bbox: "0,0,1,1", sinceDays: "0" })).toBe("Período inválido");
    expect(error({ bbox: "0,0,1,1", sinceDays: "2.5" })).toBe("Período inválido");
    expect(error({ bbox: "0,0,1,1", sinceDays: "400" })).toBe("Período inválido");
  });

  it("parâmetro repetido (array na query) conta como inválido", () => {
    expect(error({ lat: ["1", "2"], lng: "0" })).toBe("Coordenadas inválidas");
  });
});

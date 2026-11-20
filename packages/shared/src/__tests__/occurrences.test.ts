import {
  MAX_OCCURRENCE_PHOTOS,
  OCCURRENCE_EXPIRY_DAYS,
  isOccurrenceExpired,
  occurrenceExpiryCutoff,
  validateOccurrence,
  type OccurrenceInput,
} from "../occurrences";

const valid: OccurrenceInput = {
  type: "lost",
  species: "dog",
  petName: "Thor",
  breed: "",
  color: "",
  description: "",
  approxAddress: "",
  lat: -23.56,
  lng: -46.65,
};

describe("validateOccurrence", () => {
  it("perdido com nome, espécie e local é válido", () => {
    expect(validateOccurrence(valid)).toEqual({});
  });

  it("nome do pet é obrigatório para perdido", () => {
    expect(validateOccurrence({ ...valid, petName: "  " })).toEqual({ petName: "Informe o nome do pet" });
  });

  it.each(["seen", "found"] as const)("nome é opcional para %s", (type) => {
    expect(validateOccurrence({ ...valid, type, petName: "" })).toEqual({});
  });

  it("tipo e espécie precisam ser válidos", () => {
    expect(validateOccurrence({ ...valid, type: "stolen" as never, species: "peixe" as never })).toEqual({
      type: "Escolha o tipo: perdido, avistado ou encontrado",
      species: "Escolha cão ou gato",
    });
  });

  it("limita o tamanho dos textos", () => {
    expect(
      validateOccurrence({
        ...valid,
        petName: "a".repeat(41),
        breed: "a".repeat(61),
        color: "a".repeat(61),
        approxAddress: "a".repeat(121),
        description: "a".repeat(501),
      }),
    ).toEqual({
      petName: "Use até 40 caracteres",
      breed: "Use até 60 caracteres",
      color: "Use até 60 caracteres",
      approxAddress: "Use até 120 caracteres",
      description: "Use até 500 caracteres",
    });
  });

  it("textos no limite passam", () => {
    expect(validateOccurrence({ ...valid, description: "a".repeat(500), approxAddress: "a".repeat(120) })).toEqual({});
  });

  it("lat/lng inválidos ou ausentes → erro de local", () => {
    const message = "Não foi possível obter o local. Ative a localização e tente de novo.";
    expect(validateOccurrence({ ...valid, lat: 95 })).toEqual({ location: message });
    expect(validateOccurrence({ ...valid, lng: Number.NaN })).toEqual({ location: message });
    expect(validateOccurrence({ ...valid, lat: undefined as never })).toEqual({ location: message });
  });
});

describe("expiração (NF-03)", () => {
  const now = new Date("2026-11-20T12:00:00Z");
  const daysAgo = (d: number) => new Date(now.getTime() - d * 24 * 3600 * 1000);

  it("expira com 30 dias sem atualização", () => {
    expect(OCCURRENCE_EXPIRY_DAYS).toBe(30);
    expect(isOccurrenceExpired(daysAgo(29), now)).toBe(false);
    expect(isOccurrenceExpired(daysAgo(29.99), now)).toBe(false);
    expect(isOccurrenceExpired(daysAgo(30), now)).toBe(true);
    expect(isOccurrenceExpired(daysAgo(45), now)).toBe(true);
  });

  it("o corte usado na consulta é exatamente 30 dias antes de agora", () => {
    expect(occurrenceExpiryCutoff(now)).toEqual(daysAgo(30));
    // Coerente com isOccurrenceExpired: atualizada depois do corte = ativa.
    expect(isOccurrenceExpired(new Date(occurrenceExpiryCutoff(now).getTime() + 1), now)).toBe(false);
  });
});

it("até 5 fotos por ocorrência", () => {
  expect(MAX_OCCURRENCE_PHOTOS).toBe(5);
});

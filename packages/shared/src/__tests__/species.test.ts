import { OTHER_SPECIES, SPECIES, isSpecies, matchesSpeciesFilter, speciesLabel } from "../species";
import { validatePet } from "../pets";
import { validateOccurrence } from "../occurrences";

describe("espécies", () => {
  it("cão e gato, mais pássaro, coelho, roedor, réptil e outro animal (em 'Outros')", () => {
    expect(SPECIES).toEqual(["dog", "cat", "bird", "rabbit", "rodent", "reptile", "other"]);
    expect(OTHER_SPECIES).toEqual(["bird", "rabbit", "rodent", "reptile", "other"]);
  });

  it("nomes em português", () => {
    expect(SPECIES.map(speciesLabel)).toEqual(["Cão", "Gato", "Pássaro", "Coelho", "Roedor", "Réptil", "Outro animal"]);
  });

  it("isSpecies só aceita os valores conhecidos", () => {
    expect(isSpecies("rabbit")).toBe(true);
    expect(isSpecies("dragon")).toBe(false);
    expect(isSpecies(undefined)).toBe(false);
  });

  it("filtro 'others' junta tudo que não é cão nem gato", () => {
    expect(matchesSpeciesFilter("bird", "others")).toBe(true);
    expect(matchesSpeciesFilter("dog", "others")).toBe(false);
    expect(matchesSpeciesFilter("cat", "cat")).toBe(true);
    expect(matchesSpeciesFilter("cat", "dog")).toBe(false);
  });

  it("cadastro de pet e ocorrência aceitam as espécies novas e recusam as desconhecidas", () => {
    const pet = { name: "Piu", breed: "", color: "", approxAge: "" };
    expect(validatePet({ ...pet, species: "bird" })).toEqual({});
    expect(validatePet({ ...pet, species: "dragon" as never })).toEqual({ species: "Escolha a espécie do animal" });

    const occurrence = { type: "seen" as const, petName: "", breed: "", color: "", approxAddress: "", description: "", lat: -23.5, lng: -46.6 };
    expect(validateOccurrence({ ...occurrence, species: "reptile" })).toEqual({});
    expect(validateOccurrence({ ...occurrence, species: "dragon" as never }).species).toBe("Escolha a espécie do animal");
  });
});

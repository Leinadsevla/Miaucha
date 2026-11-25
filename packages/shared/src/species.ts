/** Espécies aceitas. Cão e gato têm botão próprio; as demais ficam em "Outros". */
export const SPECIES = ["dog", "cat", "bird", "rabbit", "rodent", "reptile", "other"] as const;
export type Species = (typeof SPECIES)[number];

export const OTHER_SPECIES = SPECIES.filter((s) => s !== "dog" && s !== "cat") as Exclude<Species, "dog" | "cat">[];

/** Filtro de busca: uma espécie ou o grupo "others" (tudo que não é cão nem gato). */
export type SpeciesFilter = Species | "others";

export const SPECIES_MESSAGE = "Escolha a espécie do animal";

const LABELS: Record<Species, string> = {
  dog: "Cão",
  cat: "Gato",
  bird: "Pássaro",
  rabbit: "Coelho",
  rodent: "Roedor",
  reptile: "Réptil",
  other: "Outro animal",
};

export function speciesLabel(species: Species): string {
  return LABELS[species];
}

export function isSpecies(value: unknown): value is Species {
  return typeof value === "string" && (SPECIES as readonly string[]).includes(value);
}

export function isSpeciesFilter(value: unknown): value is SpeciesFilter {
  return value === "others" || isSpecies(value);
}

export function matchesSpeciesFilter(species: Species, filter: SpeciesFilter): boolean {
  return filter === "others" ? species !== "dog" && species !== "cat" : species === filter;
}

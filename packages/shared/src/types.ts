import type { OccurrenceType } from "./theme";

export type Species = "dog" | "cat";

/** Ocorrência como a API pública devolve: só o ponto deslocado (MP-07) e pseudônimo (CH-02). */
export type PublicOccurrence = {
  id: string;
  type: OccurrenceType;
  species: Species;
  petName: string | null;
  breed: string | null;
  color: string | null;
  description: string | null;
  photoUrls: string[];
  publicLocation: { lat: number; lng: number };
  approxAddress: string | null;
  authorPseudonym: string;
  createdAt: string;
};

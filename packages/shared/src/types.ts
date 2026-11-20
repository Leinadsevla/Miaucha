import type { OccurrenceType } from "./theme";

export type Species = "dog" | "cat";

export type OccurrenceStatus = "open" | "resolved";

/**
 * Ocorrência como a API pública devolve: só o ponto deslocado (MP-07) e o pseudônimo do autor (CH-02).
 * Nunca a coordenada real, o nome real, o e-mail ou o telefone.
 */
export type PublicOccurrence = {
  id: string;
  type: OccurrenceType;
  species: Species;
  petName: string | null;
  breed: string | null;
  color: string | null;
  description: string | null;
  /** URLs assinadas que expiram (NF-05). Nas buscas vem só a foto de capa; no detalhe, todas. */
  photoUrls: string[];
  publicLocation: { lat: number; lng: number };
  approxAddress: string | null;
  authorPseudonym: string;
  status: OccurrenceStatus;
  /** Se quem pediu é o autor (pode marcar como resolvida). */
  isMine: boolean;
  createdAt: string;
  /** Só na busca por raio: distância até o ponto público, em metros. */
  distanceMeters?: number;
};

import { isValidLatLng } from "./geo";
import { MAX_PET_PHOTOS } from "./pets";
import { OCCURRENCE_TYPES, type OccurrenceType } from "./theme";
import type { Species } from "./types";

/** Dados de uma nova ocorrência. `lat`/`lng` são o ponto real: só a API os vê; nunca saem dela (MP-07). */
export type OccurrenceInput = {
  type: OccurrenceType;
  species: Species;
  petName: string;
  breed: string;
  color: string;
  description: string;
  /** Endereço aproximado digitado pelo usuário (ex.: "Av. Paulista, perto do MASP"). */
  approxAddress: string;
  lat: number;
  lng: number;
  /** Pet do próprio autor ("registrar meu pet como perdido"): a API completa os dados que faltarem. */
  petId?: string;
};

export type OccurrenceErrors = Partial<Record<Exclude<keyof OccurrenceInput, "lat" | "lng" | "petId"> | "location", string>>;

export const MAX_OCCURRENCE_PHOTOS = MAX_PET_PHOTOS;
/** NF-03: ocorrência sem atualização por este tempo deixa de aparecer nas buscas. */
export const OCCURRENCE_EXPIRY_DAYS = 30;
/** Raio máximo da busca por proximidade (MP-02). */
export const MAX_SEARCH_RADIUS_KM = 20;
/** Máximo de ocorrências devolvidas por busca. */
export const OCCURRENCE_SEARCH_LIMIT = 200;

const LIMITS = { petName: 40, breed: 60, color: 60, approxAddress: 120, description: 500 } as const;

export const OCCURRENCE_MESSAGES = {
  type: "Escolha o tipo: perdido, avistado ou encontrado",
  species: "Escolha cão ou gato",
  petName: "Informe o nome do pet",
  location: "Não foi possível obter o local. Ative a localização e tente de novo.",
};

const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");

export function validateOccurrence(input: OccurrenceInput): OccurrenceErrors {
  const errors: OccurrenceErrors = {};
  if (!(OCCURRENCE_TYPES as readonly string[]).includes(input.type)) errors.type = OCCURRENCE_MESSAGES.type;
  if (input.species !== "dog" && input.species !== "cat") errors.species = OCCURRENCE_MESSAGES.species;
  // Quem perdeu sabe o nome; quem avistou ou encontrou normalmente não.
  if (input.type === "lost" && !text(input.petName)) errors.petName = OCCURRENCE_MESSAGES.petName;
  for (const field of Object.keys(LIMITS) as (keyof typeof LIMITS)[]) {
    if (!errors[field] && text(input[field]).length > LIMITS[field]) errors[field] = `Use até ${LIMITS[field]} caracteres`;
  }
  if (!isValidLatLng(input.lat, input.lng)) errors.location = OCCURRENCE_MESSAGES.location;
  return errors;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Ocorrências atualizadas antes deste instante estão expiradas (NF-03). */
export function occurrenceExpiryCutoff(now: Date = new Date()): Date {
  return new Date(now.getTime() - OCCURRENCE_EXPIRY_DAYS * DAY_MS);
}

export function isOccurrenceExpired(updatedAt: Date, now: Date = new Date()): boolean {
  return updatedAt.getTime() <= occurrenceExpiryCutoff(now).getTime();
}

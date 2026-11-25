import type { FieldErrors } from "./auth";
import { SPECIES_MESSAGE, isSpecies, type Species } from "./species";

export type PetInput = { name: string; species: Species; breed: string; color: string; approxAge: string };

/** Pet como a API devolve ao dono. Fotos só por URL assinada que expira (NF-05). */
export type MyPet = {
  id: string;
  name: string;
  species: Species;
  breed: string | null;
  color: string | null;
  approxAge: string | null;
  photos: { id: string; url: string }[];
};

export const PHOTO_CONTENT_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export type PhotoContentType = (typeof PHOTO_CONTENT_TYPES)[number];
export const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
export const MAX_PET_PHOTOS = 5;

const MAX_NAME = 40;
const MAX_TEXT = 60;

export function isAllowedPhotoType(contentType: string): contentType is PhotoContentType {
  return (PHOTO_CONTENT_TYPES as readonly string[]).includes(contentType);
}

export function validatePet(input: PetInput): FieldErrors<PetInput> {
  const errors: FieldErrors<PetInput> = {};
  const name = input.name.trim();
  if (!name) errors.name = "Informe o nome do pet";
  else if (name.length > MAX_NAME) errors.name = `Use até ${MAX_NAME} caracteres`;
  if (!isSpecies(input.species)) errors.species = SPECIES_MESSAGE;
  for (const field of ["breed", "color", "approxAge"] as const) {
    if (input[field].trim().length > MAX_TEXT) errors[field] = `Use até ${MAX_TEXT} caracteres`;
  }
  return errors;
}

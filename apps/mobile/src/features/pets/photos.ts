import { MAX_PHOTO_BYTES, isAllowedPhotoType, type PhotoContentType } from "@miaucha/shared";

/** Foto escolhida no aparelho (subconjunto do asset do expo-image-picker). */
export type PickedPhoto = { uri: string; mimeType?: string | null; fileSize?: number | null };

const BY_EXTENSION: Record<string, PhotoContentType> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };

/** O picker nem sempre informa o mimeType; nesse caso, vale a extensão do arquivo. */
export function photoContentType(photo: PickedPhoto): PhotoContentType | null {
  if (photo.mimeType && isAllowedPhotoType(photo.mimeType)) return photo.mimeType;
  if (photo.mimeType) return null;
  const extension = photo.uri.split(/[?#]/)[0].split(".").pop()?.toLowerCase() ?? "";
  return BY_EXTENSION[extension] ?? null;
}

/** Mensagem de erro para mostrar na tela, ou null se a foto pode ser enviada. A API confere de novo. */
export function checkPhoto(photo: PickedPhoto): string | null {
  if (!photoContentType(photo)) return "Envie uma foto JPG, PNG ou WebP";
  if (photo.fileSize && photo.fileSize > MAX_PHOTO_BYTES) return "A foto passa de 10 MB";
  return null;
}

import type { PhotoContentType } from "@miaucha/shared";

/** Quantos bytes do início do arquivo bastam para reconhecer os formatos aceitos. */
export const SIGNATURE_BYTES = 12;

const startsWith = (data: Uint8Array, signature: number[], offset = 0) =>
  data.length >= offset + signature.length && signature.every((b, i) => data[offset + i] === b);

const ascii = (s: string) => [...s].map((c) => c.charCodeAt(0));

/** Tipo real do arquivo pela assinatura (magic bytes), sem confiar no Content-Type declarado pelo cliente. */
export function detectImageType(head: Uint8Array): PhotoContentType | null {
  if (startsWith(head, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (startsWith(head, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (startsWith(head, ascii("RIFF")) && startsWith(head, ascii("WEBP"), 8)) return "image/webp";
  return null;
}

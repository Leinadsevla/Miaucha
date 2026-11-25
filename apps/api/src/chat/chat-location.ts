import { createHmac } from "node:crypto";
import { encodeGeohash, publicPoint, type LatLng } from "@miaucha/shared";

/** Área (geohash de 6 letras, ~1 km) em que o deslocamento de quem envia fica fixo. */
const AREA_PRECISION = 6;

/**
 * Localização enviada no chat (CH-05): o ponto real deslocado como em MP-07, mas com o deslocamento fixo para
 * cada pessoa e área. Um sorteio novo a cada envio deixaria achar o ponto real pela média de vários envios.
 * O deslocamento vem de um HMAC com segredo do servidor: sem ele, quem lê o código não consegue desfazê-lo.
 */
export function chatLocationPoint(secret: string, senderId: string, point: LatLng): LatLng {
  const area = encodeGeohash(point.lat, point.lng, AREA_PRECISION);
  const digest = createHmac("sha256", secret).update(`chat-location:${senderId}:${area}`).digest();
  let draw = 0;
  const random = () => digest.readUInt32BE(4 * draw++) / 2 ** 32;
  return publicPoint(point.lat, point.lng, random);
}

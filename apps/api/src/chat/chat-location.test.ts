import { decodeGeohash, distanceMeters, encodeGeohash, PUBLIC_OFFSET_MAX_METERS, PUBLIC_OFFSET_MIN_METERS } from "@miaucha/shared";
import { chatLocationPoint } from "./chat-location";

const casa = { lat: -23.5505, lng: -46.6333 };

describe("chatLocationPoint (CH-05)", () => {
  it("desloca o ponto entre 75 e 190 m do real", () => {
    for (let i = 0; i < 50; i++) {
      const d = distanceMeters(casa, chatLocationPoint("segredo", `usuario-${i}`, casa));
      expect(d).toBeGreaterThanOrEqual(PUBLIC_OFFSET_MIN_METERS - 1);
      expect(d).toBeLessThanOrEqual(PUBLIC_OFFSET_MAX_METERS + 1);
    }
  });

  it("enviar de novo do mesmo lugar dá o mesmo ponto (não dá para achar o real pela média)", () => {
    expect(chatLocationPoint("segredo", "ana", casa)).toEqual(chatLocationPoint("segredo", "ana", casa));
  });

  it("o deslocamento depende de quem envia e do segredo do servidor", () => {
    const ana = chatLocationPoint("segredo", "ana", casa);
    expect(chatLocationPoint("segredo", "bia", casa)).not.toEqual(ana);
    expect(chatLocationPoint("outro-segredo", "ana", casa)).not.toEqual(ana);
  });

  it("dois lugares a ~400 m (mesma área de 1 km) têm deslocamentos diferentes: saber um não revela o outro", () => {
    const { center } = decodeGeohash(encodeGeohash(-23.5505, -46.6333, 6));
    const padaria = { lat: center.lat - 200 / 111_195, lng: center.lng };
    const casaPerto = { lat: center.lat + 200 / 111_195, lng: center.lng };
    expect(encodeGeohash(padaria.lat, padaria.lng, 6)).toBe(encodeGeohash(casaPerto.lat, casaPerto.lng, 6));
    const shift = (p: { lat: number; lng: number }) => {
      const s = chatLocationPoint("segredo", "ana", p);
      return { dLat: s.lat - p.lat, dLng: s.lng - p.lng };
    };
    const a = shift(padaria);
    const b = shift(casaPerto);
    expect(Math.abs(a.dLat - b.dLat) + Math.abs(a.dLng - b.dLng)).toBeGreaterThan(1e-5);
  });
});

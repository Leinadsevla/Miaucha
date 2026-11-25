import { distanceMeters, PUBLIC_OFFSET_MAX_METERS, PUBLIC_OFFSET_MIN_METERS } from "@miaucha/shared";
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
});

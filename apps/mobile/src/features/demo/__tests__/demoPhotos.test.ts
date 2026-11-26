import { demoPhotoUri, DEMO_PHOTOS } from "../demoPhotos";
import { createMockOccurrencesClient } from "@/features/occurrences/occurrencesClient";

describe("fotos dos dados de exemplo", () => {
  it("são quatro fotos embutidas no app (dois cães e dois gatos)", () => {
    expect(Object.keys(DEMO_PHOTOS).sort()).toEqual(["beagle", "blackWhiteCat", "goldenDog", "orangeCat"]);
  });

  it("demoPhotoUri devolve o endereço da foto; se o aparelho não resolver, devolve vazio (o cartão mostra o ícone)", () => {
    expect(demoPhotoUri("goldenDog", () => ({ uri: "http://localhost/cao.jpg" }))).toBe("http://localhost/cao.jpg");
    expect(
      demoPhotoUri("goldenDog", () => {
        throw new Error("sem registro");
      }),
    ).toBe("");
  });

  it("os exemplos do modo demonstração têm foto, e cada um a sua", async () => {
    const client = createMockOccurrencesClient({ photo: (key) => `foto:${key}` });
    const list = await client.nearby({ lat: -23.56, lng: -46.65, radiusKm: 30 });
    expect(list).toHaveLength(4);
    for (const o of list) expect(o.photoUrls).toHaveLength(1);
    expect(new Set(list.map((o) => o.photoUrls[0])).size).toBe(4);
    expect(list.find((o) => o.petName === "Thor")?.photoUrls).toEqual(["foto:goldenDog"]);
  });
});

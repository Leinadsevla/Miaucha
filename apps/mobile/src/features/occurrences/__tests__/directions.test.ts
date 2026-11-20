import { directionsOptions, openDirections, type AlertButton } from "../directions";

const point = { lat: -23.561987, lng: -46.656123 };

describe("directionsOptions (MP-06)", () => {
  it("Android: Google Maps e Waze com rota até o ponto", () => {
    expect(directionsOptions(point, "android")).toEqual([
      { label: "Google Maps", url: "https://www.google.com/maps/dir/?api=1&destination=-23.561987,-46.656123" },
      { label: "Waze", url: "https://waze.com/ul?ll=-23.561987,-46.656123&navigate=yes" },
    ]);
  });

  it("iOS: inclui o Apple Maps primeiro", () => {
    expect(directionsOptions(point, "ios").map((o) => o.label)).toEqual(["Apple Maps", "Google Maps", "Waze"]);
    expect(directionsOptions(point, "ios")[0].url).toBe("https://maps.apple.com/?daddr=-23.561987,-46.656123");
  });
});

describe("openDirections", () => {
  it("mostra as opções e abre o app escolhido", async () => {
    let buttons: AlertButton[] = [];
    const alert = jest.fn((_title: string, _message: string, b: AlertButton[]) => void (buttons = b));
    const openURL = jest.fn(async () => {});
    openDirections(point, { platform: "android", alert, openURL });

    expect(alert).toHaveBeenCalledWith("Como chegar", "O destino é a região aproximada do registro, não o ponto exato.", expect.any(Array));
    expect(buttons.map((b) => b.text)).toEqual(["Google Maps", "Waze", "Cancelar"]);
    buttons[1].onPress?.();
    expect(openURL).toHaveBeenCalledWith("https://waze.com/ul?ll=-23.561987,-46.656123&navigate=yes");
  });

  it("se o app não abrir, não quebra", async () => {
    let buttons: AlertButton[] = [];
    const alert = (_t: string, _m: string, b: AlertButton[]) => void (buttons = b);
    const openURL = jest.fn(async () => {
      throw new Error("No app");
    });
    openDirections(point, { platform: "android", alert, openURL });
    expect(() => buttons[0].onPress?.()).not.toThrow();
    await Promise.resolve();
  });
});

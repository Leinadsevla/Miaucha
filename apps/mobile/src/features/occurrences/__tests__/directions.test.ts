import { createDeviceDirections, directionsOptions, openDirections, type AlertButton } from "../directions";

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

describe("createDeviceDirections (ligação com o Linking do React Native)", () => {
  it("abre o link escolhido chamando o Linking pelo próprio objeto (o openURL real usa `this`)", async () => {
    const opened: string[] = [];
    const Linking = {
      _validateURL(url: string) {
        if (!url.startsWith("https://")) throw new Error("url inválida");
      },
      async openURL(url: string) {
        this._validateURL(url);
        opened.push(url);
      },
    };
    let buttons: { text: string; onPress?: () => void }[] = [];
    const Alert = { alert: (_t: string, _m: string, b: typeof buttons) => void (buttons = b) };

    createDeviceDirections({ Linking, Alert, Platform: { OS: "android" } })({ lat: -23.5, lng: -46.6 });
    buttons.find((b) => b.text === "Waze")!.onPress!();
    await Promise.resolve();

    expect(opened).toEqual(["https://waze.com/ul?ll=-23.5,-46.6&navigate=yes"]);
  });

  it("se o aparelho não conseguir abrir, avisa em vez de quebrar", async () => {
    const alerts: string[] = [];
    let buttons: { text: string; onPress?: () => void }[] = [];
    const Alert = {
      alert: (title: string, _m: string, b?: typeof buttons) => {
        alerts.push(title);
        if (b) buttons = b;
      },
    };
    const Linking = { openURL: async () => Promise.reject(new Error("sem app")) };

    createDeviceDirections({ Linking, Alert, Platform: { OS: "android" } })({ lat: 1, lng: 2 });
    buttons.find((b) => b.text === "Google Maps")!.onPress!();
    await new Promise((r) => setTimeout(r, 0));

    expect(alerts).toEqual(["Como chegar", "Não foi possível abrir o mapa"]);
  });
});

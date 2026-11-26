import { createOpenSettings, WEB_LOCATION_HELP } from "../settings";

describe("createOpenSettings", () => {
  it("no aparelho abre as configurações do app", () => {
    const Linking = { openSettings: jest.fn(async () => {}) };
    const alert = jest.fn();
    createOpenSettings({ os: "android", Linking, alert })();
    expect(Linking.openSettings).toHaveBeenCalled();
    expect(alert).not.toHaveBeenCalled();
  });

  it("no navegador (sem configurações do app) explica como liberar pelo cadeado", () => {
    const Linking = { openSettings: jest.fn(async () => {}) };
    const alert = jest.fn();
    createOpenSettings({ os: "web", Linking, alert })();
    expect(Linking.openSettings).not.toHaveBeenCalled();
    expect(alert).toHaveBeenCalledWith("Liberar a localização", WEB_LOCATION_HELP);
    expect(WEB_LOCATION_HELP).toMatch(/cadeado/);
  });
});

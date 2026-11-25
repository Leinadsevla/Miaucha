import { fireEvent, render, screen } from "@testing-library/react-native";
import type { AlertPreferences } from "@miaucha/shared";
import { AlertPreferencesForm } from "../AlertPreferencesForm";
import type { AlertsClient } from "../alertsClient";

function setup(initial: AlertPreferences = { enabled: true, radiusKm: 3, quietHours: null }, save?: AlertsClient["savePreferences"]) {
  const client = {
    getPreferences: jest.fn(async () => initial),
    savePreferences: jest.fn(save ?? (async (p: AlertPreferences) => p)),
  } as unknown as AlertsClient & { getPreferences: jest.Mock; savePreferences: jest.Mock };
  const props = { client, pushStatus: "Notificações ativas neste aparelho.", geofencing: "expo-go" as const, onEnableGeofencing: jest.fn() };
  return { client, props };
}

describe("AlertPreferencesForm (AL-04)", () => {
  it("carrega as preferências e salva o raio escolhido", async () => {
    const { props, client } = setup();
    await render(<AlertPreferencesForm {...props} />);
    expect(await screen.findByRole("switch", { name: "Receber alertas de pets por perto" })).toHaveProp("value", true);
    expect(screen.getByRole("button", { name: "3 km" })).toBeSelected();

    await fireEvent.press(screen.getByRole("button", { name: "5 km" }));
    await fireEvent.press(screen.getByRole("button", { name: "Salvar preferências" }));
    expect(client.savePreferences).toHaveBeenCalledWith({ enabled: true, radiusKm: 5, quietHours: null });
    expect(await screen.findByText("Preferências salvas")).toBeOnTheScreen();
  });

  it("liga o horário de silêncio (padrão 22:00–07:00, atravessando a meia-noite)", async () => {
    const { props, client } = setup();
    await render(<AlertPreferencesForm {...props} />);
    await fireEvent(await screen.findByRole("switch", { name: "Horário de silêncio" }), "valueChange", true);
    expect(screen.getByLabelText("Início")).toHaveProp("value", "22:00");
    await fireEvent.changeText(screen.getByLabelText("Fim"), "06:30");
    await fireEvent.press(screen.getByRole("button", { name: "Salvar preferências" }));
    expect(client.savePreferences).toHaveBeenCalledWith({ enabled: true, radiusKm: 3, quietHours: { start: "22:00", end: "06:30" } });
  });

  it("horário inválido: mostra o erro e não envia", async () => {
    const { props, client } = setup({ enabled: true, radiusKm: 1, quietHours: { start: "22:00", end: "07:00" } });
    await render(<AlertPreferencesForm {...props} />);
    await fireEvent.changeText(await screen.findByLabelText("Início"), "25:00");
    await fireEvent.press(screen.getByRole("button", { name: "Salvar preferências" }));
    expect(screen.getByText("Use o formato HH:MM (ex.: 22:00)")).toBeOnTheScreen();
    expect(client.savePreferences).not.toHaveBeenCalled();
  });

  it("desligar os alertas", async () => {
    const { props, client } = setup();
    await render(<AlertPreferencesForm {...props} />);
    await fireEvent(await screen.findByRole("switch", { name: "Receber alertas de pets por perto" }), "valueChange", false);
    await fireEvent.press(screen.getByRole("button", { name: "Salvar preferências" }));
    expect(client.savePreferences).toHaveBeenCalledWith({ enabled: false, radiusKm: 3, quietHours: null });
  });

  it("erro da API aparece na tela", async () => {
    const { props } = setup(undefined, async () => {
      throw new Error("Não foi possível falar com o servidor. Verifique sua conexão.");
    });
    await render(<AlertPreferencesForm {...props} />);
    await fireEvent.press(await screen.findByRole("button", { name: "Salvar preferências" }));
    expect(await screen.findByText("Não foi possível falar com o servidor. Verifique sua conexão.")).toBeOnTheScreen();
  });

  it("explica a localização aproximada e o estado do push", async () => {
    const { props } = setup();
    await render(<AlertPreferencesForm {...props} />);
    expect(await screen.findByText(/região aproximada \(cerca de 1 km\)/)).toBeOnTheScreen();
    expect(screen.getByText("Notificações ativas neste aparelho.")).toBeOnTheScreen();
  });

  it("no Expo Go não oferece o alerta com o app fechado (sem pedir a permissão 'sempre')", async () => {
    const { props } = setup();
    await render(<AlertPreferencesForm {...props} />);
    expect(await screen.findByText(/precisa do development build/)).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Ativar alertas com o app fechado" })).toBeNull();
  });

  it("no development build com a flag: explica antes e só então pede a permissão", async () => {
    const { props } = setup();
    await render(<AlertPreferencesForm {...props} geofencing="enabled" />);
    expect(await screen.findByText(/localização "sempre"/)).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Ativar alertas com o app fechado" }));
    expect(props.onEnableGeofencing).toHaveBeenCalled();
  });

  it("erro ao carregar: oferece tentar de novo", async () => {
    let fail = true;
    const { props, client } = setup();
    client.getPreferences.mockImplementation(async () => {
      if (fail) throw new Error("Sem conexão");
      return { enabled: true, radiusKm: 3, quietHours: null };
    });
    await render(<AlertPreferencesForm {...props} />);
    expect(await screen.findByText("Sem conexão")).toBeOnTheScreen();
    fail = false;
    await fireEvent.press(screen.getByRole("button", { name: "Tentar de novo" }));
    expect(await screen.findByRole("button", { name: "Salvar preferências" })).toBeOnTheScreen();
  });
});

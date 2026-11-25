import { fireEvent, render, screen } from "@testing-library/react-native";
import type { AlertItem } from "@miaucha/shared";
import { AlertsScreen, filterAlerts } from "../AlertsScreen";
import type { AlertsClient } from "../alertsClient";

const now = new Date("2026-11-20T12:00:00Z");

const item = (id: string, data: Partial<AlertItem> = {}, occurrence: Partial<AlertItem["occurrence"]> = {}): AlertItem => ({
  id,
  occurrenceId: `occ-${id}`,
  distanceMeters: 800,
  createdAt: "2026-11-20T11:00:00Z",
  seenAt: null,
  ...data,
  occurrence: {
    type: "lost",
    species: "dog",
    petName: `Pet ${id}`,
    breed: "Vira-lata",
    color: "Caramelo",
    approxAddress: "Perto da praça",
    status: "open",
    createdAt: "2026-11-20T10:00:00Z",
    photoUrl: null,
    ...occurrence,
  },
});

function setup(list: AlertsClient["list"] = async () => [item("1"), item("2", { distanceMeters: 2_500, seenAt: "2026-11-20T11:30:00Z" }, { type: "seen", petName: null, species: "cat" })]) {
  const client = { list: jest.fn(list), markSeen: jest.fn(async () => {}) } as unknown as AlertsClient & { list: jest.Mock; markSeen: jest.Mock };
  const props = { client, now, onOpen: jest.fn(), onOpenPreferences: jest.fn() };
  return { client, props };
}

describe("filterAlerts", () => {
  const alerts = [item("a", { distanceMeters: 400 }), item("b", { distanceMeters: 1_000 }), item("c", { distanceMeters: 2_900 }), item("d", { distanceMeters: 4_800 })];
  it.each([
    ["all", ["a", "b", "c", "d"]],
    ["under1", ["a"]],
    ["1to3", ["b", "c"]],
    ["3to5", ["d"]],
  ] as const)("%s → %p", (filter, ids) => {
    expect(filterAlerts(alerts, filter).map((a) => a.id)).toEqual(ids);
  });
});

describe("AlertsScreen (aba Alertas)", () => {
  it("lista os alertas com tipo, nome, distância aproximada e tempo", async () => {
    const { props } = setup();
    await render(<AlertsScreen {...props} />);
    expect(await screen.findByText("Pet 1")).toBeOnTheScreen();
    expect(screen.getByRole("header", { name: "Alertas" })).toBeOnTheScreen();
    expect(screen.getByText("Gato sem nome")).toBeOnTheScreen();
    expect(screen.getByText("Perdido")).toBeOnTheScreen();
    expect(screen.getByText("Avistado")).toBeOnTheScreen();
    expect(screen.getByText("~800 m")).toBeOnTheScreen();
    expect(screen.getByText("~2,5 km")).toBeOnTheScreen();
    expect(screen.getAllByText("1h atrás")).toHaveLength(2);
    expect(screen.getAllByText("Vira-lata · Caramelo")).toHaveLength(2);
    // Só o não visto tem a marca de novo.
    expect(screen.getAllByText("Novo")).toHaveLength(1);
  });

  it("tocar abre o detalhe da ocorrência (AL-08) e marca como visto", async () => {
    const { props, client } = setup();
    await render(<AlertsScreen {...props} />);
    await fireEvent.press(await screen.findByRole("button", { name: /Pet 1/ }));
    expect(props.onOpen).toHaveBeenCalledWith("occ-1");
    expect(client.markSeen).toHaveBeenCalledWith("1");
    expect(screen.queryByText("Novo")).toBeNull();
  });

  it("tocar num alerta já visto não marca de novo", async () => {
    const { props, client } = setup();
    await render(<AlertsScreen {...props} />);
    await fireEvent.press(await screen.findByRole("button", { name: /Gato sem nome/ }));
    expect(props.onOpen).toHaveBeenCalledWith("occ-2");
    expect(client.markSeen).not.toHaveBeenCalled();
  });

  it("filtra pela distância", async () => {
    const { props } = setup();
    await render(<AlertsScreen {...props} />);
    await screen.findByText("Pet 1");
    await fireEvent.press(screen.getByRole("button", { name: "1–3 km" }));
    expect(screen.queryByText("Pet 1")).toBeNull();
    expect(screen.getByText("Gato sem nome")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "< 1 km" }));
    expect(screen.getByText("Pet 1")).toBeOnTheScreen();
    expect(screen.queryByText("Gato sem nome")).toBeNull();
    await fireEvent.press(screen.getByRole("button", { name: "3–5 km" }));
    expect(screen.getByText("Nenhum alerta nesta distância.")).toBeOnTheScreen();
  });

  it("vazio: explica quando os alertas aparecem", async () => {
    const { props } = setup(async () => []);
    await render(<AlertsScreen {...props} />);
    expect(await screen.findByText(/Nenhum alerta por enquanto/)).toBeOnTheScreen();
  });

  it("carregando", async () => {
    const { props } = setup(() => new Promise(() => {}));
    await render(<AlertsScreen {...props} />);
    expect(screen.getByText("Carregando alertas...")).toBeOnTheScreen();
  });

  it("erro: mostra a mensagem e tenta de novo", async () => {
    let fail = true;
    const { props } = setup(async () => {
      if (fail) throw new Error("Não foi possível falar com o servidor. Verifique sua conexão.");
      return [item("1")];
    });
    await render(<AlertsScreen {...props} />);
    expect(await screen.findByText("Não foi possível falar com o servidor. Verifique sua conexão.")).toBeOnTheScreen();
    fail = false;
    await fireEvent.press(screen.getByRole("button", { name: "Tentar de novo" }));
    expect(await screen.findByText("Pet 1")).toBeOnTheScreen();
  });

  it("botão de preferências e aviso sobre o push", async () => {
    const { props } = setup();
    await render(<AlertsScreen {...props} pushNotice="O Expo Go no Android não recebe notificações push." />);
    expect(await screen.findByText("O Expo Go no Android não recebe notificações push.")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Preferências de alerta" }));
    expect(props.onOpenPreferences).toHaveBeenCalled();
  });

  it("recarrega quando o refreshSignal muda", async () => {
    const { props, client } = setup();
    const view = await render(<AlertsScreen {...props} refreshSignal={0} />);
    await screen.findByText("Pet 1");
    await view.rerender(<AlertsScreen {...props} refreshSignal={1} />);
    await screen.findByText("Pet 1");
    expect(client.list).toHaveBeenCalledTimes(2);
  });
});

import { act, fireEvent, render, screen } from "@testing-library/react-native";
import type { PublicOccurrence } from "@miaucha/shared";
import type { LocationResult } from "@/features/location/currentLocation";
import { HomeScreen } from "../HomeScreen";
import type { OccurrencesClient } from "../occurrencesClient";

const now = new Date("2026-11-20T12:00:00Z");

const occ = (id: string, data: Partial<PublicOccurrence> = {}): PublicOccurrence => ({
  id,
  type: "lost",
  species: "dog",
  petName: `Pet ${id}`,
  breed: null,
  color: null,
  description: null,
  photoUrls: [],
  publicLocation: { lat: -23.56, lng: -46.65 },
  approxAddress: null,
  authorPseudonym: "Tutor Laranja 42",
  status: "open",
  isMine: false,
  createdAt: "2026-11-20T10:00:00Z",
  distanceMeters: 300,
  ...data,
});

function setup({
  location = [{ status: "ok", coords: { lat: -23.5, lng: -46.6 } }],
  nearby = async () => [occ("1"), occ("2", { type: "seen", petName: null }), occ("3")],
}: { location?: LocationResult[]; nearby?: OccurrencesClient["nearby"] } = {}) {
  const getLocation = jest.fn(async () => (location.length > 1 ? location.shift()! : location[0]));
  const client = { nearby: jest.fn(nearby) } as unknown as OccurrencesClient & { nearby: jest.Mock };
  const props = { userName: "Ana Souza", getLocation, client, now, onOpen: jest.fn(), onRegister: jest.fn(), onOpenSettings: jest.fn() };
  return { props, getLocation, client };
}

describe("HomeScreen (aba Início)", () => {
  it("busca num raio de 5 km a partir da localização e lista os pets próximos", async () => {
    const { props, client } = setup();
    await render(<HomeScreen {...props} />);

    expect(await screen.findByText("Pet 1")).toBeOnTheScreen();
    expect(client.nearby).toHaveBeenCalledWith({ lat: -23.5, lng: -46.6, radiusKm: 5 });
    expect(screen.getByText("Olá, Ana")).toBeOnTheScreen();
    expect(screen.getByRole("header", { name: "Encontre pets perto de você" })).toBeOnTheScreen();
    expect(screen.getByText("Sem nome")).toBeOnTheScreen();
    expect(screen.getAllByText("300 m")).toHaveLength(3);
  });

  it("a faixa conta só os perdidos", async () => {
    const { props } = setup();
    await render(<HomeScreen {...props} />);
    expect(await screen.findByText("2 pets perdidos próximos")).toBeOnTheScreen();
    expect(screen.getByText("Raio de 5 km")).toBeOnTheScreen();
  });

  it("um perdido → singular; nenhum → mensagem tranquila", async () => {
    const one = setup({ nearby: async () => [occ("1")] });
    await render(<HomeScreen {...one.props} />);
    expect(await screen.findByText("1 pet perdido próximo")).toBeOnTheScreen();

    const none = setup({ nearby: async () => [occ("2", { type: "found" })] });
    await render(<HomeScreen {...none.props} />);
    expect(await screen.findByText("Nenhum pet perdido por perto")).toBeOnTheScreen();
  });

  it("lista vazia → estado vazio", async () => {
    const { props } = setup({ nearby: async () => [] });
    await render(<HomeScreen {...props} />);
    expect(await screen.findByText("Nenhuma ocorrência num raio de 5 km.")).toBeOnTheScreen();
  });

  it("mostra carregando enquanto busca", async () => {
    const { props } = setup({ nearby: () => new Promise(() => {}) });
    await render(<HomeScreen {...props} />);
    expect(screen.getByText("Procurando pets perto de você...")).toBeOnTheScreen();
  });

  it("tocar num pet abre o detalhe; o botão abre o registro de pet perdido", async () => {
    const { props } = setup();
    await render(<HomeScreen {...props} />);
    await fireEvent.press(await screen.findByRole("button", { name: "Pet 3, Perdido" }));
    expect(props.onOpen).toHaveBeenCalledWith("3");
    await fireEvent.press(screen.getByRole("button", { name: "Registrar pet perdido" }));
    expect(props.onRegister).toHaveBeenCalled();
  });

  it("permissão negada: explica e tenta de novo", async () => {
    const { props, client } = setup({
      location: [{ status: "denied", canAskAgain: true }, { status: "ok", coords: { lat: 1, lng: 2 } }],
    });
    await render(<HomeScreen {...props} />);
    expect(await screen.findByText(/Precisamos da sua localização/)).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Abrir configurações" })).toBeNull();
    expect(client.nearby).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByRole("button", { name: "Tentar de novo" }));
    expect(await screen.findByText("Pet 1")).toBeOnTheScreen();
    expect(client.nearby).toHaveBeenCalledWith({ lat: 1, lng: 2, radiusKm: 5 });
  });

  it("negada sem poder pedir de novo: oferece abrir as configurações", async () => {
    const { props } = setup({ location: [{ status: "denied", canAskAgain: false }] });
    await render(<HomeScreen {...props} />);
    await fireEvent.press(await screen.findByRole("button", { name: "Abrir configurações" }));
    expect(props.onOpenSettings).toHaveBeenCalled();
  });

  it("GPS indisponível: explica e oferece tentar de novo", async () => {
    const { props } = setup({ location: [{ status: "unavailable" }] });
    await render(<HomeScreen {...props} />);
    expect(await screen.findByText(/Não conseguimos achar sua localização/)).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Tentar de novo" })).toBeOnTheScreen();
  });

  it("erro da API: mostra a mensagem e tenta de novo", async () => {
    let fail = true;
    const { props } = setup({
      nearby: async () => {
        if (fail) throw new Error("Não foi possível falar com o servidor. Verifique sua conexão.");
        return [occ("1")];
      },
    });
    await render(<HomeScreen {...props} />);
    expect(await screen.findByText("Não foi possível falar com o servidor. Verifique sua conexão.")).toBeOnTheScreen();
    fail = false;
    await fireEvent.press(screen.getByRole("button", { name: "Tentar de novo" }));
    expect(await screen.findByText("Pet 1")).toBeOnTheScreen();
  });

  it("puxar para atualizar busca de novo, mantendo a lista enquanto isso", async () => {
    const lists = [[occ("1")], [occ("1"), occ("9")]];
    const { props, client } = setup({ nearby: async () => lists.shift()! });
    await render(<HomeScreen {...props} />);
    await screen.findByText("Pet 1");

    await act(async () => {
      screen.getByTestId("home-scroll").props.refreshControl.props.onRefresh();
    });
    expect(await screen.findByText("Pet 9")).toBeOnTheScreen();
    expect(client.nearby).toHaveBeenCalledTimes(2);
  });

  it("refreshSignal novo (voltou para a aba) recarrega", async () => {
    const { props, client } = setup();
    const view = await render(<HomeScreen {...props} refreshSignal={0} />);
    await screen.findByText("Pet 1");
    await view.rerender(<HomeScreen {...props} refreshSignal={1} />);
    await screen.findByText("Pet 1");
    expect(client.nearby).toHaveBeenCalledTimes(2);
  });
});

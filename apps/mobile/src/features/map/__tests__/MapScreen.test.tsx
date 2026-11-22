import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import type { PublicOccurrence } from "@miaucha/shared";
import { ApiError } from "@/features/auth/apiSession";
import type { LocationResult } from "@/features/location/currentLocation";
import type { AreaQuery } from "@/features/occurrences/occurrencesClient";
import { mapCommands } from "@/test-utils/reactNativeMapsMock";
import type { MapCache, MapSnapshot } from "../mapCache";
import { MapScreen } from "../MapScreen";
import { DEFAULT_REGION } from "../region";

const now = new Date("2026-11-20T12:00:00Z");
const here = { lat: -23.55, lng: -46.63 };

function occ(id: string, lat: number, lng: number, extra: Partial<PublicOccurrence> = {}): PublicOccurrence {
  return {
    id,
    type: "lost",
    species: "dog",
    petName: id,
    breed: null,
    color: null,
    description: null,
    photoUrls: [],
    publicLocation: { lat, lng },
    approxAddress: null,
    authorPseudonym: "Tutor Laranja 42",
    status: "open",
    isMine: false,
    createdAt: "2026-11-20T09:00:00Z",
    ...extra,
  };
}

// Dois pets bem separados (~2 km) e três colados (~100 m), que viram um grupo de longe.
const thor = occ("Thor", -23.55, -46.63);
const mia = occ("Mia", -23.53, -46.63, { type: "seen", species: "cat" });
const group = [occ("A", -23.57, -46.65), occ("B", -23.5701, -46.6509), occ("C", -23.5699, -46.6491)];

type Options = { location?: LocationResult; inArea?: (q: AreaQuery) => Promise<PublicOccurrence[]>; snapshot?: MapSnapshot | null };

async function setup({ location = { status: "ok", coords: here }, inArea = async () => [thor, mia], snapshot = null }: Options = {}) {
  const client = { inArea: jest.fn(inArea) };
  const cache: MapCache = { load: jest.fn(async () => snapshot), save: jest.fn(async () => {}), clear: jest.fn(async () => {}) };
  const props = {
    getLocation: jest.fn(async () => location),
    client,
    cache,
    onOpen: jest.fn(),
    onDirections: jest.fn(),
    onOpenSettings: jest.fn(),
    now,
  };
  await render(<MapScreen {...props} />);
  return { props, client, cache };
}

beforeEach(() => mapCommands.animateToRegion.mockClear());

describe("MapScreen", () => {
  it("começa na localização atual e busca só a área visível (MP-02)", async () => {
    const { client } = await setup();
    await waitFor(() => expect(client.inArea).toHaveBeenCalled());
    const map = screen.getByTestId("map-view");
    expect(map.props.initialRegion).toMatchObject({ latitude: here.lat, longitude: here.lng });
    const { bbox } = client.inArea.mock.calls[0][0];
    expect(bbox.minLat).toBeLessThan(here.lat);
    expect(bbox.maxLat).toBeGreaterThan(here.lat);
    expect(bbox.maxLat - bbox.minLat).toBeLessThan(0.1);
    expect(map.props.showsUserLocation).toBe(true);
  });

  it("desenha um marcador por ocorrência e mostra quantas há na área", async () => {
    await setup();
    expect(await screen.findByTestId("marker-Thor")).toBeOnTheScreen();
    expect(screen.getByTestId("marker-Mia")).toBeOnTheScreen();
    expect(screen.getByLabelText("Gato avistado")).toBeOnTheScreen();
    expect(screen.getByText("2 ocorrências nesta área")).toBeOnTheScreen();
  });

  it("tocar no marcador abre o card (MP-04); 'Ver detalhes' abre a ocorrência e 'Como chegar' o ponto público", async () => {
    const { props } = await setup();
    await fireEvent.press(await screen.findByTestId("marker-Thor"));
    expect(screen.getByText("Thor")).toBeOnTheScreen();
    expect(screen.getByLabelText("Cão perdido, selecionado")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Ver detalhes" }));
    expect(props.onOpen).toHaveBeenCalledWith("Thor");
    await fireEvent.press(screen.getByRole("button", { name: "Como chegar" }));
    expect(props.onDirections).toHaveBeenCalledWith(thor.publicLocation);
    await fireEvent.press(screen.getByRole("button", { name: "Fechar" }));
    expect(screen.queryByRole("button", { name: "Ver detalhes" })).toBeNull();
  });

  it("tocar no mapa fecha o card", async () => {
    await setup();
    await fireEvent.press(await screen.findByTestId("marker-Thor"));
    await fireEvent.press(screen.getByTestId("map-view"));
    expect(screen.queryByRole("button", { name: "Ver detalhes" })).toBeNull();
  });

  it("de longe, pontos próximos viram grupo com contagem; tocar dá zoom (MP-03)", async () => {
    await setup({ inArea: async () => group });
    await screen.findByTestId("cluster-3");
    // aproxima: o mapa avisa a região nova e os pontos se separam
    await fireEvent(screen.getByTestId("map-view"), "regionChangeComplete", {
      latitude: -23.57,
      longitude: -46.65,
      latitudeDelta: 0.002,
      longitudeDelta: 0.002,
    });
    expect(screen.queryByTestId("cluster-3")).toBeNull();
    expect(screen.getByTestId("marker-A")).toBeOnTheScreen();
  });

  it("tocar no grupo anima o mapa até ele se separar", async () => {
    await setup({ inArea: async () => group });
    await fireEvent.press(await screen.findByTestId("cluster-3"));
    expect(mapCommands.animateToRegion).toHaveBeenCalledTimes(1);
    const [region] = mapCommands.animateToRegion.mock.calls[0];
    expect(region.latitude).toBeCloseTo(-23.57, 2);
    expect(region.longitudeDelta).toBeLessThan(0.03);
  });

  it("filtros (MP-05): aplicar busca de novo com tipo, espécie e período e mostra quantos estão ativos", async () => {
    const { client } = await setup();
    await waitFor(() => expect(client.inArea).toHaveBeenCalledTimes(1));
    await fireEvent.press(screen.getByRole("button", { name: "Filtros" }));
    await fireEvent.press(screen.getByRole("button", { name: "Gatos" }));
    await fireEvent.press(screen.getByRole("button", { name: "24 h" }));
    await fireEvent.press(screen.getByRole("button", { name: "Aplicar filtros" }));
    await waitFor(() => expect(client.inArea).toHaveBeenCalledTimes(2));
    expect(client.inArea.mock.calls[1][0]).toMatchObject({ species: "cat", sinceDays: 1 });
    expect(screen.getByRole("button", { name: "Filtros (2 ativos)" })).toBeOnTheScreen();
  });

  it("sem permissão de localização, usa a região padrão e explica", async () => {
    const { client } = await setup({ location: { status: "denied", canAskAgain: true } });
    await waitFor(() => expect(client.inArea).toHaveBeenCalled());
    expect(screen.getByTestId("map-view").props.initialRegion).toEqual(DEFAULT_REGION);
    expect(screen.getByTestId("map-view").props.showsUserLocation).toBe(false);
    expect(screen.getByText(/Sem acesso à sua localização/)).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Permitir localização" })).toBeOnTheScreen();
  });

  it("localização bloqueada oferece abrir as configurações", async () => {
    const { props } = await setup({ location: { status: "denied", canAskAgain: false } });
    await fireEvent.press(await screen.findByRole("button", { name: "Abrir configurações" }));
    expect(props.onOpenSettings).toHaveBeenCalled();
  });

  it("sem internet, mostra o último mapa salvo com o aviso (MP-08)", async () => {
    const snapshot = { region: { latitude: -23.55, longitude: -46.63, latitudeDelta: 0.03, longitudeDelta: 0.03 }, occurrences: [thor], savedAt: "x" };
    await setup({ inArea: async () => Promise.reject(new ApiError("sem rede", 0)), snapshot });
    expect(await screen.findByText("Sem conexão: mostrando o último mapa carregado")).toBeOnTheScreen();
    expect(screen.getByTestId("marker-Thor")).toBeOnTheScreen();
  });

  it("sem internet, se o mapa salvo é de outro lugar, leva o mapa até ele", async () => {
    const region = { latitude: -22.9, longitude: -43.2, latitudeDelta: 0.03, longitudeDelta: 0.03 };
    await setup({ inArea: async () => Promise.reject(new ApiError("sem rede", 0)), snapshot: { region, occurrences: [], savedAt: "x" } });
    await screen.findByText("Sem conexão: mostrando o último mapa carregado");
    expect(mapCommands.animateToRegion).toHaveBeenCalledWith(region, 500);
  });

  it("sem permissão e com mapa salvo, começa no mapa salvo", async () => {
    const region = { latitude: -22.9, longitude: -43.2, latitudeDelta: 0.03, longitudeDelta: 0.03 };
    await setup({ location: { status: "denied", canAskAgain: true }, snapshot: { region, occurrences: [], savedAt: "x" } });
    await waitFor(() => expect(screen.getByTestId("map-view").props.initialRegion).toEqual(region));
  });

  it("erro da API aparece com 'Tentar de novo'", async () => {
    const replies: (PublicOccurrence[] | Error)[] = [new ApiError("Erro no servidor", 500), [thor]];
    const { client } = await setup({
      inArea: async () => {
        const reply = replies.shift()!;
        if (reply instanceof Error) throw reply;
        return reply;
      },
    });
    expect(await screen.findByText("Erro no servidor")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Tentar de novo" }));
    expect(await screen.findByTestId("marker-Thor")).toBeOnTheScreen();
    expect(client.inArea).toHaveBeenCalledTimes(2);
  });

  it("mudar refreshSignal (voltar para a aba) busca de novo a mesma área", async () => {
    const { client, props } = await setup();
    await waitFor(() => expect(client.inArea).toHaveBeenCalledTimes(1));
    await screen.rerender(<MapScreen {...props} refreshSignal={1} />);
    await waitFor(() => expect(client.inArea).toHaveBeenCalledTimes(2));
    expect(client.inArea.mock.calls[1][0].bbox).toEqual(client.inArea.mock.calls[0][0].bbox);
  });

  it("área sem ocorrências avisa", async () => {
    await setup({ inArea: async () => [] });
    expect(await screen.findByText("Nenhuma ocorrência nesta área")).toBeOnTheScreen();
  });
});

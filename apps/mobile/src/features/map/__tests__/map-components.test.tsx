import { StyleSheet } from "react-native";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { colors, type PublicOccurrence } from "@miaucha/shared";
import { DEFAULT_MAP_FILTERS } from "../filters";
import { MapFiltersSheet } from "../MapFiltersSheet";
import { ClusterBubble, OccurrencePin } from "../MapMarkers";
import { OccurrenceCard } from "../OccurrenceCard";

const now = new Date("2026-11-20T12:00:00Z");
const thor: PublicOccurrence = {
  id: "o1",
  type: "lost",
  species: "dog",
  petName: "Thor",
  breed: "Golden Retriever",
  color: null,
  description: null,
  photoUrls: ["https://x/thor.jpg"],
  publicLocation: { lat: -23.562, lng: -46.657 },
  approxAddress: "Av. Paulista",
  authorPseudonym: "Tutor Laranja 42",
  status: "open",
  isMine: false,
  createdAt: "2026-11-20T09:00:00Z",
};

const bg = (label: string) => StyleSheet.flatten(screen.getByLabelText(label).props.style)?.backgroundColor;

// A primeira renderização carrega mapa, ícones e imagens; com a suíte inteira em paralelo passa de 5 s.
jest.setTimeout(15_000);

describe("OccurrencePin (MP-01)", () => {
  it.each([
    ["lost", "dog", "Cão perdido", colors.lost],
    ["seen", "cat", "Gato avistado", colors.seen],
    ["found", "dog", "Cão encontrado", colors.found],
  ] as const)("%s/%s: cor pelo tipo e ícone pela espécie", async (type, species, label, color) => {
    await render(<OccurrencePin type={type} species={species} />);
    expect(bg(label)).toBe(color);
    expect(screen.getByTestId(`pin-icon-${species}`)).toBeOnTheScreen();
  });

  it("selecionado fica maior (pelo style, nunca por classe condicional)", async () => {
    await render(<OccurrencePin type="lost" species="dog" selected />);
    expect(StyleSheet.flatten(screen.getByLabelText("Cão perdido, selecionado").props.style).transform).toEqual([{ scale: 1.2 }]);
  });
});

describe("ClusterBubble (MP-03)", () => {
  it("mostra a contagem", async () => {
    await render(<ClusterBubble count={12} />);
    expect(screen.getByText("12")).toBeOnTheScreen();
    expect(screen.getByLabelText("12 ocorrências agrupadas. Toque para aproximar")).toBeOnTheScreen();
  });
});

describe("OccurrenceCard (MP-04)", () => {
  async function setup(data: Partial<PublicOccurrence> = {}) {
    const handlers = { onOpen: jest.fn(), onDirections: jest.fn(), onClose: jest.fn() };
    await render(<OccurrenceCard occurrence={{ ...thor, ...data }} now={now} {...handlers} />);
    return handlers;
  }

  it("mostra foto, nome, tipo, espécie e tempo desde o registro", async () => {
    await setup();
    expect(screen.getByLabelText("Foto de Thor")).toBeOnTheScreen();
    expect(screen.getByText("Thor")).toBeOnTheScreen();
    expect(screen.getByText("Perdido")).toBeOnTheScreen();
    expect(screen.getByText("Cão · Golden Retriever")).toBeOnTheScreen();
    expect(screen.getByText("3h atrás")).toBeOnTheScreen();
  });

  it("sem nome nem foto: título pela espécie e tipo e ícone no lugar da foto", async () => {
    await setup({ petName: null, type: "seen", species: "dog", photoUrls: [], breed: null });
    expect(screen.getByText("Cão avistado")).toBeOnTheScreen();
    expect(screen.getByText("Cão")).toBeOnTheScreen();
    expect(screen.getByLabelText("Cão avistado ainda não tem foto")).toBeOnTheScreen();
  });

  it("altura padrão: sem região mostra o aviso no lugar, e as linhas de texto não quebram", async () => {
    await setup({ approxAddress: null });
    expect(screen.getByText("Região não informada")).toBeOnTheScreen();
    for (const id of ["occurrence-card-subtitle", "occurrence-card-address"]) {
      expect(screen.getByTestId(id).props.numberOfLines).toBe(1);
    }
  });

  it("'Ver detalhes' abre a ocorrência; 'Como chegar' usa o ponto público (MP-06); X fecha", async () => {
    const { onOpen, onDirections, onClose } = await setup();
    await fireEvent.press(screen.getByRole("button", { name: "Ver detalhes" }));
    expect(onOpen).toHaveBeenCalledWith("o1");
    await fireEvent.press(screen.getByRole("button", { name: "Como chegar" }));
    expect(onDirections).toHaveBeenCalledWith({ lat: -23.562, lng: -46.657 });
    await fireEvent.press(screen.getByRole("button", { name: "Fechar" }));
    expect(onClose).toHaveBeenCalled();
  });
});

describe("MapFiltersSheet (MP-05)", () => {
  async function setup(filters = DEFAULT_MAP_FILTERS) {
    const handlers = { onApply: jest.fn(), onClose: jest.fn() };
    await render(<MapFiltersSheet visible filters={filters} {...handlers} />);
    return handlers;
  }

  it("mostra tipo, espécie e período com o valor atual marcado", async () => {
    await setup({ type: "lost", species: "all", sinceDays: 7 });
    expect(screen.getByRole("button", { name: "Perdidos" })).toBeSelected();
    expect(screen.getByRole("button", { name: "Avistados" })).not.toBeSelected();
    expect(screen.getAllByRole("button", { name: "Todos" })[1]).toBeSelected();
    expect(screen.getByRole("button", { name: "7 dias" })).toBeSelected();
    expect(screen.getByRole("button", { name: "24 h" })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "30 dias" })).toBeOnTheScreen();
  });

  it("aplica só ao tocar em 'Aplicar'", async () => {
    const { onApply } = await setup();
    await fireEvent.press(screen.getByRole("button", { name: "Encontrados" }));
    await fireEvent.press(screen.getByRole("button", { name: "Gatos" }));
    await fireEvent.press(screen.getByRole("button", { name: "24 h" }));
    expect(onApply).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByRole("button", { name: "Aplicar filtros" }));
    expect(onApply).toHaveBeenCalledWith({ type: "found", species: "cat", sinceDays: 1 });
  });

  it("'Limpar' volta ao padrão", async () => {
    const { onApply } = await setup({ type: "lost", species: "dog", sinceDays: 1 });
    await fireEvent.press(screen.getByRole("button", { name: "Limpar" }));
    await fireEvent.press(screen.getByRole("button", { name: "Aplicar filtros" }));
    expect(onApply).toHaveBeenCalledWith(DEFAULT_MAP_FILTERS);
  });

  it("fechar descarta as mudanças", async () => {
    const { onApply, onClose } = await setup();
    await fireEvent.press(screen.getByRole("button", { name: "Gatos" }));
    await fireEvent.press(screen.getByRole("button", { name: "Fechar filtros" }));
    expect(onClose).toHaveBeenCalled();
    expect(onApply).not.toHaveBeenCalled();
  });
});

describe("filtro 'Outros' do mapa", () => {
  it("existe ao lado de Cães e Gatos e junta as outras espécies", () => {
    const { SPECIES_OPTIONS, matchesFilters, DEFAULT_MAP_FILTERS } = jest.requireActual("../filters");
    expect(SPECIES_OPTIONS.map((o: { label: string }) => o.label)).toEqual(["Todos", "Cães", "Gatos", "Outros"]);
    const occ = (species: string) => ({ species, type: "lost", createdAt: new Date().toISOString() });
    const others = { ...DEFAULT_MAP_FILTERS, species: "others" };
    expect(matchesFilters(occ("rabbit"), others, new Date())).toBe(true);
    expect(matchesFilters(occ("dog"), others, new Date())).toBe(false);
  });
});


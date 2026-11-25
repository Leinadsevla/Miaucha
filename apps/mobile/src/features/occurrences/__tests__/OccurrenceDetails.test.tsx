import { fireEvent, render, screen } from "@testing-library/react-native";
import type { PublicOccurrence } from "@miaucha/shared";
import { OccurrenceDetails } from "../OccurrenceDetails";

const now = new Date("2026-11-20T12:00:00Z");
const thor: PublicOccurrence = {
  id: "o1",
  type: "lost",
  species: "dog",
  petName: "Thor",
  breed: "Golden Retriever",
  color: "Dourado",
  description: "Coleira azul, muito dócil",
  photoUrls: ["https://x/a.jpg", "https://x/b.jpg"],
  publicLocation: { lat: -23.562, lng: -46.657 },
  approxAddress: "Av. Paulista, perto do MASP",
  authorPseudonym: "Tutor Laranja 42",
  status: "open",
  isMine: false,
  createdAt: "2026-11-20T09:00:00Z",
};

async function setup(data: Partial<PublicOccurrence> = {}, extra: { resolving?: boolean; chatLoading?: boolean; chatError?: string } = {}) {
  const handlers = { onBack: jest.fn(), onDirections: jest.fn(), onResolve: jest.fn(), onChat: jest.fn() };
  await render(<OccurrenceDetails occurrence={{ ...thor, ...data }} now={now} {...handlers} {...extra} />);
  return handlers;
}

describe("OccurrenceDetails", () => {
  it("mostra fotos, selo do tipo, nome, raça, cor, tempo, pseudônimo, endereço e descrição", async () => {
    await setup();
    expect(screen.getByRole("header", { name: "Thor" })).toBeOnTheScreen();
    expect(screen.getByText("Perdido")).toBeOnTheScreen();
    expect(screen.getByText("Golden Retriever · Dourado")).toBeOnTheScreen();
    expect(screen.getByLabelText("Foto 1 de 2 de Thor")).toBeOnTheScreen();
    expect(screen.getByLabelText("Foto 2 de 2 de Thor")).toBeOnTheScreen();
    expect(screen.getAllByText("3h atrás").length).toBeGreaterThan(0);
    expect(screen.getByText("Tutor Laranja 42")).toBeOnTheScreen();
    expect(screen.getByText("Av. Paulista, perto do MASP")).toBeOnTheScreen();
    expect(screen.getByText("Coleira azul, muito dócil")).toBeOnTheScreen();
    expect(screen.getByText(/Local aproximado/)).toBeOnTheScreen();
  });

  it("sem nome, o título diz espécie e tipo; sem foto, mostra o ícone", async () => {
    await setup({ type: "seen", species: "cat", petName: null, photoUrls: [], breed: null, color: null, description: null, approxAddress: null });
    expect(screen.getByRole("header", { name: "Gato avistado" })).toBeOnTheScreen();
    expect(screen.getByLabelText("Gato avistado ainda não tem foto")).toBeOnTheScreen();
    expect(screen.getByText("Região aproximada no mapa")).toBeOnTheScreen();
    expect(screen.getAllByText("Não informado")).toHaveLength(2);
  });

  it("'Como chegar' usa o ponto público (MP-06)", async () => {
    const { onDirections } = await setup();
    await fireEvent.press(screen.getByRole("button", { name: "Como chegar" }));
    expect(onDirections).toHaveBeenCalledWith({ lat: -23.562, lng: -46.657 });
  });

  it("'Conversar' abre o chat com quem registrou, pelo pseudônimo (CH-01)", async () => {
    const { onChat } = await setup();
    expect(screen.getByText("Converse com Tutor Laranja 42 sem expor seu contato")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Conversar" }));
    expect(onChat).toHaveBeenCalled();
  });

  it("'Conversar' fica desabilitado para o próprio autor", async () => {
    const { onChat } = await setup({ isMine: true });
    expect(screen.getByRole("button", { name: "Conversar" })).toBeDisabled();
    expect(screen.getByText("Esta ocorrência é sua: as conversas aparecem na aba Chat")).toBeOnTheScreen();
    expect(onChat).not.toHaveBeenCalled();
  });

  it("mostra o erro ao abrir o chat", async () => {
    await setup({}, { chatError: "Esta ocorrência não está mais aberta" });
    expect(screen.getByText("Esta ocorrência não está mais aberta")).toBeOnTheScreen();
  });

  it("o autor pode marcar como resolvido", async () => {
    const { onResolve } = await setup({ isMine: true });
    await fireEvent.press(screen.getByRole("button", { name: "Marcar como resolvido" }));
    expect(onResolve).toHaveBeenCalled();
  });

  it("quem não é o autor não vê o botão de resolver", async () => {
    await setup({ isMine: false });
    expect(screen.queryByRole("button", { name: "Marcar como resolvido" })).toBeNull();
  });

  it("resolvida: avisa e não oferece resolver de novo", async () => {
    await setup({ isMine: true, status: "resolved" });
    expect(screen.getByText("Este caso foi resolvido")).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Marcar como resolvido" })).toBeNull();
  });

  it("Voltar chama onBack", async () => {
    const { onBack } = await setup();
    await fireEvent.press(screen.getByRole("button", { name: "Voltar" }));
    expect(onBack).toHaveBeenCalled();
  });
});

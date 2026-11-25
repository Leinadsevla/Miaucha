import { act, fireEvent, render, screen } from "@testing-library/react-native";
import type { ChatConversation, ChatMessage } from "@miaucha/shared";
import type { LocationResult } from "@/features/location/currentLocation";
import type { ChatClient } from "../chatClient";
import { createLocalChatRealtime } from "../chatRealtime";
import { ConversationScreen } from "../ConversationScreen";

const now = new Date(2026, 10, 20, 18, 0);
const at = (minute: number) => new Date(2026, 10, 20, 14, minute).toISOString();

const message = (id: string, data: Partial<ChatMessage> = {}): ChatMessage => ({
  id,
  conversationId: "c1",
  mine: false,
  kind: "text",
  text: `texto ${id}`,
  photoUrl: null,
  location: null,
  createdAt: at(Number(id.replace(/\D/g, "")) || 0),
  readAt: null,
  ...data,
});

const baseConversation: ChatConversation = {
  id: "c1",
  occurrence: { id: "o1", type: "lost", species: "dog", petName: "Thor", status: "open", photoUrl: null },
  otherPseudonym: "Vizinho Azul 7",
  iAmAuthor: true,
  lastMessage: null,
  unreadCount: 1,
  blockedByMe: false,
  canSend: true,
  contact: { mine: false, theirs: false, otherEmail: null },
  createdAt: at(0),
};

type Overrides = { conversation?: Partial<ChatConversation>; messages?: ChatMessage[]; nextCursor?: string | null; location?: LocationResult };

async function setup(o: Overrides = {}) {
  let conversation: ChatConversation = { ...baseConversation, ...o.conversation };
  const sentMessage = (data: Partial<ChatMessage>) => message("m50", { mine: true, createdAt: at(50), ...data });
  const client = {
    get: jest.fn(async () => conversation),
    messages: jest.fn(async (_id: string, before?: string) =>
      before ? { messages: [message("m1", { text: "a mais antiga" })], nextCursor: null } : { messages: o.messages ?? [message("m3"), message("m2", { mine: true })], nextCursor: o.nextCursor ?? null },
    ),
    sendText: jest.fn(async (_id: string, text: string) => sentMessage({ text })),
    sendPhoto: jest.fn(async () => sentMessage({ kind: "photo", text: null, photoUrl: "https://x/foto.jpg" })),
    sendLocation: jest.fn(async () => sentMessage({ kind: "location", text: null, location: { lat: -23.5, lng: -46.6 } })),
    markRead: jest.fn(async () => {}),
    setContactConsent: jest.fn(async (_id: string, consent: boolean) => (conversation = { ...conversation, contact: { ...conversation.contact, mine: consent } })),
    setBlocked: jest.fn(async (_id: string, blocked: boolean) => (conversation = { ...conversation, blockedByMe: blocked, canSend: !blocked })),
    report: jest.fn(async () => {}),
  } as unknown as jest.Mocked<ChatClient>;
  const realtime = createLocalChatRealtime();
  const handlers = {
    onBack: jest.fn(),
    onOpenOccurrence: jest.fn(),
    onOpenLocation: jest.fn(),
    pickPhoto: jest.fn(async () => ({ uri: "file:///foto.jpg", mimeType: "image/jpeg" })),
    getLocation: jest.fn(async (): Promise<LocationResult> => o.location ?? { status: "ok", coords: { lat: -23.5, lng: -46.6 } }),
    confirm: jest.fn(async () => true),
  };
  await render(<ConversationScreen conversationId="c1" client={client} realtime={realtime} now={now} {...handlers} />);
  await screen.findByText("Vizinho Azul 7");
  return { client, realtime, handlers };
}

// A primeira renderização da conversa é pesada; com a suíte inteira em paralelo pode passar de 5 s.
jest.setTimeout(15_000);

describe("ConversationScreen", () => {
  it("mostra o pseudônimo, o pet, o aviso contra golpes e as mensagens; marca como lida ao abrir", async () => {
    const { client, handlers } = await setup();
    expect(screen.getByText("Sobre o pet: Thor")).toBeOnTheScreen();
    expect(screen.getByText(/Nunca pague/)).toBeOnTheScreen();
    expect(screen.getByText("texto m3")).toBeOnTheScreen();
    expect(screen.getByText("texto m2")).toBeOnTheScreen();
    expect(screen.getByLabelText("Enviada")).toBeOnTheScreen();
    expect(client.markRead).toHaveBeenCalledWith("c1");
    await fireEvent.press(screen.getByRole("button", { name: "Ver a ocorrência de Thor" }));
    expect(handlers.onOpenOccurrence).toHaveBeenCalledWith("o1");
  });

  it("envia texto e limpa o campo", async () => {
    const { client } = await setup();
    await fireEvent.changeText(screen.getByLabelText("Mensagem"), "  Vi ele agora  ");
    await fireEvent.press(screen.getByRole("button", { name: "Enviar" }));
    expect(client.sendText).toHaveBeenCalledWith("c1", "  Vi ele agora  ");
    expect(await screen.findByText("Vi ele agora")).toBeOnTheScreen();
    expect(screen.getByLabelText("Mensagem").props.value).toBe("");
  });

  it("não envia texto vazio", async () => {
    const { client } = await setup();
    expect(screen.getByRole("button", { name: "Enviar" })).toBeDisabled();
    await fireEvent.changeText(screen.getByLabelText("Mensagem"), "   ");
    expect(screen.getByRole("button", { name: "Enviar" })).toBeDisabled();
    expect(client.sendText).not.toHaveBeenCalled();
  });

  it("erro ao enviar aparece e o texto volta para o campo", async () => {
    const { client } = await setup();
    client.sendText.mockRejectedValueOnce(new Error("Muitas tentativas. Espere um pouco e tente de novo."));
    await fireEvent.changeText(screen.getByLabelText("Mensagem"), "oi");
    await fireEvent.press(screen.getByRole("button", { name: "Enviar" }));
    expect(await screen.findByText("Muitas tentativas. Espere um pouco e tente de novo.")).toBeOnTheScreen();
    expect(screen.getByLabelText("Mensagem").props.value).toBe("oi");
  });

  it("envia foto da galeria (CH-05)", async () => {
    const { client } = await setup();
    await fireEvent.press(screen.getByRole("button", { name: "Enviar foto" }));
    expect(client.sendPhoto).toHaveBeenCalledWith("c1", { uri: "file:///foto.jpg", mimeType: "image/jpeg" });
    expect(await screen.findByLabelText("Foto enviada")).toBeOnTheScreen();
  });

  it("envia a localização aproximada e abre no mapa (CH-05)", async () => {
    const { client, handlers } = await setup();
    await fireEvent.press(screen.getByRole("button", { name: "Enviar minha localização aproximada" }));
    expect(client.sendLocation).toHaveBeenCalledWith("c1", { lat: -23.5, lng: -46.6 });
    await fireEvent.press(await screen.findByRole("button", { name: "Abrir no mapa" }));
    expect(handlers.onOpenLocation).toHaveBeenCalledWith({ lat: -23.5, lng: -46.6 });
  });

  it("sem permissão de localização, avisa e não envia", async () => {
    const { client } = await setup({ location: { status: "denied", canAskAgain: false } });
    await fireEvent.press(screen.getByRole("button", { name: "Enviar minha localização aproximada" }));
    expect(await screen.findByText("Não foi possível obter sua localização")).toBeOnTheScreen();
    expect(client.sendLocation).not.toHaveBeenCalled();
  });

  it("mensagem nova pelo socket aparece e é marcada como lida; leitura do outro vira 'Lida' (CH-03, CH-09)", async () => {
    const { client, realtime } = await setup();
    client.markRead.mockClear();
    await act(async () => realtime.emit("message:new", { conversationId: "c1", message: message("m9", { text: "chegou agora" }) }));
    expect(screen.getByText("chegou agora")).toBeOnTheScreen();
    expect(client.markRead).toHaveBeenCalledWith("c1");

    await act(async () => realtime.emit("message:new", { conversationId: "outra", message: message("m10", { conversationId: "outra", text: "de outra conversa" }) }));
    expect(screen.queryByText("de outra conversa")).toBeNull();

    await act(async () => realtime.emit("message:read", { conversationId: "c1", readAt: at(59) }));
    expect(screen.getByLabelText("Lida")).toBeOnTheScreen();
  });

  it("carrega mensagens mais antigas (CH-09)", async () => {
    const { client } = await setup({ nextCursor: "m2" });
    await fireEvent.press(screen.getByRole("button", { name: "Carregar mensagens anteriores" }));
    expect(client.messages).toHaveBeenLastCalledWith("c1", "m2");
    expect(await screen.findByText("a mais antiga")).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Carregar mensagens anteriores" })).toBeNull();
  });

  it("compartilhar contato: aceita e espera a outra pessoa; com os dois, mostra o e-mail (CH-07)", async () => {
    const { client, realtime } = await setup();
    await fireEvent.press(screen.getByRole("button", { name: "Opções da conversa" }));
    await fireEvent.press(screen.getByRole("button", { name: "Compartilhar meu contato" }));
    expect(client.setContactConsent).toHaveBeenCalledWith("c1", true);
    expect(await screen.findByText(/Aguardando Vizinho Azul 7 aceitar/)).toBeOnTheScreen();

    await act(async () =>
      realtime.emit("conversation:updated", {
        conversation: { ...baseConversation, contact: { mine: true, theirs: true, otherEmail: "vizinho@exemplo.com" } },
      }),
    );
    expect(screen.getByText("vizinho@exemplo.com")).toBeOnTheScreen();
  });

  it("quando o outro quer compartilhar, oferece aceitar", async () => {
    await setup({ conversation: { contact: { mine: false, theirs: true, otherEmail: null } } });
    expect(screen.getByText(/Vizinho Azul 7 quer trocar contato/)).toBeOnTheScreen();
  });

  it("bloquear pede confirmação e troca o campo por um aviso; desbloquear volta (CH-08)", async () => {
    const { client, handlers } = await setup();
    await fireEvent.press(screen.getByRole("button", { name: "Opções da conversa" }));
    await fireEvent.press(screen.getByRole("button", { name: "Bloquear" }));
    expect(handlers.confirm).toHaveBeenCalled();
    expect(client.setBlocked).toHaveBeenCalledWith("c1", true);
    expect(await screen.findByText("Você bloqueou esta pessoa.")).toBeOnTheScreen();
    expect(screen.queryByLabelText("Mensagem")).toBeNull();

    await fireEvent.press(screen.getByRole("button", { name: "Opções da conversa" }));
    await fireEvent.press(screen.getByRole("button", { name: "Desbloquear" }));
    expect(await screen.findByLabelText("Mensagem")).toBeOnTheScreen();
  });

  it("bloqueado pela outra pessoa: não mostra o campo", async () => {
    await setup({ conversation: { canSend: false } });
    expect(screen.getByText("Não é possível enviar mensagens nesta conversa.")).toBeOnTheScreen();
  });

  it("denunciar com motivo e detalhes (CH-08)", async () => {
    const { client } = await setup();
    await fireEvent.press(screen.getByRole("button", { name: "Opções da conversa" }));
    await fireEvent.press(screen.getByRole("button", { name: "Denunciar" }));
    expect(screen.getByRole("button", { name: "Enviar denúncia" })).toBeDisabled();
    await fireEvent.press(screen.getByRole("button", { name: "Golpe ou pedido de dinheiro" }));
    await fireEvent.changeText(screen.getByLabelText("Detalhes (opcional)"), "Pediu Pix");
    await fireEvent.press(screen.getByRole("button", { name: "Enviar denúncia" }));
    expect(client.report).toHaveBeenCalledWith("c1", "scam", "Pediu Pix");
    expect(await screen.findByText("Denúncia enviada. Obrigado por avisar.")).toBeOnTheScreen();
  });

  it("reconexão busca as mensagens de novo", async () => {
    const { client, realtime } = await setup();
    client.messages.mockClear();
    await act(async () => realtime.connected());
    expect(client.messages).toHaveBeenCalledWith("c1", undefined);
  });

  it("erro ao abrir a conversa", async () => {
    const client = { get: jest.fn(async () => Promise.reject(new Error("Conversa não encontrada"))), messages: jest.fn(async () => ({ messages: [], nextCursor: null })), markRead: jest.fn() } as unknown as ChatClient;
    await render(
      <ConversationScreen
        conversationId="c1"
        client={client}
        realtime={createLocalChatRealtime()}
        onBack={jest.fn()}
        onOpenOccurrence={jest.fn()}
        onOpenLocation={jest.fn()}
        pickPhoto={jest.fn()}
        getLocation={jest.fn()}
        confirm={jest.fn()}
      />,
    );
    expect(await screen.findByText("Conversa não encontrada")).toBeOnTheScreen();
  });
});

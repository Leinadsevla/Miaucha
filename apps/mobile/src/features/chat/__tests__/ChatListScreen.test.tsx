import { act, fireEvent, render, screen } from "@testing-library/react-native";
import type { ChatConversation, ChatMessage } from "@miaucha/shared";
import { ChatListScreen } from "../ChatListScreen";
import type { ChatClient } from "../chatClient";
import { createLocalChatRealtime } from "../chatRealtime";

const now = new Date(2026, 10, 20, 18, 0);

const message = (data: Partial<ChatMessage> = {}): ChatMessage => ({
  id: "m1",
  conversationId: "c1",
  mine: false,
  kind: "text",
  text: "Vi o Thor perto do metrô",
  photoUrl: null,
  location: null,
  createdAt: new Date(2026, 10, 20, 14, 32).toISOString(),
  readAt: null,
  ...data,
});

const conversation = (id: string, data: Partial<ChatConversation> = {}): ChatConversation => ({
  id,
  occurrence: { id: `o-${id}`, type: "lost", species: "dog", petName: "Thor", status: "open", photoUrl: null },
  otherPseudonym: "Vizinho Azul 7",
  iAmAuthor: true,
  lastMessage: message({ conversationId: id }),
  unreadCount: 2,
  blockedByMe: false,
  canSend: true,
  contact: { mine: false, theirs: false, otherEmail: null },
  createdAt: new Date(2026, 10, 20, 10, 0).toISOString(),
  ...data,
});

function fakeClient(list: () => Promise<ChatConversation[]>): ChatClient {
  return { list: jest.fn(list) } as unknown as ChatClient;
}

async function setup(list: () => Promise<ChatConversation[]>) {
  const client = fakeClient(list);
  const realtime = createLocalChatRealtime();
  const onOpen = jest.fn();
  await render(<ChatListScreen client={client} realtime={realtime} onOpen={onOpen} now={now} />);
  return { client, realtime, onOpen };
}

describe("ChatListScreen", () => {
  it("mostra pseudônimo, pet, última mensagem, hora e não lidas; toque abre a conversa", async () => {
    const { onOpen } = await setup(async () => [conversation("c1")]);
    expect(await screen.findByText("Vizinho Azul 7")).toBeOnTheScreen();
    expect(screen.getByText("Sobre: Thor")).toBeOnTheScreen();
    expect(screen.getByText("Vi o Thor perto do metrô")).toBeOnTheScreen();
    expect(screen.getByText("14:32")).toBeOnTheScreen();
    expect(screen.getByLabelText("2 mensagens não lidas")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: /Conversa com Vizinho Azul 7/ }));
    expect(onOpen).toHaveBeenCalledWith("c1");
  });

  it("sem conversas, explica como começar", async () => {
    await setup(async () => []);
    expect(await screen.findByText("Nenhuma conversa ainda")).toBeOnTheScreen();
    expect(screen.getByText(/toque em "Conversar"/)).toBeOnTheScreen();
  });

  it("erro com botão de tentar de novo", async () => {
    let fail = true;
    const { client } = await setup(async () => {
      if (fail) throw new Error("Sem conexão");
      return [conversation("c1")];
    });
    expect(await screen.findByText("Sem conexão")).toBeOnTheScreen();
    fail = false;
    await fireEvent.press(screen.getByRole("button", { name: "Tentar de novo" }));
    expect(await screen.findByText("Vizinho Azul 7")).toBeOnTheScreen();
    expect(client.list).toHaveBeenCalledTimes(2);
  });

  it("mensagem nova pelo socket atualiza a prévia e as não lidas", async () => {
    const { realtime } = await setup(async () => [conversation("c1", { unreadCount: 0, lastMessage: null })]);
    await screen.findByText("Vizinho Azul 7");
    await act(async () => realtime.emit("message:new", { conversationId: "c1", message: message({ id: "m9", text: "Tem coleira azul" }) }));
    expect(screen.getByText("Tem coleira azul")).toBeOnTheScreen();
    expect(screen.getByLabelText("1 mensagem não lida")).toBeOnTheScreen();
  });

  it("mensagem de conversa nova ou reconexão buscam a lista de novo", async () => {
    const { client, realtime } = await setup(async () => [conversation("c1")]);
    await screen.findByText("Vizinho Azul 7");
    await act(async () => realtime.emit("message:new", { conversationId: "c2", message: message({ conversationId: "c2" }) }));
    expect(client.list).toHaveBeenCalledTimes(2);
    await act(async () => realtime.connected());
    expect(client.list).toHaveBeenCalledTimes(3);
  });
});

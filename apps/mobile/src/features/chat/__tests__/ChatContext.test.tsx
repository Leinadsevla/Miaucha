import { render, screen } from "@testing-library/react-native";
import { Text } from "react-native";
import { createMockChatClient } from "../chatClient";
import { createLocalChatRealtime } from "../chatRealtime";
import { ChatProvider, useChat } from "../ChatContext";

function Probe() {
  const { client } = useChat();
  return <Text>{client ? "com cliente" : "sem"}</Text>;
}

describe("ChatProvider", () => {
  it("conecta o tempo real só com sessão ativa e desconecta ao sair", async () => {
    const realtime = createLocalChatRealtime();
    const client = createMockChatClient();
    const view = await render(
      <ChatProvider client={client} realtime={realtime} active={false}>
        <Probe />
      </ChatProvider>,
    );
    expect(realtime.started).toBe(false);
    expect(screen.getByText("com cliente")).toBeOnTheScreen();

    await view.rerender(
      <ChatProvider client={client} realtime={realtime} active>
        <Probe />
      </ChatProvider>,
    );
    expect(realtime.started).toBe(true);

    await view.rerender(
      <ChatProvider client={client} realtime={realtime} active={false}>
        <Probe />
      </ChatProvider>,
    );
    expect(realtime.started).toBe(false);
  });

  it("useChat fora do provider explica o erro", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    await expect(render(<Probe />)).rejects.toThrow("useChat precisa estar dentro de <ChatProvider>");
  });
});

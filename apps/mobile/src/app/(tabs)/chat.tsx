import { useCallback, useRef, useState } from "react";
import { router, useFocusEffect } from "expo-router";
import { ChatListScreen, useChat } from "@/features/chat";

export default function ChatTab() {
  const { client, realtime } = useChat();
  const [refreshSignal, setRefreshSignal] = useState(0);
  const focusedBefore = useRef(false);

  // Ao voltar de uma conversa, recarrega (não lidas zeradas, última mensagem) sem "carregando".
  useFocusEffect(
    useCallback(() => {
      if (focusedBefore.current) setRefreshSignal((n) => n + 1);
      focusedBefore.current = true;
    }, []),
  );

  return (
    <ChatListScreen
      client={client}
      realtime={realtime}
      refreshSignal={refreshSignal}
      onOpen={(id) => router.push({ pathname: "/chat/[id]", params: { id } })}
    />
  );
}

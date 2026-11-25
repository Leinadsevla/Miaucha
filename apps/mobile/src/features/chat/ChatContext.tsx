import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";
import { useAuth } from "@/features/auth/AuthProvider";
import type { ChatClient } from "./chatClient";
import type { ChatRealtime } from "./chatRealtime";

type ChatContextValue = { client: ChatClient; realtime: ChatRealtime };

const ChatContext = createContext<ChatContextValue | null>(null);

/** Cliente do chat e tempo real; o socket fica conectado enquanto `active` (sessão aberta). */
export function ChatProvider({ client, realtime, active, children }: ChatContextValue & { active: boolean; children: ReactNode }) {
  useEffect(() => {
    if (!active) return;
    realtime.start();
    return () => realtime.stop();
  }, [realtime, active]);

  const value = useMemo(() => ({ client, realtime }), [client, realtime]);
  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

/** Liga o socket com a sessão do AuthProvider (logado e com consentimento). */
export function SessionChatProvider({ client, realtime, children }: ChatContextValue & { children: ReactNode }) {
  const { state } = useAuth();
  const active = state.status === "signedIn" && state.user.hasConsent;
  return (
    <ChatProvider client={client} realtime={realtime} active={active}>
      {children}
    </ChatProvider>
  );
}

export function useChat(): ChatContextValue {
  const value = useContext(ChatContext);
  if (!value) throw new Error("useChat precisa estar dentro de <ChatProvider>");
  return value;
}

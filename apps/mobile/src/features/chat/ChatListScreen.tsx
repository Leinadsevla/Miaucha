import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View } from "react-native";
import { Image } from "expo-image";
import { MessageCircle } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, type ChatConversation } from "@miaucha/shared";
import { PrimaryButton, SpeciesIcon } from "@/components";
import { occurrenceTitle } from "@/features/occurrences/OccurrenceDetails";
import type { ChatClient } from "./chatClient";
import type { ChatRealtime } from "./chatRealtime";
import { applyIncoming, formatMessageTime, lastMessagePreview, upsertConversation } from "./chatState";

type State = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; conversations: ChatConversation[] };

type Props = {
  client: ChatClient;
  realtime: ChatRealtime;
  onOpen: (id: string) => void;
  /** Mude o valor para recarregar sem mostrar "carregando" (ex.: ao voltar para a aba). */
  refreshSignal?: number;
  now?: Date;
};

export function unreadLabel(count: number): string {
  return count === 1 ? "1 mensagem não lida" : `${count} mensagens não lidas`;
}

/** Aba Chat: conversas mais recentes primeiro, com o outro participante só pelo pseudônimo (CH-02). */
export function ChatListScreen({ client, realtime, onOpen, refreshSignal, now }: Props) {
  const insets = useSafeAreaInsets();
  const [state, setState] = useState<State>({ status: "loading" });
  const [refreshing, setRefreshing] = useState(false);
  const latest = useRef(0);
  // Os eventos do socket precisam da lista atual (o updater do setState roda depois).
  const stateRef = useRef(state);
  stateRef.current = state;

  const load = useCallback(
    async (mode: "full" | "refresh" | "silent") => {
      const request = ++latest.current;
      if (mode === "full") setState({ status: "loading" });
      if (mode === "refresh") setRefreshing(true);
      let next: State;
      try {
        next = { status: "ready", conversations: await client.list() };
      } catch (e) {
        next = { status: "error", message: e instanceof Error ? e.message : "Não foi possível carregar as conversas" };
      }
      if (request !== latest.current) return;
      setState(next);
      setRefreshing(false);
    },
    [client],
  );

  useEffect(() => {
    void load("full");
  }, [load]);

  const firstSignal = useRef(refreshSignal);
  useEffect(() => {
    if (refreshSignal === firstSignal.current) return;
    void load("silent");
  }, [refreshSignal, load]);

  useEffect(() => {
    const offMessage = realtime.on("message:new", (event) => {
      if (stateRef.current.status !== "ready") return;
      const result = applyIncoming(stateRef.current.conversations, event);
      if (!result.known) void load("silent");
      else setState({ status: "ready", conversations: result.list });
    });
    const offUpdated = realtime.on("conversation:updated", ({ conversation }) =>
      setState((current) => (current.status === "ready" ? { status: "ready", conversations: upsertConversation(current.conversations, conversation) } : current)),
    );
    const offConnect = realtime.onConnect(() => void load("silent"));
    return () => {
      offMessage();
      offUpdated();
      offConnect();
    };
  }, [realtime, load]);

  return (
    <View className="flex-1 bg-background">
      <View className="border-b border-border bg-white px-5 pb-4" style={{ paddingTop: insets.top + 16 }}>
        <Text accessibilityRole="header" className="font-nunito-black text-lg text-foreground">
          Conversas
        </Text>
        <Text className="font-sans text-xs text-muted-foreground">Por pseudônimo, sem expor seu telefone ou e-mail</Text>
      </View>

      {state.status === "loading" ? (
        <View className="items-center gap-3 py-10">
          <ActivityIndicator color={colors.primary} />
          <Text className="font-sans text-sm text-muted-foreground">Carregando conversas...</Text>
        </View>
      ) : state.status === "error" ? (
        <View className="m-5 items-center gap-3 rounded-3xl border border-border bg-card p-5">
          <Text className="text-center font-sans text-sm text-lost">{state.message}</Text>
          <PrimaryButton title="Tentar de novo" variant="outline" onPress={() => void load("full")} />
        </View>
      ) : (
        <FlatList
          data={state.conversations}
          keyExtractor={(c) => c.id}
          contentContainerStyle={{ padding: 20, gap: 12, paddingBottom: 96 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load("refresh")} tintColor={colors.primary} colors={[colors.primary]} />}
          ListEmptyComponent={
            <View className="items-center gap-3 rounded-3xl border border-border bg-card p-6">
              <View className="h-12 w-12 items-center justify-center rounded-2xl bg-primary-soft">
                <MessageCircle size={22} color={colors.primary} />
              </View>
              <Text className="font-nunito-bold text-base text-foreground">Nenhuma conversa ainda</Text>
              <Text className="text-center font-sans text-sm text-muted-foreground">
                Abra uma ocorrência e toque em "Conversar" para falar com quem registrou.
              </Text>
            </View>
          }
          renderItem={({ item }) => <ConversationRow conversation={item} now={now} onPress={() => onOpen(item.id)} />}
        />
      )}
    </View>
  );
}

function ConversationRow({ conversation: c, now, onPress }: { conversation: ChatConversation; now?: Date; onPress: () => void }) {
  const title = occurrenceTitle(c.occurrence);
  const time = c.lastMessage ? formatMessageTime(c.lastMessage.createdAt, now) : null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Conversa com ${c.otherPseudonym} sobre ${title}`}
      onPress={onPress}
      className="flex-row items-center gap-3 rounded-3xl border border-border bg-card p-3 active:opacity-80"
    >
      <View className="h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-primary-soft">
        {c.occurrence.photoUrl ? (
          <Image source={{ uri: c.occurrence.photoUrl }} contentFit="cover" style={{ width: 48, height: 48 }} accessibilityLabel={`Foto de ${title}`} />
        ) : (
          <SpeciesIcon species={c.occurrence.species} size={22} color={colors.primary} />
        )}
      </View>
      <View className="flex-1 gap-0.5">
        <View className="flex-row items-center justify-between gap-2">
          <Text numberOfLines={1} className="flex-1 font-nunito-bold text-sm text-foreground">
            {c.otherPseudonym}
          </Text>
          {time ? <Text className="font-sans text-xs text-muted-foreground">{time}</Text> : null}
        </View>
        <Text numberOfLines={1} className="font-nunito-semibold text-xs text-primary">
          Sobre: {title}
        </Text>
        <View className="flex-row items-center justify-between gap-2">
          <Text numberOfLines={1} className="flex-1 font-sans text-xs text-muted-foreground">
            {lastMessagePreview(c.lastMessage)}
          </Text>
          {c.unreadCount > 0 ? (
            <View accessibilityLabel={unreadLabel(c.unreadCount)} className="min-w-5 items-center rounded-full bg-accent px-1.5 py-0.5">
              <Text className="font-nunito-bold text-xs text-white">{c.unreadCount}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

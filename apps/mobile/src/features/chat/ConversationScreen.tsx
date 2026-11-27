import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from "react-native";
import { Camera, ChevronLeft, ChevronRight, Mail, MapPin, MoreVertical, Send, ShieldAlert, UserRound } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CHAT_MESSAGE_MAX_LENGTH, colors, elevation, withAlpha, type ChatConversation, type ChatMessage, type ChatReportReason, type LatLng } from "@miaucha/shared";
import { IconButton, KEYBOARD_AVOIDING_BEHAVIOR, PrimaryButton } from "@/components";
import type { GetLocation } from "@/features/location/currentLocation";
import { occurrenceTitle } from "@/features/occurrences/OccurrenceDetails";
import type { PickedPhoto } from "@/features/pets/photos";
import type { ChatClient } from "./chatClient";
import type { ChatRealtime } from "./chatRealtime";
import { applyCatchUp, applyRead, catchUpMessages, mergeMessages, newestCreatedAt, sendsOnKey } from "./chatState";
import { ConversationOptions } from "./ConversationOptions";
import { MessageBubble } from "./MessageBubble";
import { centered, READING_MAX_WIDTH } from "@/lib/layout";

type Props = {
  conversationId: string;
  client: ChatClient;
  realtime: ChatRealtime;
  onBack: () => void;
  onOpenOccurrence: (occurrenceId: string) => void;
  onOpenLocation: (point: LatLng) => void;
  /** Uma foto da galeria, ou null se a pessoa desistiu. */
  pickPhoto: () => Promise<PickedPhoto | null>;
  getLocation: GetLocation;
  /** Pergunta antes de uma ação (Alert.alert na rota); resolve true para confirmar. */
  confirm: (title: string, message: string, action: string) => Promise<boolean>;
  now?: Date;
};

const message = (e: unknown, fallback: string) => (e instanceof Error ? e.message : fallback);

/** Conversa (ChatScreen do protótipo), com o aviso contra golpes fixo no topo. */
export function ConversationScreen({ conversationId, client, realtime, onBack, onOpenOccurrence, onOpenLocation, pickPhoto, getLocation, confirm, now }: Props) {
  const insets = useSafeAreaInsets();
  const [conversation, setConversation] = useState<ChatConversation | null>(null);
  const [loadError, setLoadError] = useState<string>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [showOptions, setShowOptions] = useState(false);
  const [busy, setBusy] = useState(false);
  const active = useRef(true);
  // Hora da mensagem mais nova que veio do servidor (carga, socket, recuperação). As enviadas por este aparelho
  // não contam: depois de uma queda, a recuperação busca até aqui, e não até a última mensagem na tela.
  const syncedAtRef = useRef<string | null>(null);

  const markRead = useCallback(() => {
    client.markRead(conversationId).catch(() => undefined);
  }, [client, conversationId]);

  const loadLatest = useCallback(async () => {
    try {
      const [found, page] = await Promise.all([client.get(conversationId), client.messages(conversationId)]);
      syncedAtRef.current = newestCreatedAt(syncedAtRef.current, page.messages);
      if (!active.current) return;
      setConversation(found);
      setMessages((current) => mergeMessages(current, page.messages));
      setNextCursor((current) => current ?? page.nextCursor);
      markRead();
    } catch (e) {
      if (active.current) setLoadError(message(e, "Não foi possível abrir a conversa"));
    }
  }, [client, conversationId, markRead]);

  useEffect(() => {
    active.current = true;
    void loadLatest();
    return () => {
      active.current = false;
    };
  }, [loadLatest]);

  useEffect(() => {
    const offs = [
      realtime.on("message:new", ({ conversationId: id, message: m }) => {
        if (id !== conversationId) return;
        syncedAtRef.current = newestCreatedAt(syncedAtRef.current, [m]);
        setMessages((current) => mergeMessages(current, [m]));
        if (!m.mine) markRead();
      }),
      realtime.on("message:read", ({ conversationId: id, readAt }) => {
        if (id === conversationId) setMessages((current) => applyRead(current, readAt));
      }),
      realtime.on("conversation:updated", ({ conversation: c }) => {
        if (c.id === conversationId) setConversation(c);
      }),
      // Depois de cair, busca o que chegou enquanto estava desconectado.
      realtime.onConnect(() => {
        catchUpMessages(syncedAtRef.current, (before) => client.messages(conversationId, before)).then((result) => {
          if (!active.current) return;
          syncedAtRef.current = newestCreatedAt(syncedAtRef.current, result.messages);
          setMessages((current) => applyCatchUp(current, result));
          if (result.reset) setNextCursor(result.nextCursor);
        }, () => undefined);
      }),
    ];
    return () => offs.forEach((off) => off());
  }, [realtime, client, conversationId, markRead]);

  async function loadOlder() {
    if (!nextCursor || loadingOlder) return;
    setLoadingOlder(true);
    try {
      const page = await client.messages(conversationId, nextCursor);
      setMessages((current) => mergeMessages(current, page.messages));
      setNextCursor(page.nextCursor);
    } catch (e) {
      setError(message(e, "Não foi possível carregar as mensagens anteriores"));
    } finally {
      setLoadingOlder(false);
    }
  }

  async function send(work: () => Promise<ChatMessage>, onError?: () => void) {
    setSending(true);
    setError(undefined);
    try {
      const sent = await work();
      setMessages((current) => mergeMessages(current, [sent]));
    } catch (e) {
      setError(message(e, "Não foi possível enviar"));
      onError?.();
    } finally {
      setSending(false);
    }
  }

  function sendText() {
    const typed = text;
    if (!typed.trim()) return;
    setText("");
    void send(() => client.sendText(conversationId, typed), () => setText(typed));
  }

  async function sendPhoto() {
    const photo = await pickPhoto().catch(() => null);
    if (photo) await send(() => client.sendPhoto(conversationId, photo));
  }

  async function sendLocation() {
    setError(undefined);
    const location = await getLocation();
    if (location.status !== "ok") {
      setError("Não foi possível obter sua localização");
      return;
    }
    await send(() => client.sendLocation(conversationId, location.coords));
  }

  async function update(work: () => Promise<ChatConversation>, done?: string) {
    setBusy(true);
    setError(undefined);
    try {
      setConversation(await work());
      setShowOptions(false);
      setNotice(done);
    } catch (e) {
      setError(message(e, "Não foi possível concluir"));
    } finally {
      setBusy(false);
    }
  }

  async function toggleBlock(c: ChatConversation) {
    if (!c.blockedByMe) {
      const ok = await confirm(
        "Bloquear esta pessoa?",
        "Vocês não poderão mais trocar mensagens e ela não poderá abrir conversas novas com você.",
        "Bloquear",
      );
      if (!ok) return;
    }
    await update(() => client.setBlocked(conversationId, !c.blockedByMe));
  }

  async function report(reason: ChatReportReason, details: string): Promise<boolean> {
    setBusy(true);
    try {
      await client.report(conversationId, reason, details);
      setShowOptions(false);
      setNotice("Denúncia enviada. Obrigado por avisar.");
      return true;
    } catch (e) {
      setError(message(e, "Não foi possível enviar a denúncia"));
      return false;
    } finally {
      setBusy(false);
    }
  }

  if (!conversation) {
    return (
      <View className="flex-1 items-center justify-center gap-4 bg-background p-5">
        {loadError ? (
          <>
            <Text className="text-center font-sans text-sm text-muted-foreground">{loadError}</Text>
            <PrimaryButton title="Voltar" variant="outline" onPress={onBack} />
          </>
        ) : (
          <ActivityIndicator color={colors.brand} />
        )}
      </View>
    );
  }

  const c = conversation;
  const title = occurrenceTitle(c.occurrence);

  return (
    <KeyboardAvoidingView className="flex-1 bg-background" behavior={KEYBOARD_AVOIDING_BEHAVIOR}>
      <View className="border-b border-border bg-white px-4 pb-3" style={{ paddingTop: insets.top + 12 }}>
        <View className="flex-row items-center gap-3" style={centered(READING_MAX_WIDTH)}>
        <IconButton label="Voltar" icon={<ChevronLeft size={22} color={colors.foreground} />} onPress={onBack} />
        <View className="h-11 w-11 items-center justify-center rounded-full bg-brand-soft">
          <UserRound size={20} color={colors.brand} />
        </View>
        <View className="flex-1">
          <Text accessibilityRole="header" numberOfLines={1} className="font-ui-extrabold text-base text-foreground">
            {c.otherPseudonym}
          </Text>
          <Text className="font-sans text-xs text-muted-foreground">{c.iAmAuthor ? "Quer ajudar no seu caso" : "Registrou esta ocorrência"}</Text>
        </View>
        <IconButton label="Opções da conversa" icon={<MoreVertical size={20} color={colors.foreground} />} onPress={() => setShowOptions((v) => !v)} />
        </View>
      </View>

      {showOptions ? (
        <ConversationOptions
          conversation={c}
          busy={busy}
          onToggleContact={() => void update(() => client.setContactConsent(conversationId, !c.contact.mine))}
          onToggleBlock={() => void toggleBlock(c)}
          onReport={report}
        />
      ) : null}

      <View className="gap-2 px-4 pt-3" style={centered(READING_MAX_WIDTH)}>
        <View className="flex-row items-start gap-2 rounded-2xl border p-3" style={{ backgroundColor: withAlpha(colors.seen, 0.1), borderColor: withAlpha(colors.seen, 0.35) }}>
          <ShieldAlert size={18} color={colors.foreground} />
          <Text className="flex-1 font-sans text-xs text-foreground">
            Nunca pague para reaver um pet nem passe códigos ou dados bancários. Denuncie pedidos de dinheiro.
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Ver a ocorrência de ${title}`}
          onPress={() => onOpenOccurrence(c.occurrence.id)}
          className="flex-row items-center gap-3 rounded-2xl bg-brand-soft p-3 active:opacity-80"
          style={{ minHeight: 48 }}
        >
          <View className="flex-1">
            <Text className="font-ui-bold text-sm text-foreground">Sobre o pet: {title}</Text>
            {c.occurrence.status === "resolved" ? <Text className="font-sans text-xs text-muted-foreground">Caso resolvido</Text> : null}
          </View>
          <ChevronRight size={18} color={colors.brand} />
        </Pressable>

        <ContactBanner conversation={c} busy={busy} onAccept={() => void update(() => client.setContactConsent(conversationId, true))} />
        {notice ? <Text className="text-center font-ui-semibold text-sm text-foreground">{notice}</Text> : null}
      </View>

      <FlatList
        inverted
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ ...centered(READING_MAX_WIDTH), padding: 16, gap: 12 }}
        renderItem={({ item }) => <MessageBubble message={item} now={now} onOpenLocation={onOpenLocation} />}
        onEndReached={() => void loadOlder()}
        onEndReachedThreshold={0.3}
        ListFooterComponent={
          nextCursor ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Carregar mensagens anteriores" onPress={() => void loadOlder()} className="items-center justify-center" style={{ minHeight: 44 }}>
              {loadingOlder ? (
                <ActivityIndicator color={colors.brand} />
              ) : (
                <Text className="font-ui-bold text-sm text-brand-deep">Carregar mensagens anteriores</Text>
              )}
            </Pressable>
          ) : undefined
        }
      />

      {error ? <Text className="px-4 pb-1 text-center font-ui-semibold text-xs text-lost">{error}</Text> : null}

      {c.canSend ? (
        <View className="border-t border-border bg-white px-3 pt-3" style={[{ paddingBottom: insets.bottom + 12 }, elevation.raised]}>
          <View className="flex-row items-end gap-2" style={centered(READING_MAX_WIDTH)}>
          <IconButton label="Enviar foto" icon={<Camera size={20} color={colors.foreground} />} onPress={() => void sendPhoto()} disabled={sending} />
          <IconButton label="Enviar minha localização aproximada" icon={<MapPin size={20} color={colors.foreground} />} onPress={() => void sendLocation()} disabled={sending} />
          <TextInput
            accessibilityLabel="Mensagem"
            placeholder="Mensagem..."
            placeholderTextColor={colors.mutedForeground}
            value={text}
            onChangeText={setText}
            maxLength={CHAT_MESSAGE_MAX_LENGTH}
            multiline
            onKeyPress={(e) => {
              const key = e.nativeEvent as unknown as { key: string; shiftKey?: boolean };
              if (sendsOnKey(Platform.OS, key.key, !!key.shiftKey)) {
                (e as unknown as { preventDefault?: () => void }).preventDefault?.();
                if (!sending && text.trim()) sendText();
              }
            }}
            className="max-h-28 flex-1 rounded-2xl bg-muted px-4 py-3 font-sans text-base text-foreground"
            style={{ minHeight: 44 }}
          />
          <IconButton label="Enviar" tone="brand" icon={<Send size={18} color={colors.white} />} onPress={sendText} disabled={sending || !text.trim()} />
          </View>
        </View>
      ) : (
        <View className="border-t border-border bg-white px-4 pt-3" style={{ paddingBottom: insets.bottom + 12 }}>
          <Text className="text-center font-sans text-sm text-muted-foreground">
            {c.blockedByMe ? "Você bloqueou esta pessoa." : "Não é possível enviar mensagens nesta conversa."}
          </Text>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

/** Opt-in duplo (CH-07): o e-mail só aparece quando os dois aceitam. */
function ContactBanner({ conversation: c, busy, onAccept }: { conversation: ChatConversation; busy: boolean; onAccept: () => void }) {
  if (c.contact.otherEmail) {
    return (
      <View className="flex-row items-center gap-3 rounded-2xl border border-border bg-white p-3">
        <Mail size={16} color={colors.brand} />
        <View className="flex-1">
          <Text className="font-sans text-xs text-muted-foreground">Contato de {c.otherPseudonym}</Text>
          <Text selectable className="font-ui-bold text-sm text-foreground">
            {c.contact.otherEmail}
          </Text>
        </View>
      </View>
    );
  }
  if (c.contact.mine) {
    return <Text className="text-center font-sans text-xs text-muted-foreground">Você aceitou trocar contato. Aguardando {c.otherPseudonym} aceitar.</Text>;
  }
  if (c.contact.theirs) {
    return (
      <View className="gap-2 rounded-2xl border border-border bg-white p-3">
        <Text className="font-sans text-xs text-foreground">{c.otherPseudonym} quer trocar contato. Se você aceitar, cada um vê o e-mail do outro.</Text>
        <PrimaryButton title="Aceitar e mostrar meu e-mail" variant="outline" loading={busy} onPress={onAccept} />
      </View>
    );
  }
  return null;
}

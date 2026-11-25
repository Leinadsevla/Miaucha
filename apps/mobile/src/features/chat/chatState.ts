import type { ChatConversation, ChatMessage, ChatMessagesPage } from "@miaucha/shared";
import type { ChatEvents } from "./chatRealtime";

/** Junta mensagens (páginas antigas, novas do socket, reenvios) sem repetir; mais novas primeiro. */
export function mergeMessages(current: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] {
  const byId = new Map(current.map((m) => [m.id, m]));
  for (const m of incoming) byId.set(m.id, m);
  return [...byId.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export type CatchUp = { messages: ChatMessage[]; reset: false } | { messages: ChatMessage[]; reset: true; nextCursor: string | null };

/**
 * Depois de reconectar, busca páginas para trás até alcançar `syncedAt`: a hora da mensagem mais nova que veio
 * do servidor antes da queda (carga, socket ou recuperação anterior). Não para em mensagens já conhecidas: uma
 * mensagem própria enviada por HTTP durante a queda é a mais nova e faria parar antes das que chegaram no meio.
 * Sem alcançar dentro de `maxPages`, devolve `reset` (a lista recomeça da última página buscada).
 */
export async function catchUpMessages(
  syncedAt: string | null,
  fetchPage: (before?: string) => Promise<ChatMessagesPage>,
  maxPages = 5,
): Promise<CatchUp> {
  const collected: ChatMessage[] = [];
  let cursor: string | undefined;
  // Nada sincronizado ainda (primeira carga pendente ou falhou): a página mais nova basta, não há buraco a fechar.
  const pages = syncedAt === null ? 1 : maxPages;
  for (let i = 0; i < pages; i++) {
    const page = await fetchPage(cursor);
    collected.push(...page.messages);
    if (!page.nextCursor || syncedAt === null || page.messages.some((m) => m.createdAt <= syncedAt)) {
      return { messages: collected, reset: false };
    }
    cursor = page.nextCursor;
  }
  return { messages: collected, reset: true, nextCursor: cursor ?? null };
}

/** A hora mais nova entre `current` e as mensagens (ISO 8601 compara como texto). */
export function newestCreatedAt(current: string | null, messages: readonly ChatMessage[]): string | null {
  return messages.reduce<string | null>((max, m) => (max === null || m.createdAt > max ? m.createdAt : max), current);
}

/**
 * Aplica o resultado do `catchUpMessages`. No reset, some o que é mais antigo que a última página buscada
 * (ficou um buraco antes dela), mas fica o que chegou pelo socket ou foi enviado enquanto as páginas carregavam.
 */
export function applyCatchUp(current: ChatMessage[], result: CatchUp): ChatMessage[] {
  if (!result.reset) return mergeMessages(current, result.messages);
  const oldest = result.messages.reduce<string | null>((min, m) => (min === null || m.createdAt < min ? m.createdAt : min), null);
  return mergeMessages(oldest === null ? [] : current.filter((m) => m.createdAt >= oldest), result.messages);
}

/** A outra pessoa leu até `readAt`: as minhas enviadas até lá ficam "lida" (CH-09). */
export function applyRead(messages: ChatMessage[], readAt: string): ChatMessage[] {
  return messages.map((m) => (m.mine && !m.readAt && m.createdAt <= readAt ? { ...m, readAt } : m));
}

/**
 * Mensagem nova na lista de conversas: atualiza a prévia, soma não lida (se não for minha nem da conversa
 * aberta) e sobe a conversa. `known: false` = conversa nova, a lista precisa ser buscada de novo.
 */
export function applyIncoming(
  list: ChatConversation[],
  { conversationId, message }: ChatEvents["message:new"],
  openConversationId?: string,
): { list: ChatConversation[]; known: boolean } {
  const current = list.find((c) => c.id === conversationId);
  if (!current) return { list, known: false };
  const repeated = current.lastMessage?.id === message.id;
  const countsAsUnread = !message.mine && conversationId !== openConversationId && !repeated;
  const updated = { ...current, lastMessage: message, unreadCount: current.unreadCount + (countsAsUnread ? 1 : 0) };
  return { list: [updated, ...list.filter((c) => c.id !== conversationId)], known: true };
}

export function upsertConversation(list: ChatConversation[], conversation: ChatConversation): ChatConversation[] {
  return list.some((c) => c.id === conversation.id)
    ? list.map((c) => (c.id === conversation.id ? conversation : c))
    : [conversation, ...list];
}

const pad = (n: number) => String(n).padStart(2, "0");

/** "14:05" hoje, "Ontem" ou "02/11". */
export function formatMessageTime(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  if (sameDay(date, now)) return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameDay(date, yesterday)) return "Ontem";
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}`;
}

export function lastMessagePreview(message: ChatMessage | null): string {
  if (!message) return "Nenhuma mensagem ainda";
  const body = message.kind === "photo" ? "Foto" : message.kind === "location" ? "Localização aproximada" : (message.text ?? "");
  return message.mine ? `Você: ${body}` : body;
}

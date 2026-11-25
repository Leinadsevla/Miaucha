import {
  maskContactInfo,
  publicPoint,
  validateChatText,
  type ChatConversation,
  type ChatMessage,
  type ChatMessagesPage,
  type ChatReportReason,
  type LatLng,
} from "@miaucha/shared";
import type { ApiSession } from "@/features/auth/apiSession";
import { uploadPhotoVia, type Uploader } from "@/features/pets/petsClient";
import { checkPhoto, type PickedPhoto } from "@/features/pets/photos";

export type ChatClient = {
  /** Abre (ou reabre) a conversa com o autor da ocorrência (CH-01). */
  start(occurrenceId: string): Promise<ChatConversation>;
  list(): Promise<ChatConversation[]>;
  get(id: string): Promise<ChatConversation>;
  /** Mais novas primeiro; `before` é o `nextCursor` da página anterior (CH-09). */
  messages(id: string, before?: string): Promise<ChatMessagesPage>;
  sendText(id: string, text: string): Promise<ChatMessage>;
  sendPhoto(id: string, photo: PickedPhoto): Promise<ChatMessage>;
  /** Manda o ponto do aparelho; a API guarda e mostra só um ponto aproximado (CH-05). */
  sendLocation(id: string, point: LatLng): Promise<ChatMessage>;
  markRead(id: string): Promise<void>;
  setContactConsent(id: string, consent: boolean): Promise<ChatConversation>;
  setBlocked(id: string, blocked: boolean): Promise<ChatConversation>;
  report(id: string, reason: ChatReportReason, details: string): Promise<void>;
};

export function createHttpChatClient({ session, upload }: { session: ApiSession; upload: Uploader }): ChatClient {
  const base = (id: string) => `/conversations/${encodeURIComponent(id)}`;
  const send = (id: string, body: object) => session.authed<ChatMessage>("POST", `${base(id)}/messages`, body);
  return {
    start: (occurrenceId) => session.authed<ChatConversation>("POST", "/conversations", { occurrenceId }),
    list: () => session.authed<ChatConversation[]>("GET", "/conversations"),
    get: (id) => session.authed<ChatConversation>("GET", base(id)),
    messages: (id, before) =>
      session.authed<ChatMessagesPage>("GET", `${base(id)}/messages${before ? `?before=${encodeURIComponent(before)}` : ""}`),
    sendText: (id, text) => send(id, { text }),
    async sendPhoto(id, photo) {
      const uploaded = await uploadPhotoVia(session, upload, base(id), photo);
      return send(id, { photoId: uploaded.id });
    },
    sendLocation: (id, point) => send(id, { location: { lat: point.lat, lng: point.lng } }),
    async markRead(id) {
      await session.authed("POST", `${base(id)}/read`);
    },
    setContactConsent: (id, consent) => session.authed<ChatConversation>(consent ? "POST" : "DELETE", `${base(id)}/contact-consent`),
    setBlocked: (id, blocked) => session.authed<ChatConversation>(blocked ? "POST" : "DELETE", `${base(id)}/block`),
    async report(id, reason, details) {
      await session.authed("POST", `${base(id)}/report`, { reason, details });
    },
  };
}

/** Chat em memória para desenvolver as telas sem a API. */
export function createMockChatClient(): ChatClient {
  const conversations: ChatConversation[] = [];
  const messages = new Map<string, ChatMessage[]>();
  let counter = 0;

  const find = (id: string) => {
    const found = conversations.find((c) => c.id === id);
    if (!found) throw new Error("Conversa não encontrada");
    return found;
  };

  function push(id: string, data: Pick<ChatMessage, "kind" | "text" | "photoUrl" | "location">): ChatMessage {
    const conversation = find(id);
    if (!conversation.canSend) throw new Error("Não é possível enviar mensagens nesta conversa");
    const message: ChatMessage = { id: `msg-${++counter}`, conversationId: id, mine: true, createdAt: new Date().toISOString(), readAt: null, ...data };
    messages.get(id)!.unshift(message);
    conversation.lastMessage = message;
    return message;
  }

  return {
    async start(occurrenceId) {
      const existing = conversations.find((c) => c.occurrence.id === occurrenceId);
      if (existing) return existing;
      const conversation: ChatConversation = {
        id: `conversa-${conversations.length + 1}`,
        occurrence: { id: occurrenceId, type: "lost", species: "dog", petName: "Thor", status: "open", photoUrl: null },
        otherPseudonym: "Tutor Laranja 42",
        iAmAuthor: false,
        lastMessage: null,
        unreadCount: 0,
        blockedByMe: false,
        canSend: true,
        contact: { mine: false, theirs: false, otherEmail: null },
        createdAt: new Date().toISOString(),
      };
      conversations.unshift(conversation);
      messages.set(conversation.id, []);
      return conversation;
    },
    list: async () =>
      [...conversations].sort((a, b) => (b.lastMessage?.createdAt ?? b.createdAt).localeCompare(a.lastMessage?.createdAt ?? a.createdAt)),
    get: async (id) => find(id),
    async messages(id, before) {
      const all = messages.get(find(id).id)!;
      const start = before ? all.findIndex((m) => m.id === before) + 1 : 0;
      const page = all.slice(start, start + 30);
      return { messages: page, nextCursor: start + 30 < all.length ? page[page.length - 1].id : null };
    },
    async sendText(id, text) {
      const problem = validateChatText(text);
      if (problem) throw new Error(problem);
      return push(id, { kind: "text", text: maskContactInfo(text.trim()), photoUrl: null, location: null });
    },
    async sendPhoto(id, photo) {
      const problem = checkPhoto(photo);
      if (problem) throw new Error(problem);
      return push(id, { kind: "photo", text: null, photoUrl: photo.uri, location: null });
    },
    sendLocation: async (id, point) => push(id, { kind: "location", text: null, photoUrl: null, location: publicPoint(point.lat, point.lng) }),
    async markRead(id) {
      find(id).unreadCount = 0;
    },
    async setContactConsent(id, consent) {
      const c = find(id);
      c.contact = { ...c.contact, mine: consent };
      return c;
    },
    async setBlocked(id, blocked) {
      const c = find(id);
      Object.assign(c, { blockedByMe: blocked, canSend: !blocked });
      return c;
    },
    async report() {},
  };
}

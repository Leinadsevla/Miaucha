import type { LatLng } from "./geo";
import type { OccurrenceStatus, Species } from "./types";
import type { OccurrenceType } from "./theme";

export const CHAT_MESSAGE_MAX_LENGTH = 2000;
export const CHAT_REPORT_DETAILS_MAX_LENGTH = 1000;
/** Mensagens por página no histórico (CH-09). */
export const CHAT_PAGE_SIZE = 30;

export const MASKED_PHONE = "[telefone oculto]";
export const MASKED_EMAIL = "[e-mail oculto]";
export const MASKED_LINK = "[link oculto]";

export type ChatMessageKind = "text" | "photo" | "location";

/**
 * Mensagem como a API do chat devolve (HTTP e WebSocket). Nunca traz o id, o nome real ou o e-mail de quem
 * enviou (CH-02): só `mine`, calculado para quem recebe.
 */
export type ChatMessage = {
  id: string;
  conversationId: string;
  mine: boolean;
  kind: ChatMessageKind;
  /** Já mascarado (CH-06). */
  text: string | null;
  /** URL assinada que expira (NF-05). */
  photoUrl: string | null;
  /** Ponto aproximado (~150 m do real), nunca o exato (CH-05). */
  location: LatLng | null;
  createdAt: string;
  /** Quando o destinatário leu (CH-09). */
  readAt: string | null;
};

export type ChatConversation = {
  id: string;
  occurrence: {
    id: string;
    type: OccurrenceType;
    species: Species;
    petName: string | null;
    status: OccurrenceStatus;
    photoUrl: string | null;
  };
  /** O outro participante só aparece pelo pseudônimo (CH-02). */
  otherPseudonym: string;
  /** Se quem pede é o autor da ocorrência. */
  iAmAuthor: boolean;
  lastMessage: ChatMessage | null;
  unreadCount: number;
  blockedByMe: boolean;
  /** Falso quando há bloqueio entre os dois (CH-08). */
  canSend: boolean;
  /** Opt-in duplo (CH-07): `otherEmail` só vem quando os dois aceitaram. */
  contact: { mine: boolean; theirs: boolean; otherEmail: string | null };
  createdAt: string;
};

export type ChatMessagesPage = { messages: ChatMessage[]; nextCursor: string | null };

export type ChatReportReason = "scam" | "harassment" | "spam" | "fake" | "other";

export const CHAT_REPORT_REASONS: { value: ChatReportReason; label: string }[] = [
  { value: "scam", label: "Golpe ou pedido de dinheiro" },
  { value: "harassment", label: "Ofensa ou assédio" },
  { value: "spam", label: "Spam ou propaganda" },
  { value: "fake", label: "Perfil ou ocorrência falsa" },
  { value: "other", label: "Outro motivo" },
];

export function isChatReportReason(value: unknown): value is ChatReportReason {
  return CHAT_REPORT_REASONS.some((r) => r.value === value);
}

export function validateChatText(text: string): string | null {
  if (!text.trim()) return "Escreva uma mensagem";
  if (text.length > CHAT_MESSAGE_MAX_LENGTH) return `A mensagem pode ter até ${CHAT_MESSAGE_MAX_LENGTH} caracteres`;
  return null;
}

// ─── Mascaramento (CH-06) ────────────────────────────────────────────────────
// Sem lookbehind: o caractere anterior é capturado e devolvido, para a regex rodar em qualquer motor.

const TRAILING_PUNCTUATION = /[.,!?;:)\]]+$/;

/** Devolve a pontuação final ("Veja exemplo.com.") para fora do trecho mascarado. */
function maskKeepingPunctuation(match: string, mask: string): string {
  const trailing = match.match(TRAILING_PUNCTUATION)?.[0] ?? "";
  return mask + trailing;
}

const URL_WITH_SCHEME = /\bhttps?:\/\/[^\s<>"]+/gi;
const WWW = /\bwww\.[^\s<>"]+/gi;
const TLDS =
  "com|net|org|br|io|me|app|info|biz|link|site|online|xyz|ly|gl|co|tv|gov|edu|us|uk|dev|page|store|shop|blog|club|top|live|pt";
const BARE_DOMAIN = new RegExp(
  `(^|[^\\w@.-])((?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\\.)+(?:${TLDS})(?![a-z0-9-])(?:\\/[^\\s<>"]*)?)`,
  "gi",
);
const EMAIL =
  /(^|[^\w.%+-])([a-z0-9._%+-]+(?:\s*@\s*|\s*\(at\)\s*|\s*\[at\]\s*|\s+arroba\s+)[a-z0-9-]+(?:\.[a-z0-9-]+|\s+ponto\s+[a-z0-9-]+)+)/gi;
/** Candidato a telefone: dígitos com até 3 separadores (espaço, ponto, hífen, parênteses) entre eles. */
const PHONE_CANDIDATE = /(^|[^\w$])(\+?\(?\d(?:[\s.()-]{0,3}\d)+)/g;

const DATE = /^\d{1,2}[.-]\d{1,2}[.-]\d{2,4}$/;
const CEP = /^\d{5}-\d{3}$/;
const THOUSANDS = /^\d{1,3}(?:\.\d{3})+$/;
/** Telefone de 8 ou 9 dígitos só nos formatos usuais (evita "dias 12 13 14 15"). */
const SHORT_PHONE_GROUPS = new Set(["8", "9", "4,4", "5,4", "1,4,4"]);

function looksLikePhone(candidate: string, before: string): boolean {
  const groups = candidate.match(/\d+/g) ?? [];
  const digits = groups.join("");
  // 8 (fixo sem DDD) a 14 (+55 (0xx) 9xxxx-xxxx). Microchip tem 15.
  if (digits.length < 8 || digits.length > 14) return false;
  if (/R\$\s*$/i.test(before)) return false;
  if (DATE.test(candidate) || CEP.test(candidate) || THOUSANDS.test(candidate)) return false;
  if (digits.length <= 9) return SHORT_PHONE_GROUPS.has(groups.map((g) => g.length).join(","));
  return true;
}

/**
 * CH-06: troca telefones, e-mails e links por marcadores antes de salvar a mensagem.
 * Não pega números por extenso ("nove oito sete...") nem perfis de rede social ("@fulano").
 */
export function maskContactInfo(text: string): string {
  return text
    .replace(URL_WITH_SCHEME, (m) => maskKeepingPunctuation(m, MASKED_LINK))
    .replace(WWW, (m) => maskKeepingPunctuation(m, MASKED_LINK))
    .replace(EMAIL, (_m, before: string, email: string) => before + maskKeepingPunctuation(email, MASKED_EMAIL))
    .replace(BARE_DOMAIN, (_m, before: string, domain: string) => before + maskKeepingPunctuation(domain, MASKED_LINK))
    .replace(PHONE_CANDIDATE, (m, before: string, candidate: string, offset: number, whole: string) => {
      const textBefore = whole.slice(0, offset) + before;
      // O candidato pode terminar em ")" ou espaço que não fazem parte do número.
      const core = candidate.replace(/[\s.(-]+$/, "");
      const rest = candidate.slice(core.length);
      return looksLikePhone(core, textBefore) ? before + MASKED_PHONE + rest : m;
    });
}

const PREVIEW_MAX_LENGTH = 80;

/** Texto do push (CH-04): trecho da mensagem (já mascarada) ou o tipo do anexo. */
export function chatPushPreview(message: Pick<ChatMessage, "kind" | "text">): string {
  if (message.kind === "photo") return "Enviou uma foto";
  if (message.kind === "location") return "Enviou uma localização aproximada";
  const text = (message.text ?? "").trim().replace(/\s+/g, " ");
  return text.length > PREVIEW_MAX_LENGTH ? `${text.slice(0, PREVIEW_MAX_LENGTH - 1)}…` : text;
}

import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import {
  CHAT_PAGE_SIZE,
  CHAT_REPORT_DETAILS_MAX_LENGTH,
  chatPushPreview,
  isChatReportReason,
  isValidLatLng,
  maskContactInfo,
  occurrenceExpiryCutoff,
  validateChatText,
  type ChatConversation,
  type ChatMessage,
  type ChatMessagesPage,
} from "@miaucha/shared";
import type { Pool } from "pg";
import { isUniqueViolation, transaction } from "../db/transaction";
import type { PhotoStorage } from "../storage/photo-storage";
import { PhotoUploads, UUID_RE } from "../storage/photo-uploads";
import type { AppConfig } from "../config";
import { APP_CONFIG, PG_POOL, PHOTO_STORAGE } from "../tokens";
import { chatLocationPoint } from "./chat-location";
import { ChatGateway } from "./chat.gateway";
import { CHAT_PUSH_SENDER, type ChatPushSender } from "./push-sender";

/** Uma conversa já pode ter centenas de fotos; o limite só evita abuso do storage. */
export const MAX_CHAT_PHOTOS = 200;

const notFound = () => new NotFoundException("Conversa não encontrada");
const cannotSend = () => new ForbiddenException("Não é possível enviar mensagens nesta conversa");

type ConversationRow = {
  id: string;
  occurrence_id: string;
  i_am_author: boolean;
  my_consent: boolean;
  their_consent: boolean;
  other_pseudonym: string;
  /** Só vem preenchido com o opt-in dos dois e sem bloqueio (decidido no SQL). */
  other_email: string | null;
  blocked_by_me: boolean;
  blocked_me: boolean;
  unread: number;
  o_type: ChatConversation["occurrence"]["type"];
  o_species: ChatConversation["occurrence"]["species"];
  o_pet_name: string | null;
  o_status: ChatConversation["occurrence"]["status"];
  o_photo_key: string | null;
  created_at: Date;
};

type MessageRow = {
  id: string;
  conversation_id: string;
  mine: boolean;
  kind: ChatMessage["kind"];
  body: string | null;
  object_key: string | null;
  lat: number | null;
  lng: number | null;
  created_at: Date;
  read_at: Date | null;
  seq: string;
};

/** Participação de `userId` numa conversa, com o id do outro (só para uso interno). */
type Membership = { id: string; otherId: string; iAmAuthor: boolean; blocked: boolean };

/**
 * Visão da conversa para `$1` (quem pede). O outro participante aparece só pelo pseudônimo (CH-02);
 * o e-mail só com o opt-in dos dois e sem bloqueio entre eles (CH-07).
 */
const CONVERSATION_SELECT = `
  with base as (
    select c.*, (c.author_id = $1) as i_am_author,
           case when c.author_id = $1 then c.requester_id else c.author_id end as other_id
      from conversations c
     where c.author_id = $1 or c.requester_id = $1
  )
  select b.id, b.occurrence_id, b.i_am_author, b.created_at,
         (case when b.i_am_author then b.author_contact_consent_at else b.requester_contact_consent_at end) is not null as my_consent,
         (case when b.i_am_author then b.requester_contact_consent_at else b.author_contact_consent_at end) is not null as their_consent,
         ou.pseudonym as other_pseudonym,
         case when b.author_contact_consent_at is not null and b.requester_contact_consent_at is not null
                   and not exists (select 1 from chat_blocks k where (k.blocker_id = $1 and k.blocked_id = b.other_id)
                                                                 or (k.blocker_id = b.other_id and k.blocked_id = $1))
              then ou.email end as other_email,
         exists (select 1 from chat_blocks k where k.blocker_id = $1 and k.blocked_id = b.other_id) as blocked_by_me,
         exists (select 1 from chat_blocks k where k.blocker_id = b.other_id and k.blocked_id = $1) as blocked_me,
         (select count(*)::int from chat_messages m where m.conversation_id = b.id and m.sender_id <> $1 and m.read_at is null) as unread,
         o.type as o_type, o.species as o_species, o.pet_name as o_pet_name, o.status as o_status,
         (select ph.object_key from occurrence_photos ph where ph.occurrence_id = o.id and ph.uploaded_at is not null
           order by ph.uploaded_at, ph.id limit 1) as o_photo_key,
         coalesce(b.last_message_at, b.created_at) as activity
    from base b
    join occurrences o on o.id = b.occurrence_id
    join users ou on ou.id = b.other_id`;

/** Colunas públicas de uma mensagem para `$1`. Nunca o `sender_id`: só se é de quem pede. */
const MESSAGE_SELECT = `
  select m.id, m.conversation_id, m.sender_id = $1 as mine, m.kind, m.body, ph.object_key,
         st_y(m.location::geometry) as lat, st_x(m.location::geometry) as lng, m.created_at, m.read_at, m.seq
    from chat_messages m left join chat_photos ph on ph.id = m.photo_id and ph.uploaded_at is not null`;

@Injectable()
export class ChatService {
  private readonly photos: PhotoUploads;
  private readonly logger = new Logger(ChatService.name);

  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    @Inject(PHOTO_STORAGE) storage: PhotoStorage,
    @Inject(CHAT_PUSH_SENDER) private readonly push: ChatPushSender,
    private readonly gateway: ChatGateway,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {
    this.photos = new PhotoUploads(pool, storage, {
      photosTable: "chat_photos",
      parentTable: "conversations",
      parentColumn: "conversation_id",
      ownerColumn: ["author_id", "requester_id"],
      keyPrefix: "chat",
      maxPhotos: MAX_CHAT_PHOTOS,
      tooManyMessage: "Esta conversa chegou ao limite de fotos",
      notFound,
    });
  }

  // ─── Conversas ──────────────────────────────────────────────────────────────

  /** CH-01: idempotente; só com ocorrência aberta e não expirada; nunca com o próprio autor nem com bloqueio. */
  async start(userId: string, occurrenceId: string): Promise<ChatConversation> {
    if (!UUID_RE.test(occurrenceId)) throw new NotFoundException("Ocorrência não encontrada");
    const { rows } = await this.pool.query<{ author_id: string; active: boolean; existing: string | null; blocked: boolean }>(
      `select o.author_id, (o.status = 'open' and o.updated_at > $3) as active,
              (select c.id from conversations c where c.occurrence_id = o.id and c.requester_id = $2) as existing,
              exists (select 1 from chat_blocks k where (k.blocker_id = $2 and k.blocked_id = o.author_id)
                                                     or (k.blocker_id = o.author_id and k.blocked_id = $2)) as blocked
         from occurrences o where o.id = $1`,
      [occurrenceId, userId, occurrenceExpiryCutoff()],
    );
    const occurrence = rows[0];
    if (!occurrence) throw new NotFoundException("Ocorrência não encontrada");
    if (occurrence.author_id === userId) throw new BadRequestException("Você não pode conversar com você mesmo");
    if (occurrence.existing) return this.view(userId, occurrence.existing);
    if (!occurrence.active) throw new ConflictException("Esta ocorrência não está mais aberta");
    if (occurrence.blocked) throw new ForbiddenException("Não é possível conversar com esta pessoa");

    await this.pool.query(
      `insert into conversations (occurrence_id, author_id, requester_id) values ($1, $2, $3)
       on conflict (occurrence_id, requester_id) do nothing`,
      [occurrenceId, occurrence.author_id, userId],
    );
    const created = await this.pool.query<{ id: string }>("select id from conversations where occurrence_id = $1 and requester_id = $2", [
      occurrenceId,
      userId,
    ]);
    return this.view(userId, created.rows[0].id);
  }

  async list(userId: string): Promise<ChatConversation[]> {
    const { rows } = await this.pool.query<ConversationRow>(`${CONVERSATION_SELECT} order by activity desc, b.id`, [userId]);
    return this.toConversations(userId, rows);
  }

  async view(userId: string, conversationId: string): Promise<ChatConversation> {
    if (!UUID_RE.test(conversationId)) throw notFound();
    const { rows } = await this.pool.query<ConversationRow>(`${CONVERSATION_SELECT} where b.id = $2`, [userId, conversationId]);
    if (!rows[0]) throw notFound();
    return (await this.toConversations(userId, rows))[0];
  }

  private async membership(userId: string, conversationId: string): Promise<Membership> {
    if (!UUID_RE.test(conversationId)) throw notFound();
    const { rows } = await this.pool.query<{ id: string; other_id: string; i_am_author: boolean; blocked: boolean }>(
      `select c.id, c.author_id = $2 as i_am_author,
              case when c.author_id = $2 then c.requester_id else c.author_id end as other_id,
              exists (select 1 from chat_blocks k
                       where (k.blocker_id = c.author_id and k.blocked_id = c.requester_id)
                          or (k.blocker_id = c.requester_id and k.blocked_id = c.author_id)) as blocked
         from conversations c where c.id = $1 and (c.author_id = $2 or c.requester_id = $2)`,
      [conversationId, userId],
    );
    if (!rows[0]) throw notFound();
    return { id: rows[0].id, otherId: rows[0].other_id, iAmAuthor: rows[0].i_am_author, blocked: rows[0].blocked };
  }

  // ─── Mensagens ──────────────────────────────────────────────────────────────

  /** CH-09: mais novas primeiro; `before` é o id da mensagem mais antiga já carregada. */
  async messages(userId: string, conversationId: string, query: { before?: unknown; limit?: unknown }): Promise<ChatMessagesPage> {
    await this.membership(userId, conversationId);
    const limitNumber = Number(query.limit ?? CHAT_PAGE_SIZE);
    const limit = Number.isInteger(limitNumber) && limitNumber >= 1 ? Math.min(limitNumber, CHAT_PAGE_SIZE) : CHAT_PAGE_SIZE;

    const params: unknown[] = [userId, conversationId];
    let cursor = "";
    if (query.before !== undefined && query.before !== "") {
      if (typeof query.before !== "string" || !UUID_RE.test(query.before)) throw new BadRequestException("Cursor inválido");
      const found = await this.pool.query<{ seq: string }>("select seq from chat_messages where id = $1 and conversation_id = $2", [
        query.before,
        conversationId,
      ]);
      if (!found.rows[0]) throw new BadRequestException("Cursor inválido");
      params.push(found.rows[0].seq);
      cursor = "and m.seq < $3";
    }
    params.push(limit + 1);
    const { rows } = await this.pool.query<MessageRow>(
      `${MESSAGE_SELECT} where m.conversation_id = $2 ${cursor} order by m.seq desc limit $${params.length}`,
      params,
    );
    const page = rows.slice(0, limit);
    return {
      messages: await Promise.all(page.map((row) => this.toMessage(row))),
      nextCursor: rows.length > limit ? page[page.length - 1].id : null,
    };
  }

  /** Texto (mascarado, CH-06), foto já confirmada ou localização aproximada (CH-05). */
  async send(userId: string, conversationId: string, body: unknown): Promise<ChatMessage> {
    const member = await this.membership(userId, conversationId);
    if (member.blocked) throw cannotSend();
    const input = (body ?? {}) as { text?: unknown; photoId?: unknown; location?: unknown };

    let id: string;
    if (input.text !== undefined) {
      const text = typeof input.text === "string" ? input.text : "";
      const problem = validateChatText(text);
      if (problem) throw new BadRequestException(problem);
      id = await this.insertMessage(conversationId, userId, "text", { body: maskContactInfo(text.trim()) });
    } else if (input.photoId !== undefined) {
      id = await this.insertPhotoMessage(conversationId, userId, input.photoId);
    } else if (input.location !== undefined) {
      const { lat, lng } = (input.location ?? {}) as { lat?: unknown; lng?: unknown };
      if (!isValidLatLng(lat, lng)) throw new BadRequestException("Localização inválida");
      // Só o ponto aproximado chega ao banco: o exato não fica guardado em lugar nenhum.
      const approx = chatLocationPoint(this.config.codeSecret, userId, { lat: lat as number, lng: lng as number });
      id = await this.insertMessage(conversationId, userId, "location", { location: approx });
    } else {
      throw new BadRequestException("Envie um texto, uma foto ou uma localização");
    }

    const forSender = await this.messageView(userId, id);
    await this.deliver(member, userId, forSender);
    return forSender;
  }

  private async insertPhotoMessage(conversationId: string, userId: string, photoId: unknown): Promise<string> {
    const invalid = () => new BadRequestException("Foto não encontrada ou ainda não enviada");
    if (typeof photoId !== "string" || !UUID_RE.test(photoId)) throw invalid();
    const { rows } = await this.pool.query(
      `select 1 from chat_photos ph where ph.id = $1 and ph.conversation_id = $2 and ph.uploaded_at is not null
          and not exists (select 1 from chat_messages m where m.photo_id = ph.id)`,
      [photoId, conversationId],
    );
    if (!rows[0]) throw invalid();
    try {
      return await this.insertMessage(conversationId, userId, "photo", { photoId });
    } catch (error) {
      if (isUniqueViolation(error)) throw invalid();
      throw error;
    }
  }

  private insertMessage(
    conversationId: string,
    senderId: string,
    kind: ChatMessage["kind"],
    data: { body?: string; photoId?: string; location?: { lat: number; lng: number } },
  ): Promise<string> {
    return transaction(this.pool, async (client) => {
      const { rows } = await client.query<{ id: string; created_at: Date }>(
        `insert into chat_messages (conversation_id, sender_id, kind, body, photo_id, location)
         values ($1, $2, $3, $4, $5,
                 case when $6::float8 is null then null else st_setsrid(st_makepoint($6, $7), 4326)::geography end)
         returning id, created_at`,
        [conversationId, senderId, kind, data.body ?? null, data.photoId ?? null, data.location?.lng ?? null, data.location?.lat ?? null],
      );
      await client.query("update conversations set last_message_at = $2 where id = $1", [conversationId, rows[0].created_at]);
      return rows[0].id;
    });
  }

  private async messageView(viewerId: string, messageId: string): Promise<ChatMessage> {
    const { rows } = await this.pool.query<MessageRow>(`${MESSAGE_SELECT} where m.id = $2`, [viewerId, messageId]);
    return this.toMessage(rows[0]);
  }

  /** Socket para os dois (cada um com `mine` do seu ponto de vista) e push se o destinatário estiver offline (CH-04). */
  private async deliver(member: Membership, senderId: string, forSender: ChatMessage) {
    const forRecipient: ChatMessage = { ...forSender, mine: false };
    this.gateway.emitTo(senderId, "message:new", { conversationId: member.id, message: forSender });
    this.gateway.emitTo(member.otherId, "message:new", { conversationId: member.id, message: forRecipient });

    try {
      if (await this.gateway.isOnline(member.otherId)) return;
      const { rows } = await this.pool.query<{ pseudonym: string }>("select pseudonym from users where id = $1", [senderId]);
      await this.push.send({
        userId: member.otherId,
        title: rows[0]?.pseudonym ?? "Miaucha",
        body: chatPushPreview(forSender),
        data: { conversationId: member.id },
      });
    } catch (error) {
      // O push é melhor esforço: a mensagem já foi salva e entregue pelo socket.
      this.logger.warn(`Falha ao enviar push: ${String(error)}`);
    }
  }

  /** CH-09: marca como lidas as mensagens recebidas e avisa quem enviou. */
  async markRead(userId: string, conversationId: string): Promise<void> {
    const member = await this.membership(userId, conversationId);
    const { rows } = await this.pool.query<{ read_at: Date }>(
      `update chat_messages set read_at = now()
        where conversation_id = $1 and sender_id <> $2 and read_at is null
        returning read_at`,
      [conversationId, userId],
    );
    if (rows[0]) {
      this.gateway.emitTo(member.otherId, "message:read", { conversationId, readAt: rows[0].read_at.toISOString() });
    }
  }

  // ─── Fotos ──────────────────────────────────────────────────────────────────

  async requestUpload(userId: string, conversationId: string, contentType: string) {
    const member = await this.membership(userId, conversationId);
    if (member.blocked) throw cannotSend();
    return this.photos.requestUpload(userId, conversationId, contentType);
  }

  confirmUpload(userId: string, conversationId: string, photoId: string) {
    return this.photos.confirmUpload(userId, conversationId, photoId);
  }

  // ─── Contato, bloqueio e denúncia ──────────────────────────────────────────

  /** CH-07: cada um aceita (ou desiste) por si; o e-mail só aparece com os dois. */
  async setContactConsent(userId: string, conversationId: string, consent: boolean): Promise<ChatConversation> {
    const member = await this.membership(userId, conversationId);
    const column = member.iAmAuthor ? "author_contact_consent_at" : "requester_contact_consent_at";
    await this.pool.query(
      `update conversations set ${column} = case when $2 then coalesce(${column}, now()) else null end where id = $1`,
      [conversationId, consent],
    );
    return this.notifyUpdated(userId, member);
  }

  /** CH-08: o bloqueio vale para o par (todas as conversas entre os dois e conversas novas). */
  async setBlocked(userId: string, conversationId: string, blocked: boolean): Promise<ChatConversation> {
    const member = await this.membership(userId, conversationId);
    if (blocked) {
      await this.pool.query("insert into chat_blocks (blocker_id, blocked_id) values ($1, $2) on conflict do nothing", [
        userId,
        member.otherId,
      ]);
    } else {
      await this.pool.query("delete from chat_blocks where blocker_id = $1 and blocked_id = $2", [userId, member.otherId]);
    }
    return this.notifyUpdated(userId, member);
  }

  async report(userId: string, conversationId: string, body: unknown): Promise<void> {
    const member = await this.membership(userId, conversationId);
    const { reason, details } = (body ?? {}) as { reason?: unknown; details?: unknown };
    if (!isChatReportReason(reason)) throw new BadRequestException("Escolha o motivo da denúncia");
    const text = typeof details === "string" ? details.trim() : "";
    if (text.length > CHAT_REPORT_DETAILS_MAX_LENGTH) {
      throw new BadRequestException(`Os detalhes podem ter até ${CHAT_REPORT_DETAILS_MAX_LENGTH} caracteres`);
    }
    await this.pool.query(
      "insert into chat_reports (conversation_id, reporter_id, reported_id, reason, details) values ($1, $2, $3, $4, $5)",
      [conversationId, userId, member.otherId, reason, text || null],
    );
  }

  /** Avisa os dois participantes, cada um com a sua visão da conversa. */
  private async notifyUpdated(userId: string, member: Membership): Promise<ChatConversation> {
    const [mine, theirs] = await Promise.all([this.view(userId, member.id), this.view(member.otherId, member.id)]);
    this.gateway.emitTo(userId, "conversation:updated", { conversation: mine });
    this.gateway.emitTo(member.otherId, "conversation:updated", { conversation: theirs });
    return mine;
  }

  // ─── Visões públicas ───────────────────────────────────────────────────────

  private async toConversations(viewerId: string, rows: ConversationRow[]): Promise<ChatConversation[]> {
    if (rows.length === 0) return [];
    const { rows: last } = await this.pool.query<MessageRow>(
      `select distinct on (sub.conversation_id) sub.* from (${MESSAGE_SELECT} where m.conversation_id = any($2::uuid[])) sub
        order by sub.conversation_id, sub.seq desc`,
      [viewerId, rows.map((r) => r.id)],
    );
    return Promise.all(
      rows.map(async (row) => {
        const lastRow = last.find((m) => m.conversation_id === row.id);
        return {
          id: row.id,
          occurrence: {
            id: row.occurrence_id,
            type: row.o_type,
            species: row.o_species,
            petName: row.o_pet_name,
            status: row.o_status,
            photoUrl: row.o_photo_key ? await this.photos.signedUrl(row.o_photo_key) : null,
          },
          otherPseudonym: row.other_pseudonym,
          iAmAuthor: row.i_am_author,
          lastMessage: lastRow ? await this.toMessage(lastRow) : null,
          unreadCount: row.unread,
          blockedByMe: row.blocked_by_me,
          canSend: !row.blocked_by_me && !row.blocked_me,
          contact: { mine: row.my_consent, theirs: row.their_consent, otherEmail: row.other_email },
          createdAt: row.created_at.toISOString(),
        };
      }),
    );
  }

  private async toMessage(row: MessageRow): Promise<ChatMessage> {
    return {
      id: row.id,
      conversationId: row.conversation_id,
      mine: row.mine,
      kind: row.kind,
      text: row.body,
      photoUrl: row.object_key ? await this.photos.signedUrl(row.object_key) : null,
      location: row.lat !== null && row.lng !== null ? { lat: row.lat, lng: row.lng } : null,
      createdAt: row.created_at.toISOString(),
      readAt: row.read_at ? row.read_at.toISOString() : null,
    };
  }
}

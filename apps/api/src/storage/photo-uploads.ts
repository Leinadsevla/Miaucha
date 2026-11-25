import { BadRequestException, ConflictException } from "@nestjs/common";
import { MAX_PHOTO_BYTES, isAllowedPhotoType } from "@miaucha/shared";
import { randomUUID } from "node:crypto";
import type { Pool } from "pg";
import { transaction } from "../db/transaction";
import { SIGNATURE_BYTES, detectImageType } from "./image-signature";
import type { PhotoStorage } from "./photo-storage";

export const UPLOAD_URL_TTL_SECONDS = 300;
export const DOWNLOAD_URL_TTL_SECONDS = 3600;
/** Pedidos de upload ainda não confirmados contam no limite de fotos só durante esta janela. */
const PENDING_UPLOAD_WINDOW_MINUTES = 10;
/** Por quanto tempo um confirm reserva a foto enquanto confere o storage. */
const CONFIRM_CLAIM_SECONDS = 60;
/** Quanto um segundo confirm da mesma foto espera o primeiro terminar, e de quanto em quanto confere. */
const CONFIRM_WAIT_MS = 15_000;
const CONFIRM_POLL_MS = 200;

const EXTENSIONS: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Chave que a URL de upload assinada aponta; a foto só vai para a chave final depois de conferida. */
const pendingKey = (objectKey: string) => `pending/${objectKey}`;

/**
 * Onde ficam as fotos de um tipo de registro (pet, ocorrência). Os nomes de tabela e coluna são
 * constantes do código, nunca vêm do cliente.
 */
export type PhotoSpec = {
  photosTable: string;
  parentTable: string;
  /** Coluna da tabela de fotos que aponta para o registro. */
  parentColumn: string;
  /** Coluna do registro com o id do dono (ou várias: qualquer uma delas serve, como os dois participantes de uma conversa). */
  ownerColumn: string | string[];
  /** Prefixo da chave no bucket (ex.: "pets" → pets/<id>/<foto>.jpg). */
  keyPrefix: string;
  maxPhotos: number;
  tooManyMessage: string;
  notFound: () => Error;
};

/**
 * Fluxo de fotos por URL assinada (NF-05), comum a pets e ocorrências: pede a URL → o aparelho envia
 * direto ao storage → confirma (tamanho, tipo declarado e assinatura dos bytes).
 */
export class PhotoUploads {
  constructor(
    private readonly pool: Pool,
    private readonly storage: PhotoStorage,
    private readonly spec: PhotoSpec,
  ) {}

  async requestUpload(ownerId: string, parentId: string, contentType: string) {
    const { photosTable, parentTable, parentColumn, keyPrefix, maxPhotos } = this.spec;
    if (!UUID_RE.test(parentId)) throw this.spec.notFound();
    if (!isAllowedPhotoType(contentType)) throw new BadRequestException("Envie uma foto JPG, PNG ou WebP");

    const photoId = randomUUID();
    const objectKey = `${keyPrefix}/${parentId}/${photoId}.${EXTENSIONS[contentType]}`;
    await transaction(this.pool, async (client) => {
      // `for update` serializa pedidos simultâneos para o mesmo registro (limite de fotos).
      const parent = await client.query(`select id from ${parentTable} where id = $1 and ${this.ownedBy("", "$2")} for update`, [
        parentId,
        ownerId,
      ]);
      if (parent.rowCount === 0) throw this.spec.notFound();
      const { rows } = await client.query<{ n: number }>(
        `select count(*)::int as n from ${photosTable}
          where ${parentColumn} = $1 and (uploaded_at is not null or created_at > now() - make_interval(mins => $2))`,
        [parentId, PENDING_UPLOAD_WINDOW_MINUTES],
      );
      if (rows[0].n >= maxPhotos) throw new BadRequestException(this.spec.tooManyMessage);
      await client.query(`insert into ${photosTable} (id, ${parentColumn}, object_key, content_type) values ($1, $2, $3, $4)`, [
        photoId,
        parentId,
        objectKey,
        contentType,
      ]);
    });

    const uploadUrl = await this.storage.presignUpload(pendingKey(objectKey), contentType, UPLOAD_URL_TTL_SECONDS);
    return { photoId, uploadUrl, expiresInSeconds: UPLOAD_URL_TTL_SECONDS };
  }

  /**
   * Confere no storage o que o aparelho enviou: a URL de PUT não limita o tamanho, então o limite é aplicado aqui.
   *
   * Nenhuma conexão do banco fica presa durante as chamadas ao storage (o pool do Supabase é pequeno): a foto é
   * reservada num UPDATE curto (`confirming_until`), conferida fora do banco e finalizada noutro UPDATE. Um segundo
   * confirm da mesma foto espera o primeiro; sem isso, ele poderia copiar um pendente trocado depois da conferência
   * do primeiro por cima da foto já aprovada. Uma reserva vencida (o processo caiu no meio) é retomada.
   */
  async confirmUpload(ownerId: string, parentId: string, photoId: string): Promise<{ id: string; url: string }> {
    const { photosTable, parentTable, parentColumn } = this.spec;
    if (!UUID_RE.test(parentId) || !UUID_RE.test(photoId)) throw this.spec.notFound();
    const deadline = Date.now() + CONFIRM_WAIT_MS;
    for (;;) {
      const { rows } = await this.pool.query<{ object_key: string; content_type: string }>(
        `update ${photosTable} ph set confirming_until = now() + make_interval(secs => $4)
           from ${parentTable} p
          where ph.id = $1 and p.id = ph.${parentColumn} and p.id = $2 and ${this.ownedBy("p.", "$3")}
            and ph.uploaded_at is null and (ph.confirming_until is null or ph.confirming_until < now())
          returning ph.object_key, ph.content_type`,
        [photoId, parentId, ownerId, CONFIRM_CLAIM_SECONDS],
      );
      if (rows[0]) return this.verifyClaimed(photoId, rows[0]);

      const { rows: state } = await this.pool.query<{ object_key: string; uploaded: boolean }>(
        `select ph.object_key, ph.uploaded_at is not null as uploaded
           from ${photosTable} ph join ${parentTable} p on p.id = ph.${parentColumn}
          where ph.id = $1 and p.id = $2 and ${this.ownedBy("p.", "$3")}`,
        [photoId, parentId, ownerId],
      );
      if (!state[0]) throw this.spec.notFound();
      if (state[0].uploaded) return { id: photoId, url: await this.signedUrl(state[0].object_key) };
      // Outro confirm está conferindo esta foto: espera ele terminar.
      if (Date.now() > deadline) throw new ConflictException("A foto ainda está sendo conferida. Tente de novo em instantes.");
      await new Promise((resolve) => setTimeout(resolve, CONFIRM_POLL_MS));
    }
  }

  /** Conferência no storage de uma foto já reservada. Em qualquer saída sem sucesso, a reserva é liberada ou a foto apagada. */
  private async verifyClaimed(photoId: string, photo: { object_key: string; content_type: string }): Promise<{ id: string; url: string }> {
    const { photosTable } = this.spec;
    const pending = pendingKey(photo.object_key);
    let settled = false;
    try {
      // A URL de PUT continua valendo até expirar: a conferência é feita na cópia, numa chave que ninguém
      // mais consegue sobrescrever. Um novo PUT só troca o arquivo pendente, que nunca é servido.
      // Sem o pendente, vale a cópia que já estiver lá (confirm repetido depois de uma falha no meio).
      if (await this.storage.stat(pending)) await this.storage.copy(pending, photo.object_key);
      const stored = await this.storage.stat(photo.object_key);
      const problem = !stored
        ? "A foto ainda não foi enviada"
        : stored.size > MAX_PHOTO_BYTES
          ? "A foto passa de 10 MB"
          : stored.contentType !== photo.content_type
            ? "Envie uma foto JPG, PNG ou WebP"
            : // O Content-Type é declarado pelo cliente; o conteúdo precisa ser mesmo uma imagem desse formato.
              detectImageType(await this.storage.readHead(photo.object_key, SIGNATURE_BYTES)) !== photo.content_type
              ? "O arquivo enviado não é uma imagem válida"
              : null;
      if (problem) {
        if (stored) {
          await this.storage.delete(photo.object_key);
          await this.storage.delete(pending);
          await this.pool.query(`delete from ${photosTable} where id = $1`, [photoId]);
          settled = true;
        }
        throw new BadRequestException(problem);
      }
      await this.pool.query(`update ${photosTable} set uploaded_at = now(), confirming_until = null where id = $1`, [photoId]);
      settled = true;
      await this.storage.delete(pending);
      return { id: photoId, url: await this.signedUrl(photo.object_key) };
    } finally {
      // Ainda não enviada, ou erro no storage: libera a reserva para o próximo confirm tentar de novo.
      if (!settled) {
        await this.pool.query(`update ${photosTable} set confirming_until = null where id = $1 and uploaded_at is null`, [photoId]);
      }
    }
  }

  /** Condição SQL "o registro pertence a `param`" (colunas vêm do código, nunca do cliente). */
  private ownedBy(alias: string, param: string): string {
    const columns = Array.isArray(this.spec.ownerColumn) ? this.spec.ownerColumn : [this.spec.ownerColumn];
    return `(${columns.map((column) => `${alias}${column} = ${param}`).join(" or ")})`;
  }

  signedUrl(objectKey: string): Promise<string> {
    return this.storage.presignDownload(objectKey, DOWNLOAD_URL_TTL_SECONDS);
  }
}

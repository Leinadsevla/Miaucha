import { BadRequestException } from "@nestjs/common";
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

  /** Confere no storage o que o aparelho enviou: a URL de PUT não limita o tamanho, então o limite é aplicado aqui. */
  async confirmUpload(ownerId: string, parentId: string, photoId: string): Promise<{ id: string; url: string }> {
    const { photosTable, parentTable, parentColumn } = this.spec;
    if (!UUID_RE.test(parentId) || !UUID_RE.test(photoId)) throw this.spec.notFound();
    const { rows } = await this.pool.query<{ object_key: string; content_type: string; uploaded: boolean }>(
      `select ph.object_key, ph.content_type, ph.uploaded_at is not null as uploaded
         from ${photosTable} ph join ${parentTable} p on p.id = ph.${parentColumn}
        where ph.id = $1 and p.id = $2 and ${this.ownedBy("p.", "$3")}`,
      [photoId, parentId, ownerId],
    );
    const photo = rows[0];
    if (!photo) throw this.spec.notFound();
    if (!photo.uploaded) {
      const pending = pendingKey(photo.object_key);
      if (!(await this.storage.stat(pending))) throw new BadRequestException("A foto ainda não foi enviada");
      // A URL de PUT continua valendo até expirar: a conferência é feita na cópia, numa chave que ninguém
      // mais consegue sobrescrever. Um novo PUT só troca o arquivo pendente, que nunca é servido.
      await this.storage.copy(pending, photo.object_key);
      await this.storage.delete(pending);
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
        await this.storage.delete(photo.object_key);
        await this.pool.query(`delete from ${photosTable} where id = $1`, [photoId]);
        throw new BadRequestException(problem);
      }
      await this.pool.query(`update ${photosTable} set uploaded_at = now() where id = $1`, [photoId]);
    }
    return { id: photoId, url: await this.signedUrl(photo.object_key) };
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

import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { MAX_PET_PHOTOS, MAX_PHOTO_BYTES, isAllowedPhotoType, validatePet, type MyPet, type PetInput } from "@miaucha/shared";
import { randomUUID } from "node:crypto";
import type { Pool } from "pg";
import { transaction } from "../db/transaction";
import { SIGNATURE_BYTES, detectImageType } from "../storage/image-signature";
import type { PhotoStorage } from "../storage/photo-storage";
import { PG_POOL, PHOTO_STORAGE } from "../tokens";

export const UPLOAD_URL_TTL_SECONDS = 300;
export const DOWNLOAD_URL_TTL_SECONDS = 3600;
/** Pedidos de upload ainda não confirmados contam no limite de fotos só durante esta janela. */
const PENDING_UPLOAD_WINDOW_MINUTES = 10;

const EXTENSIONS: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type PetRow = { id: string; name: string; species: MyPet["species"]; breed: string | null; color: string | null; approx_age: string | null };

const notFound = () => new NotFoundException("Pet não encontrado");
const optional = (value: string) => value.trim() || null;

@Injectable()
export class PetsService {
  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    @Inject(PHOTO_STORAGE) private readonly storage: PhotoStorage,
  ) {}

  async create(ownerId: string, input: PetInput): Promise<MyPet> {
    const errors = validatePet(input);
    if (Object.keys(errors).length > 0) throw new BadRequestException({ message: "Confira os dados do pet", errors });

    const { rows } = await this.pool.query<PetRow>(
      `insert into pets (owner_id, name, species, breed, color, approx_age) values ($1, $2, $3, $4, $5, $6)
       returning id, name, species, breed, color, approx_age`,
      [ownerId, input.name.trim(), input.species, optional(input.breed), optional(input.color), optional(input.approxAge)],
    );
    return this.toView(rows[0], []);
  }

  async listMine(ownerId: string): Promise<MyPet[]> {
    const pets = await this.pool.query<PetRow>(
      "select id, name, species, breed, color, approx_age from pets where owner_id = $1 order by created_at desc, id",
      [ownerId],
    );
    const photos = await this.pool.query<{ id: string; pet_id: string; object_key: string }>(
      `select ph.id, ph.pet_id, ph.object_key from pet_photos ph join pets p on p.id = ph.pet_id
        where p.owner_id = $1 and ph.uploaded_at is not null order by ph.uploaded_at, ph.id`,
      [ownerId],
    );
    return Promise.all(pets.rows.map((pet) => this.toView(pet, photos.rows.filter((ph) => ph.pet_id === pet.id))));
  }

  async findMine(ownerId: string, petId: string): Promise<MyPet> {
    if (!UUID_RE.test(petId)) throw notFound();
    const pet = await this.pool.query<PetRow>(
      "select id, name, species, breed, color, approx_age from pets where id = $1 and owner_id = $2",
      [petId, ownerId],
    );
    if (!pet.rows[0]) throw notFound();
    const photos = await this.pool.query<{ id: string; object_key: string }>(
      "select id, object_key from pet_photos where pet_id = $1 and uploaded_at is not null order by uploaded_at, id",
      [petId],
    );
    return this.toView(pet.rows[0], photos.rows);
  }

  async requestUpload(ownerId: string, petId: string, contentType: string) {
    if (!UUID_RE.test(petId)) throw notFound();
    if (!isAllowedPhotoType(contentType)) throw new BadRequestException("Envie uma foto JPG, PNG ou WebP");

    const photoId = randomUUID();
    const objectKey = `pets/${petId}/${photoId}.${EXTENSIONS[contentType]}`;
    await transaction(this.pool, async (client) => {
      // `for update` serializa pedidos simultâneos para o mesmo pet (limite de fotos).
      const pet = await client.query("select id from pets where id = $1 and owner_id = $2 for update", [petId, ownerId]);
      if (pet.rowCount === 0) throw notFound();
      const { rows } = await client.query<{ n: number }>(
        `select count(*)::int as n from pet_photos
          where pet_id = $1 and (uploaded_at is not null or created_at > now() - make_interval(mins => $2))`,
        [petId, PENDING_UPLOAD_WINDOW_MINUTES],
      );
      if (rows[0].n >= MAX_PET_PHOTOS) throw new BadRequestException(`Cada pet pode ter até ${MAX_PET_PHOTOS} fotos`);
      await client.query("insert into pet_photos (id, pet_id, object_key, content_type) values ($1, $2, $3, $4)", [
        photoId,
        petId,
        objectKey,
        contentType,
      ]);
    });

    const uploadUrl = await this.storage.presignUpload(objectKey, contentType, UPLOAD_URL_TTL_SECONDS);
    return { photoId, uploadUrl, expiresInSeconds: UPLOAD_URL_TTL_SECONDS };
  }

  /** Confere no storage o que o aparelho enviou: a URL de PUT não limita o tamanho, então o limite é aplicado aqui. */
  async confirmUpload(ownerId: string, petId: string, photoId: string): Promise<{ id: string; url: string }> {
    if (!UUID_RE.test(petId) || !UUID_RE.test(photoId)) throw notFound();
    const { rows } = await this.pool.query<{ object_key: string; content_type: string; uploaded: boolean }>(
      `select ph.object_key, ph.content_type, ph.uploaded_at is not null as uploaded
         from pet_photos ph join pets p on p.id = ph.pet_id
        where ph.id = $1 and p.id = $2 and p.owner_id = $3`,
      [photoId, petId, ownerId],
    );
    const photo = rows[0];
    if (!photo) throw notFound();
    if (!photo.uploaded) {
      const stored = await this.storage.stat(photo.object_key);
      if (!stored) throw new BadRequestException("A foto ainda não foi enviada");
      const problem =
        stored.size > MAX_PHOTO_BYTES
          ? "A foto passa de 10 MB"
          : stored.contentType !== photo.content_type
            ? "Envie uma foto JPG, PNG ou WebP"
            : // O Content-Type é declarado pelo cliente; o conteúdo precisa ser mesmo uma imagem desse formato.
              detectImageType(await this.storage.readHead(photo.object_key, SIGNATURE_BYTES)) !== photo.content_type
              ? "O arquivo enviado não é uma imagem válida"
              : null;
      if (problem) {
        await this.storage.delete(photo.object_key);
        await this.pool.query("delete from pet_photos where id = $1", [photoId]);
        throw new BadRequestException(problem);
      }
      await this.pool.query("update pet_photos set uploaded_at = now() where id = $1", [photoId]);
    }
    return { id: photoId, url: await this.storage.presignDownload(photo.object_key, DOWNLOAD_URL_TTL_SECONDS) };
  }

  private async toView(pet: PetRow, photos: { id: string; object_key: string }[]): Promise<MyPet> {
    return {
      id: pet.id,
      name: pet.name,
      species: pet.species,
      breed: pet.breed,
      color: pet.color,
      approxAge: pet.approx_age,
      photos: await Promise.all(
        photos.map(async (ph) => ({ id: ph.id, url: await this.storage.presignDownload(ph.object_key, DOWNLOAD_URL_TTL_SECONDS) })),
      ),
    };
  }
}

import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { MAX_PET_PHOTOS, validatePet, type MyPet, type PetInput } from "@miaucha/shared";
import type { Pool } from "pg";
import type { PhotoStorage } from "../storage/photo-storage";
import { PhotoUploads, UUID_RE } from "../storage/photo-uploads";
import { PG_POOL, PHOTO_STORAGE } from "../tokens";

type PetRow = { id: string; name: string; species: MyPet["species"]; breed: string | null; color: string | null; approx_age: string | null };

const notFound = () => new NotFoundException("Pet não encontrado");

function assertValid(input: PetInput) {
  const errors = validatePet(input);
  if (Object.keys(errors).length > 0) throw new BadRequestException({ message: "Confira os dados do pet", errors });
}
const optional = (value: string) => value.trim() || null;

@Injectable()
export class PetsService {
  private readonly photos: PhotoUploads;

  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    @Inject(PHOTO_STORAGE) private readonly storage: PhotoStorage,
  ) {
    this.photos = new PhotoUploads(pool, storage, {
      photosTable: "pet_photos",
      parentTable: "pets",
      parentColumn: "pet_id",
      ownerColumn: "owner_id",
      keyPrefix: "pets",
      maxPhotos: MAX_PET_PHOTOS,
      tooManyMessage: `Cada pet pode ter até ${MAX_PET_PHOTOS} fotos`,
      notFound,
    });
  }

  async create(ownerId: string, input: PetInput): Promise<MyPet> {
    assertValid(input);

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

  async update(ownerId: string, petId: string, input: PetInput): Promise<MyPet> {
    if (!UUID_RE.test(petId)) throw notFound();
    assertValid(input);
    const { rowCount } = await this.pool.query(
      `update pets set name = $3, species = $4, breed = $5, color = $6, approx_age = $7
        where id = $1 and owner_id = $2`,
      [petId, ownerId, input.name.trim(), input.species, optional(input.breed), optional(input.color), optional(input.approxAge)],
    );
    if (rowCount === 0) throw notFound();
    return this.findMine(ownerId, petId);
  }

  /** Remove a foto do pet. O arquivo só sai do storage se nenhuma ocorrência criada a partir do pet ainda o usa. */
  async removePhoto(ownerId: string, petId: string, photoId: string): Promise<void> {
    if (!UUID_RE.test(petId) || !UUID_RE.test(photoId)) throw notFound();
    const { rows } = await this.pool.query<{ object_key: string; shared: boolean }>(
      `delete from pet_photos ph using pets p
        where ph.id = $1 and ph.pet_id = p.id and p.id = $2 and p.owner_id = $3
        returning ph.object_key,
                  exists (select 1 from occurrence_photos op where op.object_key = ph.object_key) as shared`,
      [photoId, petId, ownerId],
    );
    if (!rows[0]) throw notFound();
    if (!rows[0].shared) await this.storage.delete(rows[0].object_key);
  }

  requestUpload(ownerId: string, petId: string, contentType: string) {
    return this.photos.requestUpload(ownerId, petId, contentType);
  }

  confirmUpload(ownerId: string, petId: string, photoId: string) {
    return this.photos.confirmUpload(ownerId, petId, photoId);
  }

  private async toView(pet: PetRow, photos: { id: string; object_key: string }[]): Promise<MyPet> {
    return {
      id: pet.id,
      name: pet.name,
      species: pet.species,
      breed: pet.breed,
      color: pet.color,
      approxAge: pet.approx_age,
      photos: await Promise.all(photos.map(async (ph) => ({ id: ph.id, url: await this.photos.signedUrl(ph.object_key) }))),
    };
  }
}

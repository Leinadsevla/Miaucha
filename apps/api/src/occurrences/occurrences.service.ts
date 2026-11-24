import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import {
  MAX_OCCURRENCE_PHOTOS,
  OCCURRENCE_SEARCH_LIMIT,
  occurrenceExpiryCutoff,
  publicPoint,
  validateOccurrence,
  type OccurrenceInput,
  type PublicOccurrence,
  isSpecies,
  type Species,
} from "@miaucha/shared";
import type { Pool } from "pg";
import type { AlertQueue } from "../alerts/alert-queue";
import { transaction } from "../db/transaction";
import type { PhotoStorage } from "../storage/photo-storage";
import { PhotoUploads, UUID_RE } from "../storage/photo-uploads";
import { ALERT_QUEUE, PG_POOL, PHOTO_STORAGE } from "../tokens";
import type { OccurrenceSearch } from "./search-params";

type OccurrenceRow = {
  id: string;
  type: PublicOccurrence["type"];
  species: Species;
  pet_name: string | null;
  breed: string | null;
  color: string | null;
  description: string | null;
  approx_address: string | null;
  status: PublicOccurrence["status"];
  lat: number;
  lng: number;
  pseudonym: string;
  created_at: Date;
  is_mine: boolean;
  distance?: number;
};

/**
 * Colunas públicas. Nunca inclua `o.location` (ponto exato) nem dados do usuário além do pseudônimo.
 * `$1` é sempre o id de quem pede (para `isMine`).
 */
const PUBLIC_COLUMNS = `o.id, o.type, o.species, o.pet_name, o.breed, o.color, o.description, o.approx_address, o.status,
  st_y(o.public_location::geometry) as lat, st_x(o.public_location::geometry) as lng,
  u.pseudonym, o.created_at, o.author_id = $1 as is_mine`;
const FROM = "from occurrences o join users u on u.id = o.author_id";

const notFound = () => new NotFoundException("Ocorrência não encontrada");
const petNotFound = () => new NotFoundException("Pet não encontrado");
const lostNotFound = () => new NotFoundException("Esse pet perdido não foi encontrado (talvez já tenha sido reencontrado)");
const optional = (value: string) => value.trim() || null;

@Injectable()
export class OccurrencesService {
  private readonly photos: PhotoUploads;

  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    @Inject(PHOTO_STORAGE) storage: PhotoStorage,
    @Inject(ALERT_QUEUE) private readonly alertQueue: AlertQueue,
  ) {
    this.photos = new PhotoUploads(pool, storage, {
      photosTable: "occurrence_photos",
      parentTable: "occurrences",
      parentColumn: "occurrence_id",
      ownerColumn: "author_id",
      keyPrefix: "occurrences",
      maxPhotos: MAX_OCCURRENCE_PHOTOS,
      tooManyMessage: `Cada ocorrência pode ter até ${MAX_OCCURRENCE_PHOTOS} fotos`,
      notFound,
    });
  }

  async create(authorId: string, raw: OccurrenceInput): Promise<PublicOccurrence> {
    const input = raw.petId ? await this.fillFromPet(authorId, raw.petId, raw) : raw;
    const errors = validateOccurrence(input);
    if (Object.keys(errors).length > 0) throw new BadRequestException({ message: "Confira os dados da ocorrência", errors });
    if (input.sightingOf) await this.checkSightingTarget(authorId, input);

    const shown = publicPoint(input.lat, input.lng);
    const id = await transaction(this.pool, async (client) => {
      const { rows } = await client.query<{ id: string }>(
        `insert into occurrences (author_id, pet_id, type, species, pet_name, breed, color, description, approx_address,
                                  location, public_location, sighting_of)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9,
                 st_setsrid(st_makepoint($10, $11), 4326)::geography, st_setsrid(st_makepoint($12, $13), 4326)::geography, $14)
         returning id`,
        [
          authorId,
          input.petId ?? null,
          input.type,
          input.species,
          optional(input.petName),
          optional(input.breed),
          optional(input.color),
          optional(input.description),
          optional(input.approxAddress),
          input.lng,
          input.lat,
          shown.lng,
          shown.lat,
          input.sightingOf ?? null,
        ],
      );
      if (input.petId) {
        // As fotos já enviadas do pet entram na ocorrência (mesmo objeto no storage, sem novo upload).
        await client.query(
          `insert into occurrence_photos (id, occurrence_id, object_key, content_type, uploaded_at)
           select gen_random_uuid(), $1, object_key, content_type, now()
             from (select object_key, content_type from pet_photos
                    where pet_id = $2 and uploaded_at is not null order by uploaded_at, id limit $3) ph`,
          [rows[0].id, input.petId, MAX_OCCURRENCE_PHOTOS],
        );
      }
      return rows[0].id;
    });
    // AL-01: o disparo dos alertas roda depois, sem segurar a resposta.
    this.alertQueue.occurrenceCreated(id);
    return this.findPublic(authorId, id);
  }

  /** "Vi este pet": só avistamento, de um pet perdido ainda aberto e de outra pessoa. */
  private async checkSightingTarget(authorId: string, input: OccurrenceInput): Promise<void> {
    if (input.type !== "seen") throw new BadRequestException("Só um avistamento pode apontar para um pet perdido");
    if (!UUID_RE.test(input.sightingOf!)) throw lostNotFound();
    const { rows } = await this.pool.query<{ author_id: string }>(
      "select author_id from occurrences where id = $1 and type = 'lost' and status = 'open'",
      [input.sightingOf],
    );
    if (!rows[0]) throw lostNotFound();
    if (rows[0].author_id === authorId) throw new BadRequestException("Esse pet é seu: atualize a sua ocorrência em vez de registrar um avistamento");
  }

  /** Os dados digitados valem; o pet completa o que faltar. O pet precisa ser do autor. */
  private async fillFromPet(authorId: string, petId: string, input: OccurrenceInput): Promise<OccurrenceInput> {
    if (!UUID_RE.test(petId)) throw petNotFound();
    const { rows } = await this.pool.query<{ name: string; species: Species; breed: string | null; color: string | null }>(
      "select name, species, breed, color from pets where id = $1 and owner_id = $2",
      [petId, authorId],
    );
    const pet = rows[0];
    if (!pet) throw petNotFound();
    return {
      ...input,
      species: isSpecies(input.species) ? input.species : pet.species,
      petName: input.petName.trim() || pet.name,
      breed: input.breed.trim() || (pet.breed ?? ""),
      color: input.color.trim() || (pet.color ?? ""),
    };
  }

  async findPublic(viewerId: string, id: string): Promise<PublicOccurrence> {
    if (!UUID_RE.test(id)) throw notFound();
    const { rows } = await this.pool.query<OccurrenceRow>(`select ${PUBLIC_COLUMNS} ${FROM} where o.id = $2`, [viewerId, id]);
    if (!rows[0]) throw notFound();
    return (await this.toPublic(rows, "all"))[0];
  }

  async listMine(authorId: string): Promise<PublicOccurrence[]> {
    const { rows } = await this.pool.query<OccurrenceRow>(
      `select ${PUBLIC_COLUMNS} ${FROM} where o.author_id = $1 order by o.created_at desc, o.id`,
      [authorId],
    );
    return this.toPublic(rows, "all");
  }

  /**
   * MP-02: filtra pela localização pública (índices GiST), só abertas e não expiradas (NF-03),
   * mais recentes primeiro, no máximo OCCURRENCE_SEARCH_LIMIT.
   */
  async search(viewerId: string, { area, filters }: OccurrenceSearch): Promise<PublicOccurrence[]> {
    const params: unknown[] = [viewerId, occurrenceExpiryCutoff()];
    const p = (value: unknown) => `$${params.push(value)}`;
    const where = ["o.status = 'open'", "o.updated_at > $2"];
    let distance = "";

    if (area.kind === "radius") {
      const center = `st_setsrid(st_makepoint(${p(area.lng)}, ${p(area.lat)}), 4326)::geography`;
      where.push(`st_dwithin(o.public_location, ${center}, ${p(area.radiusMeters)})`);
      distance = `, st_distance(o.public_location, ${center}) as distance`;
    } else {
      where.push(
        `o.public_location::geometry && st_makeenvelope(${p(area.minLng)}, ${p(area.minLat)}, ${p(area.maxLng)}, ${p(area.maxLat)}, 4326)`,
      );
    }
    if (filters.type) where.push(`o.type = ${p(filters.type)}`);
    if (filters.species === "others") where.push(`o.species not in ('dog', 'cat')`);
    else if (filters.species) where.push(`o.species = ${p(filters.species)}`);
    if (filters.sinceDays) where.push(`o.created_at > now() - make_interval(days => ${p(filters.sinceDays)})`);

    const { rows } = await this.pool.query<OccurrenceRow>(
      `select ${PUBLIC_COLUMNS}${distance} ${FROM} where ${where.join(" and ")}
        order by o.created_at desc, o.id limit ${p(OCCURRENCE_SEARCH_LIMIT)}`,
      params,
    );
    return this.toPublic(rows, "cover");
  }

  async resolve(authorId: string, id: string): Promise<PublicOccurrence> {
    if (!UUID_RE.test(id)) throw notFound();
    const { rowCount } = await this.pool.query(
      `update occurrences set status = 'resolved', resolved_at = coalesce(resolved_at, now()), updated_at = now()
        where id = $1 and author_id = $2`,
      [id, authorId],
    );
    if (rowCount === 0) throw notFound();
    return this.findPublic(authorId, id);
  }

  requestUpload(authorId: string, id: string, contentType: string) {
    return this.photos.requestUpload(authorId, id, contentType);
  }

  confirmUpload(authorId: string, id: string, photoId: string) {
    return this.photos.confirmUpload(authorId, id, photoId);
  }

  /** "cover": só a primeira foto (listas, para não assinar centenas de URLs); "all": todas. */
  private async toPublic(rows: OccurrenceRow[], photos: "cover" | "all"): Promise<PublicOccurrence[]> {
    if (rows.length === 0) return [];
    const { rows: photoRows } = await this.pool.query<{ occurrence_id: string; object_key: string }>(
      photos === "cover"
        ? `select distinct on (occurrence_id) occurrence_id, object_key from occurrence_photos
            where occurrence_id = any($1::uuid[]) and uploaded_at is not null order by occurrence_id, uploaded_at, id`
        : `select occurrence_id, object_key from occurrence_photos
            where occurrence_id = any($1::uuid[]) and uploaded_at is not null order by uploaded_at, id`,
      [rows.map((r) => r.id)],
    );
    return Promise.all(
      rows.map(async (row) => {
        const view: PublicOccurrence = {
          id: row.id,
          type: row.type,
          species: row.species,
          petName: row.pet_name,
          breed: row.breed,
          color: row.color,
          description: row.description,
          approxAddress: row.approx_address,
          photoUrls: await Promise.all(
            photoRows.filter((ph) => ph.occurrence_id === row.id).map((ph) => this.photos.signedUrl(ph.object_key)),
          ),
          publicLocation: { lat: row.lat, lng: row.lng },
          authorPseudonym: row.pseudonym,
          status: row.status,
          isMine: row.is_mine,
          createdAt: row.created_at.toISOString(),
        };
        if (row.distance !== undefined) view.distanceMeters = Math.round(row.distance);
        return view;
      }),
    );
  }
}

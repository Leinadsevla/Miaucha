import { distanceMeters, publicPoint, type OccurrenceInput, type OccurrenceUpdate, type OccurrenceType, type PublicOccurrence, type Species, type SpeciesFilter } from "@miaucha/shared";
import type { ApiSession } from "@/features/auth/apiSession";
import { bboxParam, type BBox } from "@/features/map/region";
import { uploadPhotoVia, type Uploader } from "@/features/pets/petsClient";
import { checkPhoto, type PickedPhoto } from "@/features/pets/photos";
import { demoPhotoUri, type DemoPhoto } from "@/features/demo/demoPhotos";

export type NearbyQuery = { lat: number; lng: number; radiusKm: number };
/** Filtros aceitos pelas buscas da API (MP-05). */
export type SearchFilters = { type?: OccurrenceType; species?: SpeciesFilter; sinceDays?: number };
/** Busca pela área visível do mapa (MP-02). */
export type AreaQuery = SearchFilters & { bbox: BBox };
export type OccurrencePhoto = { id: string; url: string };

export type OccurrencesClient = {
  /** Ocorrências abertas perto de um ponto, com `distanceMeters` (MP-02). */
  nearby(query: NearbyQuery): Promise<PublicOccurrence[]>;
  /** Ocorrências abertas dentro de uma área do mapa, sem `distanceMeters` (MP-02). */
  inArea(query: AreaQuery): Promise<PublicOccurrence[]>;
  get(id: string): Promise<PublicOccurrence>;
  listMine(): Promise<PublicOccurrence[]>;
  create(input: OccurrenceInput): Promise<PublicOccurrence>;
  addPhoto(id: string, photo: PickedPhoto): Promise<OccurrencePhoto>;
  resolve(id: string): Promise<PublicOccurrence>;
  /** Edição pelo autor; `location` só quando há um local novo. */
  update(id: string, input: OccurrenceUpdate): Promise<PublicOccurrence>;
  removePhoto(id: string, photoId: string): Promise<void>;
};

export function createHttpOccurrencesClient({ session, upload }: { session: ApiSession; upload: Uploader }): OccurrencesClient {
  return {
    nearby: ({ lat, lng, radiusKm }) =>
      session.authed<PublicOccurrence[]>("GET", `/occurrences?lat=${lat}&lng=${lng}&radiusKm=${radiusKm}`),
    inArea: ({ bbox, type, species, sinceDays }) => {
      const params = [`bbox=${bboxParam(bbox)}`];
      if (type) params.push(`type=${type}`);
      if (species) params.push(`species=${species}`);
      if (sinceDays !== undefined) params.push(`sinceDays=${sinceDays}`);
      return session.authed<PublicOccurrence[]>("GET", `/occurrences?${params.join("&")}`);
    },
    get: (id) => session.authed<PublicOccurrence>("GET", `/occurrences/${encodeURIComponent(id)}`),
    listMine: () => session.authed<PublicOccurrence[]>("GET", "/me/occurrences"),
    create: (input) => session.authed<PublicOccurrence>("POST", "/occurrences", input),
    addPhoto: (id, photo) => uploadPhotoVia(session, upload, `/occurrences/${encodeURIComponent(id)}`, photo),
    resolve: (id) => session.authed<PublicOccurrence>("POST", `/occurrences/${encodeURIComponent(id)}/resolve`),
    update: (id, { location, ...data }) =>
      session.authed<PublicOccurrence>("PATCH", `/occurrences/${encodeURIComponent(id)}`, { ...data, ...(location ?? {}) }),
    removePhoto: async (id, photoId) =>
      void (await session.authed("DELETE", `/occurrences/${encodeURIComponent(id)}/photos/${encodeURIComponent(photoId)}`)),
  };
}

/** Cria a ocorrência e envia as fotos uma a uma. Uma foto que falha não desfaz o alerta. */
export async function saveOccurrence(client: OccurrencesClient, input: OccurrenceInput, photos: PickedPhoto[]) {
  const occurrence = await client.create(input);
  const uploaded: string[] = [];
  let failedPhotos = 0;
  for (const photo of photos) {
    try {
      uploaded.push((await client.addPhoto(occurrence.id, photo)).url);
    } catch {
      failedPhotos++;
    }
  }
  return { occurrence: { ...occurrence, photoUrls: [...occurrence.photoUrls, ...uploaded] }, failedPhotos };
}

/** Salva a edição, remove as fotos marcadas e envia as novas. Uma foto que falha não desfaz o resto. */
export async function updateOccurrence(
  client: OccurrencesClient,
  id: string,
  input: OccurrenceUpdate,
  newPhotos: PickedPhoto[],
  removedPhotoIds: string[],
) {
  await client.update(id, input);
  let failedPhotos = 0;
  for (const photoId of removedPhotoIds) {
    try {
      await client.removePhoto(id, photoId);
    } catch {
      failedPhotos++;
    }
  }
  for (const photo of newPhotos) {
    try {
      await client.addPhoto(id, photo);
    } catch {
      failedPhotos++;
    }
  }
  return { failedPhotos };
}

const DAY = 24 * 3600 * 1000;

type PhotoOf = (photo: DemoPhoto) => string;

/** Exemplos para o modo sem API: aparecem em volta do primeiro ponto buscado, cada um com a sua foto. */
function sampleOccurrences(lat: number, lng: number, photo: PhotoOf): PublicOccurrence[] {
  const base = { breed: null, color: null, description: null, status: "open" as const, isMine: false };
  const at = (north: number, east: number) => ({ lat: lat + north / 111_195, lng: lng + east / (111_195 * Math.cos((lat * Math.PI) / 180)) });
  const photos = (key: DemoPhoto) => [photo(key)].filter(Boolean);
  const ago = (ms: number) => new Date(Date.now() - ms).toISOString();
  return [
    { ...base, id: "exemplo-1", type: "lost", species: "dog", petName: "Thor", breed: "Golden Retriever", color: "Dourado", description: "Fugiu pelo portão no fim da tarde. É dócil e atende pelo nome.", photoUrls: photos("goldenDog"), publicLocation: at(300, 200), approxAddress: "Perto da praça", authorPseudonym: "Tutor Laranja 42", createdAt: ago(2 * 3600 * 1000) },
    { ...base, id: "exemplo-4", type: "lost", species: "cat", petName: "Mia", breed: "Sem raça definida", color: "Laranja", description: "Usa coleira azul. Some quando ouve barulho alto.", photoUrls: photos("orangeCat"), publicLocation: at(-450, -350), approxAddress: "Vila Nova", authorPseudonym: "Tutora Lilás 3", createdAt: ago(5 * 3600 * 1000) },
    { ...base, id: "exemplo-2", type: "seen", species: "cat", petName: null, color: "Preto e branco", description: "Estava em cima do muro, parecia assustado.", photoUrls: photos("blackWhiteCat"), publicLocation: at(-800, 500), approxAddress: "Rua das Flores", authorPseudonym: "Vizinho Azul 7", createdAt: ago(DAY) },
    { ...base, id: "exemplo-3", type: "found", species: "dog", petName: null, breed: "Beagle", color: "Tricolor", description: "Está comigo, bem cuidado. Sem plaquinha.", photoUrls: photos("beagle"), publicLocation: at(1500, -900), approxAddress: "Jardim das Acácias", authorPseudonym: "Amigo Verde 15", createdAt: ago(3 * DAY) },
  ];
}

/** Ocorrências em memória para desenvolver as telas sem a API. `photo`: de onde vêm as fotos dos exemplos. */
export function createMockOccurrencesClient({ seed = true, photo = demoPhotoUri }: { seed?: boolean; photo?: PhotoOf } = {}): OccurrencesClient {
  const items: PublicOccurrence[] = [];
  let seeded = !seed;
  const seedAround = (lat: number, lng: number) => {
    if (seeded) return;
    items.push(...sampleOccurrences(lat, lng, photo));
    seeded = true;
  };
  const find = (id: string) => {
    const found = items.find((o) => o.id === id);
    if (!found) throw new Error("Ocorrência não encontrada");
    return found;
  };
  return {
    async nearby({ lat, lng, radiusKm }) {
      seedAround(lat, lng);
      return items
        .filter((o) => o.status === "open")
        .map((o) => ({ ...o, distanceMeters: Math.round(distanceMeters({ lat, lng }, o.publicLocation)) }))
        .filter((o) => o.distanceMeters <= radiusKm * 1000)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },
    async inArea({ bbox, type, species, sinceDays }) {
      seedAround((bbox.minLat + bbox.maxLat) / 2, (bbox.minLng + bbox.maxLng) / 2);
      return items
        .filter((o) => o.status === "open")
        .filter(({ publicLocation: p }) => p.lng >= bbox.minLng && p.lng <= bbox.maxLng && p.lat >= bbox.minLat && p.lat <= bbox.maxLat)
        .filter((o) => (!type || o.type === type) && (!species || o.species === species))
        .filter((o) => sinceDays === undefined || Date.now() - new Date(o.createdAt).getTime() <= sinceDays * DAY)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },
    get: async (id) => find(id),
    listMine: async () => items.filter((o) => o.isMine).reverse(),
    async create(input) {
      const created: PublicOccurrence = {
        id: `dev-${items.length + 1}`,
        type: input.type,
        species: input.species,
        petName: input.petName.trim() || null,
        breed: input.breed.trim() || null,
        color: input.color.trim() || null,
        description: input.description.trim() || null,
        approxAddress: input.approxAddress.trim() || null,
        photoUrls: [],
        publicLocation: publicPoint(input.lat, input.lng),
        authorPseudonym: "Você (modo de teste)",
        status: "open",
        isMine: true,
        createdAt: new Date().toISOString(),
      };
      items.push(created);
      return created;
    },
    async addPhoto(id, photo) {
      const problem = checkPhoto(photo);
      if (problem) throw new Error(problem);
      const occurrence = find(id);
      occurrence.photoUrls.push(photo.uri);
      return { id: `${id}-${occurrence.photoUrls.length}`, url: photo.uri };
    },
    async resolve(id) {
      find(id).status = "resolved";
      return find(id);
    },
    async update(id, { location, ...data }) {
      const o = find(id);
      Object.assign(o, {
        species: data.species,
        petName: data.petName.trim() || null,
        breed: data.breed.trim() || null,
        color: data.color.trim() || null,
        description: data.description.trim() || null,
        approxAddress: data.approxAddress.trim() || null,
      });
      if (location) o.publicLocation = publicPoint(location.lat, location.lng);
      return o;
    },
    async removePhoto(id, photoId) {
      const o = find(id);
      const index = Number(photoId.split("-").pop()) - 1;
      o.photoUrls = o.photoUrls.filter((_, i) => i !== index);
    },
  };
}

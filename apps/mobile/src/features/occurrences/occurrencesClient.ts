import { distanceMeters, publicPoint, type OccurrenceInput, type PublicOccurrence } from "@miaucha/shared";
import type { ApiSession } from "@/features/auth/apiSession";
import { uploadPhotoVia, type Uploader } from "@/features/pets/petsClient";
import { checkPhoto, type PickedPhoto } from "@/features/pets/photos";

export type NearbyQuery = { lat: number; lng: number; radiusKm: number };
export type OccurrencePhoto = { id: string; url: string };

export type OccurrencesClient = {
  /** Ocorrências abertas perto de um ponto, com `distanceMeters` (MP-02). */
  nearby(query: NearbyQuery): Promise<PublicOccurrence[]>;
  get(id: string): Promise<PublicOccurrence>;
  listMine(): Promise<PublicOccurrence[]>;
  create(input: OccurrenceInput): Promise<PublicOccurrence>;
  addPhoto(id: string, photo: PickedPhoto): Promise<OccurrencePhoto>;
  resolve(id: string): Promise<PublicOccurrence>;
};

export function createHttpOccurrencesClient({ session, upload }: { session: ApiSession; upload: Uploader }): OccurrencesClient {
  return {
    nearby: ({ lat, lng, radiusKm }) =>
      session.authed<PublicOccurrence[]>("GET", `/occurrences?lat=${lat}&lng=${lng}&radiusKm=${radiusKm}`),
    get: (id) => session.authed<PublicOccurrence>("GET", `/occurrences/${encodeURIComponent(id)}`),
    listMine: () => session.authed<PublicOccurrence[]>("GET", "/me/occurrences"),
    create: (input) => session.authed<PublicOccurrence>("POST", "/occurrences", input),
    addPhoto: (id, photo) => uploadPhotoVia(session, upload, `/occurrences/${encodeURIComponent(id)}`, photo),
    resolve: (id) => session.authed<PublicOccurrence>("POST", `/occurrences/${encodeURIComponent(id)}/resolve`),
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

const DAY = 24 * 3600 * 1000;

/** Exemplos para o modo sem API: aparecem em volta do primeiro ponto buscado. */
function sampleOccurrences(lat: number, lng: number): PublicOccurrence[] {
  const base = { breed: null, color: null, description: null, photoUrls: [], status: "open" as const, isMine: false };
  const at = (north: number, east: number) => ({ lat: lat + north / 111_195, lng: lng + east / (111_195 * Math.cos((lat * Math.PI) / 180)) });
  return [
    { ...base, id: "exemplo-1", type: "lost", species: "dog", petName: "Thor", breed: "Golden Retriever", publicLocation: at(300, 200), approxAddress: "Perto da praça", authorPseudonym: "Tutor Laranja 42", createdAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString() },
    { ...base, id: "exemplo-2", type: "seen", species: "cat", petName: null, color: "Preto", publicLocation: at(-800, 500), approxAddress: "Rua das Flores", authorPseudonym: "Vizinho Azul 7", createdAt: new Date(Date.now() - DAY).toISOString() },
    { ...base, id: "exemplo-3", type: "found", species: "dog", petName: null, publicLocation: at(1500, -900), approxAddress: null, authorPseudonym: "Amigo Verde 15", createdAt: new Date(Date.now() - 3 * DAY).toISOString() },
  ];
}

/** Ocorrências em memória para desenvolver as telas sem a API. */
export function createMockOccurrencesClient({ seed = true }: { seed?: boolean } = {}): OccurrencesClient {
  const items: PublicOccurrence[] = [];
  let seeded = !seed;
  const find = (id: string) => {
    const found = items.find((o) => o.id === id);
    if (!found) throw new Error("Ocorrência não encontrada");
    return found;
  };
  return {
    async nearby({ lat, lng, radiusKm }) {
      if (!seeded) {
        items.push(...sampleOccurrences(lat, lng));
        seeded = true;
      }
      return items
        .filter((o) => o.status === "open")
        .map((o) => ({ ...o, distanceMeters: Math.round(distanceMeters({ lat, lng }, o.publicLocation)) }))
        .filter((o) => o.distanceMeters <= radiusKm * 1000)
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
  };
}

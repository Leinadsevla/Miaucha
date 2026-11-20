import type { MyPet, PetInput } from "@miaucha/shared";
import type { ApiSession } from "@/features/auth/apiSession";
import { checkPhoto, photoContentType, type PickedPhoto } from "./photos";

export type PetPhoto = MyPet["photos"][number];

export type PetsClient = {
  listMine(): Promise<MyPet[]>;
  get(id: string): Promise<MyPet>;
  create(input: PetInput): Promise<MyPet>;
  update(id: string, input: PetInput): Promise<MyPet>;
  removePhoto(petId: string, photoId: string): Promise<void>;
  addPhoto(petId: string, photo: PickedPhoto): Promise<PetPhoto>;
};

/** Envia o arquivo local para a URL assinada do storage (PUT direto, sem passar pela API). */
export type Uploader = (uploadUrl: string, photo: PickedPhoto, contentType: string) => Promise<void>;

export function createHttpPetsClient({ session, upload }: { session: ApiSession; upload: Uploader }): PetsClient {
  return {
    listMine: () => session.authed<MyPet[]>("GET", "/me/pets"),
    get: (id) => session.authed<MyPet>("GET", `/pets/${id}`),
    create: (input) => session.authed<MyPet>("POST", "/pets", input),
    update: (id, input) => session.authed<MyPet>("PATCH", `/pets/${id}`, input),
    async removePhoto(petId, photoId) {
      await session.authed("DELETE", `/pets/${petId}/photos/${photoId}`);
    },
    async addPhoto(petId, photo) {
      const problem = checkPhoto(photo);
      if (problem) throw new Error(problem);
      const contentType = photoContentType(photo)!;
      const { photoId, uploadUrl } = await session.authed<{ photoId: string; uploadUrl: string }>("POST", `/pets/${petId}/photos`, {
        contentType,
      });
      await upload(uploadUrl, photo, contentType);
      return session.authed<PetPhoto>("POST", `/pets/${petId}/photos/${photoId}/confirm`);
    },
  };
}

/** Cria o pet e envia as fotos uma a uma. Uma foto que falha não desfaz o cadastro. */
export async function savePet(client: PetsClient, input: PetInput, photos: PickedPhoto[]) {
  const pet = await client.create(input);
  const uploaded: PetPhoto[] = [];
  let failedPhotos = 0;
  for (const photo of photos) {
    try {
      uploaded.push(await client.addPhoto(pet.id, photo));
    } catch {
      failedPhotos++;
    }
  }
  return { pet: { ...pet, photos: [...pet.photos, ...uploaded] }, failedPhotos };
}

/** Edita o pet: dados, depois fotos removidas, depois fotos novas. Foto que falha não desfaz a edição. */
export async function updatePet(client: PetsClient, petId: string, input: PetInput, newPhotos: PickedPhoto[], removedPhotoIds: string[]) {
  await client.update(petId, input);
  let failedPhotos = 0;
  for (const photoId of removedPhotoIds) {
    try {
      await client.removePhoto(petId, photoId);
    } catch {
      failedPhotos++;
    }
  }
  for (const photo of newPhotos) {
    try {
      await client.addPhoto(petId, photo);
    } catch {
      failedPhotos++;
    }
  }
  return { failedPhotos };
}

/** Pets em memória para desenvolver as telas sem a API (as fotos ficam com a URI local). */
export function createMockPetsClient(): PetsClient {
  const pets: MyPet[] = [];
  return {
    listMine: async () => [...pets].reverse(),
    async get(id) {
      const pet = pets.find((p) => p.id === id);
      if (!pet) throw new Error("Pet não encontrado");
      return pet;
    },
    async create(input) {
      const pet: MyPet = {
        id: `dev-${pets.length + 1}`,
        name: input.name.trim(),
        species: input.species,
        breed: input.breed.trim() || null,
        color: input.color.trim() || null,
        approxAge: input.approxAge.trim() || null,
        photos: [],
      };
      pets.push(pet);
      return pet;
    },
    async update(id, input) {
      const pet = pets.find((p) => p.id === id);
      if (!pet) throw new Error("Pet não encontrado");
      Object.assign(pet, {
        name: input.name.trim(),
        species: input.species,
        breed: input.breed.trim() || null,
        color: input.color.trim() || null,
        approxAge: input.approxAge.trim() || null,
      });
      return pet;
    },
    async removePhoto(petId, photoId) {
      const pet = pets.find((p) => p.id === petId);
      if (pet) pet.photos = pet.photos.filter((ph) => ph.id !== photoId);
    },
    async addPhoto(petId, photo) {
      const problem = checkPhoto(photo);
      if (problem) throw new Error(problem);
      const added = { id: `${petId}-${Date.now()}`, url: photo.uri };
      pets.find((p) => p.id === petId)?.photos.push(added);
      return added;
    },
  };
}

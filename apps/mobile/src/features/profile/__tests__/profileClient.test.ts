import { createApiSession, type FetchLike } from "@/features/auth/apiSession";
import type { SessionStorage, StoredSession } from "@/features/auth/sessionStorage";
import { createMockOccurrencesClient } from "@/features/occurrences/occurrencesClient";
import { createMockPetsClient } from "@/features/pets/petsClient";
import { createHttpProfileClient, createMockProfileClient } from "../profileClient";

describe("createHttpProfileClient", () => {
  it("GET /me autenticado", async () => {
    const profile = { id: "u1", name: "Ana", pseudonym: "Tutor Laranja 42", petCount: 1, occurrenceCount: 2 };
    const fetch: FetchLike = jest.fn(async (url: string, init) => {
      expect(url).toBe("https://api.teste/me");
      expect(init.headers.Authorization).toBe("Bearer access");
      return { ok: true, status: 200, json: async () => profile };
    });
    const current: StoredSession = { accessToken: "access", refreshToken: "r", user: { id: "u1", name: "Ana", hasConsent: true } };
    const storage: SessionStorage = { load: async () => current, save: async () => {}, clear: async () => {} };
    const client = createHttpProfileClient({ session: createApiSession({ baseUrl: "https://api.teste", storage, fetch }) });
    expect(await client.me()).toEqual(profile);
  });
});

describe("createMockProfileClient", () => {
  it("conta os pets e as ocorrências dos clientes falsos", async () => {
    const pets = createMockPetsClient();
    const occurrences = createMockOccurrencesClient({ seed: false });
    await occurrences.create({ type: "seen", species: "cat", petName: "", breed: "", color: "", description: "", approxAddress: "", lat: 1, lng: 2 });
    const profile = await createMockProfileClient({ pets, occurrences }).me();
    expect(profile).toMatchObject({ pseudonym: expect.any(String), petCount: (await pets.listMine()).length, occurrenceCount: 1 });
  });
});

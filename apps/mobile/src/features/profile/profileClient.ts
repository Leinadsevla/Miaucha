import type { ApiSession } from "@/features/auth/apiSession";
import type { OccurrencesClient } from "@/features/occurrences/occurrencesClient";
import type { PetsClient } from "@/features/pets/petsClient";

/** Perfil do próprio usuário (`GET /me`). Sem e-mail. */
export type MyProfile = { id: string; name: string; pseudonym: string; petCount: number; occurrenceCount: number };

export type ProfileClient = { me(): Promise<MyProfile> };

export function createHttpProfileClient({ session }: { session: ApiSession }): ProfileClient {
  return { me: () => session.authed<MyProfile>("GET", "/me") };
}

/** Modo sem API: conta o que está nos clientes falsos. */
export function createMockProfileClient({ pets, occurrences }: { pets: PetsClient; occurrences: OccurrencesClient }): ProfileClient {
  return {
    async me() {
      const [myPets, mine] = await Promise.all([pets.listMine(), occurrences.listMine()]);
      return { id: "dev", name: "Você", pseudonym: "Tutor Laranja 42", petCount: myPets.length, occurrenceCount: mine.length };
    },
  };
}

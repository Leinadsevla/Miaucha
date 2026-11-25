import { useCallback, useState } from "react";
import { router, useFocusEffect } from "expo-router";
import type { MyPet, PublicOccurrence } from "@miaucha/shared";
import { useAlerts } from "@/features/alerts";
import { useAuth } from "@/features/auth";
import { useOccurrencesClient } from "@/features/occurrences";
import { usePetsClient } from "@/features/pets";
import { ProfileView, useProfileClient, type MyProfile } from "@/features/profile";

const message = (e: unknown, fallback: string) => (e instanceof Error ? e.message : fallback);

export default function ProfileTab() {
  const { state, logout } = useAuth();
  const petsClient = usePetsClient();
  const occurrencesClient = useOccurrencesClient();
  const profileClient = useProfileClient();
  const alerts = useAlerts();
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [pets, setPets] = useState<MyPet[] | null>(null);
  const [petsError, setPetsError] = useState<string>();
  const [occurrences, setOccurrences] = useState<PublicOccurrence[] | null>(null);
  const [occurrencesError, setOccurrencesError] = useState<string>();

  // Recarrega ao voltar do cadastro de pet ou de uma ocorrência.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      setPetsError(undefined);
      setOccurrencesError(undefined);
      petsClient.listMine().then(
        (list) => active && setPets(list),
        (e: unknown) => active && setPetsError(message(e, "Não foi possível carregar seus pets")),
      );
      occurrencesClient.listMine().then(
        (list) => active && setOccurrences(list),
        (e: unknown) => active && setOccurrencesError(message(e, "Não foi possível carregar suas ocorrências")),
      );
      profileClient.me().then(
        (p) => active && setProfile(p),
        () => {}, // os contadores ficam com traço
      );
      return () => {
        active = false;
      };
    }, [petsClient, occurrencesClient, profileClient]),
  );

  async function signOut() {
    // O aparelho deixa de receber push desta conta (melhor esforço: sair nunca falha por isso).
    if (alerts.pushToken) await alerts.client.removePushToken(alerts.pushToken).catch(() => {});
    await logout();
  }

  return (
    <ProfileView
      name={state.status === "signedIn" ? state.user.name : ""}
      profile={profile}
      pets={pets}
      petsError={petsError}
      occurrences={occurrences}
      occurrencesError={occurrencesError}
      onAddPet={() => router.push("/pets/new")}
      onOpenPet={(id) => router.push(`/pets/${id}`)}
      onOpenOccurrence={(id) => router.push({ pathname: "/occurrences/[id]", params: { id } })}
      onOpenAlertPreferences={() => router.push("/alert-preferences")}
      onOpenPrivacy={() => router.push("/privacy")}
      onOpenHelp={() => router.push("/help")}
      onLogout={() => void signOut()}
    />
  );
}

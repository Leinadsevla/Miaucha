import { useCallback, useEffect, useState } from "react";
import { Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { type OccurrenceUpdate, type PublicOccurrence } from "@miaucha/shared";
import { KeyboardScreen, ScreenHeader } from "@/components";
import { geocodeAddress, getCurrentLocation, type LocationResult } from "@/features/location";
import { OccurrenceForm, occurrenceTitle, updateOccurrence, useOccurrencesClient } from "@/features/occurrences";
import { createPhotoPicker, type PickedPhoto } from "@/features/pets";
import { showAlert } from "@/lib/dialog";
import { openAppSettings } from "@/lib/settings";

const pickPhotos = createPhotoPicker();

/** Editar uma ocorrência do usuário (só enquanto aberta). */
export default function EditOccurrence() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const client = useOccurrencesClient();
  const insets = useSafeAreaInsets();
  const [occurrence, setOccurrence] = useState<PublicOccurrence | null>(null);
  const [location, setLocation] = useState<LocationResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const locate = useCallback(() => {
    setLocation(null);
    void getCurrentLocation().then(setLocation);
  }, []);

  // Sem buscar a localização ao abrir: o formulário pede (onRetryLocation) só se a pessoa escolher "Minha localização".

  useEffect(() => {
    client.get(id).then(setOccurrence, (e: unknown) => setError(e instanceof Error ? e.message : "Não foi possível carregar a ocorrência"));
  }, [client, id]);

  async function save(update: OccurrenceUpdate, photos: PickedPhoto[], removedPhotoIds: string[]) {
    setBusy(true);
    setError(undefined);
    try {
      const { failedPhotos } = await updateOccurrence(client, id, update, photos, removedPhotoIds);
      if (failedPhotos > 0) showAlert("Alterações salvas", "Algumas fotos não foram atualizadas. Tente de novo mais tarde.");
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Algo deu errado. Tente de novo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <View className="flex-1 bg-background">
      <ScreenHeader title={"Editar ocorrência"} subtitle={occurrence ? occurrenceTitle(occurrence) : "Carregando..."} onBack={() => router.back()} />
      {occurrence ? (
        <KeyboardScreen className="flex-1" contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 24 }}>
          <OccurrenceForm
            location={location}
            onRetryLocation={locate}
            onOpenSettings={openAppSettings}
            onSubmit={() => {}}
            onSave={(update, photos, removed) => void save(update, photos, removed)}
            onPickPhotos={pickPhotos}
            initial={{
              type: occurrence.type,
              species: occurrence.species,
              petName: occurrence.petName ?? "",
              breed: occurrence.breed ?? "",
              color: occurrence.color ?? "",
              approxAddress: occurrence.approxAddress ?? "",
              description: occurrence.description ?? "",
            }}
            editing={{ photos: occurrence.photos ?? [] }}
            onGeocode={(address) => geocodeAddress(address, location?.status === "ok" ? location.coords : null)}
            loading={busy}
            serverError={error}
          />
        </KeyboardScreen>
      ) : (
        <Text className="p-5 text-center font-sans text-sm text-muted-foreground">{error ?? "Carregando..."}</Text>
      )}
    </View>
  );
}

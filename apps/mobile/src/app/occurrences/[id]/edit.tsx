import { useCallback, useEffect, useState } from "react";
import { Alert, Linking, Pressable, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, type OccurrenceUpdate, type PublicOccurrence } from "@miaucha/shared";
import { KeyboardScreen } from "@/components";
import { geocodeAddress, getCurrentLocation, type LocationResult } from "@/features/location";
import { OccurrenceForm, occurrenceTitle, updateOccurrence, useOccurrencesClient } from "@/features/occurrences";
import { createPhotoPicker, type PickedPhoto } from "@/features/pets";

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

  useEffect(locate, [locate]);

  useEffect(() => {
    client.get(id).then(setOccurrence, (e: unknown) => setError(e instanceof Error ? e.message : "Não foi possível carregar a ocorrência"));
  }, [client, id]);

  async function save(update: OccurrenceUpdate, photos: PickedPhoto[], removedPhotoIds: string[]) {
    setBusy(true);
    setError(undefined);
    try {
      const { failedPhotos } = await updateOccurrence(client, id, update, photos, removedPhotoIds);
      if (failedPhotos > 0) Alert.alert("Alterações salvas", "Algumas fotos não foram atualizadas. Tente de novo mais tarde.");
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Algo deu errado. Tente de novo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <View className="flex-1 bg-background">
      <View className="flex-row items-center gap-3 border-b border-border bg-white px-5 pb-4" style={{ paddingTop: insets.top + 16 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Voltar"
          onPress={() => router.back()}
          className="h-9 w-9 items-center justify-center rounded-xl bg-muted"
        >
          <ChevronLeft size={20} color={colors.foreground} />
        </Pressable>
        <View>
          <Text className="font-nunito-black text-base text-foreground">Editar ocorrência</Text>
          <Text className="font-sans text-xs text-muted-foreground">{occurrence ? occurrenceTitle(occurrence) : "Carregando..."}</Text>
        </View>
      </View>
      {occurrence ? (
        <KeyboardScreen className="flex-1" contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 24 }}>
          <OccurrenceForm
            location={location}
            onRetryLocation={locate}
            onOpenSettings={() => void Linking.openSettings()}
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

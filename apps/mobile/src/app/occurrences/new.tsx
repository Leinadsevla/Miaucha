import { useCallback, useEffect, useState } from "react";
import { Alert, Linking, Pressable, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, type MyPet, type OccurrenceInput } from "@miaucha/shared";
import { KeyboardScreen } from "@/components";
import { geocodeAddress, getCurrentLocation, type LocationResult } from "@/features/location";
import { OccurrenceForm, saveOccurrence, useOccurrencesClient } from "@/features/occurrences";
import { createPhotoPicker, usePetsClient, type PickedPhoto } from "@/features/pets";

const pickPhotos = createPhotoPicker();

/** Registrar ocorrência. `?petId=` pré-preenche com um pet do usuário ("registrar como perdido"). */
export default function NewOccurrence() {
  const { petId } = useLocalSearchParams<{ petId?: string }>();
  const client = useOccurrencesClient();
  const petsClient = usePetsClient();
  const insets = useSafeAreaInsets();
  const [location, setLocation] = useState<LocationResult | null>(null);
  // undefined = carregando o pet; null = sem pet (ou não foi possível carregar).
  const [pet, setPet] = useState<MyPet | null | undefined>(petId ? undefined : null);
  const [myPets, setMyPets] = useState<MyPet[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const locate = useCallback(() => {
    setLocation(null);
    void getCurrentLocation().then(setLocation);
  }, []);

  useEffect(locate, [locate]);

  // Para "Perdi meu pet" mostrar os pets cadastrados; sem eles o formulário segue normal.
  useEffect(() => {
    petsClient.listMine().then(setMyPets, () => setMyPets([]));
  }, [petsClient]);

  useEffect(() => {
    if (!petId) return;
    petsClient.get(petId).then(setPet, () => setPet(null));
  }, [petId, petsClient]);

  async function save(input: OccurrenceInput, photos: PickedPhoto[]) {
    setBusy(true);
    setError(undefined);
    try {
      const { occurrence, failedPhotos } = await saveOccurrence(client, input, photos);
      if (failedPhotos > 0) {
        Alert.alert(
          "Alerta emitido",
          `${failedPhotos === 1 ? "Uma foto não foi enviada" : `${failedPhotos} fotos não foram enviadas`}. O alerta já está valendo.`,
        );
      }
      router.replace({ pathname: "/occurrences/[id]", params: { id: occurrence.id } });
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
          <Text className="font-nunito-black text-base text-foreground">Registrar ocorrência</Text>
          <Text className="font-sans text-xs text-muted-foreground">Avise quem está perto</Text>
        </View>
      </View>
      {pet === undefined ? (
        <Text className="p-5 text-center font-sans text-sm text-muted-foreground">Carregando...</Text>
      ) : (
        <KeyboardScreen className="flex-1" contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 24 }}>
          <OccurrenceForm
            location={location}
            onRetryLocation={locate}
            onOpenSettings={() => void Linking.openSettings()}
            onSubmit={save}
            onPickPhotos={pickPhotos}
            initial={pet ? { type: "lost", species: pet.species, petName: pet.name, breed: pet.breed ?? "", color: pet.color ?? "" } : undefined}
            fromPet={pet ? { id: pet.id, name: pet.name, photoCount: pet.photos.length } : undefined}
            myPets={myPets}
            onGeocode={(address) => geocodeAddress(address, location?.status === "ok" ? location.coords : null)}
            loading={busy}
            serverError={error}
          />
        </KeyboardScreen>
      )}
    </View>
  );
}

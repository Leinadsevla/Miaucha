import { useCallback, useEffect, useState } from "react";
import { Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { type MyPet, type OccurrenceInput, type PublicOccurrence } from "@miaucha/shared";
import { KeyboardScreen, PrimaryButton, ScreenHeader } from "@/components";
import { geocodeAddress, getCurrentLocation, type LocationResult } from "@/features/location";
import { OccurrenceForm, saveOccurrence, useOccurrencesClient } from "@/features/occurrences";
import { createPhotoPicker, usePetsClient, type PickedPhoto } from "@/features/pets";
import { showAlert } from "@/lib/dialog";
import { openAppSettings } from "@/lib/settings";

const pickPhotos = createPhotoPicker();

/**
 * Registrar ocorrência. `?petId=` pré-preenche com um pet do usuário ("registrar como perdido");
 * `?sightingOf=` registra um avistamento do pet perdido dessa ocorrência ("Vi este pet").
 */
export default function NewOccurrence() {
  const { petId, sightingOf } = useLocalSearchParams<{ petId?: string; sightingOf?: string }>();
  const client = useOccurrencesClient();
  const petsClient = usePetsClient();
  const insets = useSafeAreaInsets();
  const [location, setLocation] = useState<LocationResult | null>(null);
  // undefined = carregando o pet; null = sem pet (ou não foi possível carregar).
  const [pet, setPet] = useState<MyPet | null | undefined>(petId ? undefined : null);
  // undefined = carregando o pet perdido; null = registro normal.
  const [lost, setLost] = useState<PublicOccurrence | null | undefined>(sightingOf ? undefined : null);
  // "Vi este pet" sem conseguir carregar o pet perdido: não cai no registro comum (o tutor não seria avisado).
  const [lostError, setLostError] = useState(false);
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

  const loadLost = useCallback(() => {
    if (!sightingOf) return;
    setLost(undefined);
    setLostError(false);
    client.get(sightingOf).then(setLost, () => setLostError(true));
  }, [sightingOf, client]);

  useEffect(loadLost, [loadLost]);

  async function save(input: OccurrenceInput, photos: PickedPhoto[]) {
    setBusy(true);
    setError(undefined);
    try {
      const { occurrence, failedPhotos } = await saveOccurrence(client, input, photos);
      if (failedPhotos > 0) {
        showAlert(
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
      <ScreenHeader title={"Registrar ocorrência"} subtitle={"Avise quem está perto"} onBack={() => router.back()} />
      {lostError ? (
        <View className="gap-3 p-5">
          <Text className="text-center font-sans text-sm text-muted-foreground">
            Não foi possível carregar o pet perdido. Verifique sua conexão.
          </Text>
          <PrimaryButton title="Tentar de novo" variant="outline" onPress={loadLost} />
        </View>
      ) : pet === undefined || lost === undefined ? (
        <Text className="p-5 text-center font-sans text-sm text-muted-foreground">Carregando...</Text>
      ) : (
        <KeyboardScreen className="flex-1" contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 24 }}>
          <OccurrenceForm
            location={location}
            onRetryLocation={locate}
            onOpenSettings={openAppSettings}
            onSubmit={save}
            onPickPhotos={pickPhotos}
            initial={
              pet
                ? { type: "lost", species: pet.species, petName: pet.name, breed: pet.breed ?? "", color: pet.color ?? "" }
                : lost
                  ? { type: "seen", species: lost.species, petName: lost.petName ?? "", breed: lost.breed ?? "", color: lost.color ?? "" }
                  : undefined
            }
            sightingOf={lost ? { id: lost.id, petName: lost.petName ?? "este pet" } : undefined}
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

import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { type MyPet, type PetInput } from "@miaucha/shared";
import { KeyboardScreen, ScreenHeader } from "@/components";
import { PetForm, createPhotoPicker, updatePet, usePetsClient, type PickedPhoto } from "@/features/pets";
import { showAlert } from "@/lib/dialog";

const pickPhotos = createPhotoPicker();

export default function EditPet() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const client = usePetsClient();
  const insets = useSafeAreaInsets();
  const [pet, setPet] = useState<MyPet | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    client.get(id).then(setPet, (e: unknown) => setError(e instanceof Error ? e.message : "Não foi possível carregar o pet"));
  }, [client, id]);

  async function save(input: PetInput, photos: PickedPhoto[], removedPhotoIds: string[]) {
    setBusy(true);
    setError(undefined);
    try {
      const { failedPhotos } = await updatePet(client, id, input, photos, removedPhotoIds);
      if (failedPhotos > 0) {
        showAlert("Alterações salvas", "Algumas fotos não foram atualizadas. Tente de novo mais tarde.");
      }
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Algo deu errado. Tente de novo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <View className="flex-1 bg-background">
      <ScreenHeader title={"Editar pet"} subtitle={pet?.name ?? "Carregando..."} onBack={() => router.back()} />
      {pet ? (
        <KeyboardScreen className="flex-1" contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 24 }}>
          <PetForm
            initial={{ name: pet.name, species: pet.species, breed: pet.breed ?? "", color: pet.color ?? "", approxAge: pet.approxAge ?? "" }}
            existingPhotos={pet.photos}
            submitLabel="Salvar alterações"
            onSubmit={save}
            onPickPhotos={pickPhotos}
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

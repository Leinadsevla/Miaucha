import { useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { type PetInput } from "@miaucha/shared";
import { KeyboardScreen, ScreenHeader } from "@/components";
import { PetForm, createPhotoPicker, savePet, usePetsClient, type PickedPhoto } from "@/features/pets";
import { showAlert } from "@/lib/dialog";

const pickPhotos = createPhotoPicker();

export default function NewPet() {
  const client = usePetsClient();
  const insets = useSafeAreaInsets();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function save(input: PetInput, photos: PickedPhoto[]) {
    setBusy(true);
    setError(undefined);
    try {
      const { failedPhotos } = await savePet(client, input, photos);
      if (failedPhotos > 0) {
        showAlert("Pet salvo", `${failedPhotos === 1 ? "Uma foto não foi enviada" : `${failedPhotos} fotos não foram enviadas`}. Tente adicionar de novo mais tarde.`);
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
      <ScreenHeader title={"Cadastrar pet"} subtitle={"Preencha os dados do seu pet"} onBack={() => router.back()} />
      <KeyboardScreen className="flex-1" contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 24 }}>
        <PetForm onSubmit={save} onPickPhotos={pickPhotos} loading={busy} serverError={error} />
      </KeyboardScreen>
    </View>
  );
}

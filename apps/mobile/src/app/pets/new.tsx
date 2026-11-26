import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, type PetInput } from "@miaucha/shared";
import { KeyboardScreen } from "@/components";
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
          <Text className="font-nunito-black text-base text-foreground">Cadastrar pet</Text>
          <Text className="font-sans text-xs text-muted-foreground">Preencha os dados do seu pet</Text>
        </View>
      </View>
      <KeyboardScreen className="flex-1" contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 24 }}>
        <PetForm onSubmit={save} onPickPhotos={pickPhotos} loading={busy} serverError={error} />
      </KeyboardScreen>
    </View>
  );
}

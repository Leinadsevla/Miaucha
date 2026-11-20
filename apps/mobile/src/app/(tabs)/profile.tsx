import { useCallback, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { MyPet } from "@miaucha/shared";
import { PrimaryButton } from "@/components";
import { useAuth } from "@/features/auth";
import { MyPetsCard, usePetsClient } from "@/features/pets";

export default function ProfileTab() {
  const { state, logout } = useAuth();
  const petsClient = usePetsClient();
  const insets = useSafeAreaInsets();
  const name = state.status === "signedIn" ? state.user.name : "";
  const [pets, setPets] = useState<MyPet[] | null>(null);
  const [error, setError] = useState<string>();

  // Recarrega ao voltar do cadastro de pet.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      setError(undefined);
      petsClient.listMine().then(
        (list) => active && setPets(list),
        (e: unknown) => active && setError(e instanceof Error ? e.message : "Não foi possível carregar seus pets"),
      );
      return () => {
        active = false;
      };
    }, [petsClient]),
  );

  return (
    <ScrollView className="flex-1 bg-background" contentContainerStyle={{ paddingBottom: 24 }}>
      <View className="items-center gap-3 bg-primary px-5 pb-8" style={{ paddingTop: insets.top + 24 }}>
        <View className="h-20 w-20 items-center justify-center rounded-3xl bg-white/20">
          <Text className="font-nunito-black text-3xl text-white">{name.charAt(0).toUpperCase()}</Text>
        </View>
        <Text className="font-nunito-black text-lg text-white">{name}</Text>
      </View>
      <View className="gap-3 p-5">
        <MyPetsCard pets={pets} error={error} onAdd={() => router.push("/pets/new")} onOpen={(id) => router.push(`/pets/${id}`)} />
        <Text className="text-center font-sans text-sm text-muted-foreground">Histórico e configurações chegam nas próximas sprints.</Text>
        <PrimaryButton title="Sair da conta" variant="outline" onPress={logout} />
      </View>
    </ScrollView>
  );
}

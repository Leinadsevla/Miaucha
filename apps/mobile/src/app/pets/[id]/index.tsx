import { useCallback, useState } from "react";
import { Text, View } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import type { MyPet } from "@miaucha/shared";
import { PrimaryButton } from "@/components";
import { PetDetails, usePetsClient } from "@/features/pets";

export default function PetDetailsRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const client = usePetsClient();
  const [pet, setPet] = useState<MyPet | null>(null);
  const [error, setError] = useState<string>();

  // Busca de novo ao abrir: as URLs das fotos são assinadas e expiram.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      client.get(id).then(
        (found) => active && setPet(found),
        (e: unknown) => active && setError(e instanceof Error ? e.message : "Não foi possível carregar o pet"),
      );
      return () => {
        active = false;
      };
    }, [client, id]),
  );

  if (pet) return <PetDetails pet={pet} onBack={() => router.back()} onEdit={() => router.push(`/pets/${pet.id}/edit`)} />;
  return (
    <View className="flex-1 items-center justify-center gap-4 bg-background p-5">
      <Text className="text-center font-sans text-sm text-muted-foreground">{error ?? "Carregando..."}</Text>
      {error ? <PrimaryButton title="Voltar" variant="outline" onPress={() => router.back()} /> : null}
    </View>
  );
}

import { useCallback, useState } from "react";
import { Alert, Linking, Platform, Text, View } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import type { PublicOccurrence } from "@miaucha/shared";
import { PrimaryButton } from "@/components";
import { OccurrenceDetails, openDirections, useOccurrencesClient } from "@/features/occurrences";

export default function OccurrenceDetailsRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const client = useOccurrencesClient();
  const [occurrence, setOccurrence] = useState<PublicOccurrence | null>(null);
  const [error, setError] = useState<string>();
  const [resolving, setResolving] = useState(false);
  const [resolveError, setResolveError] = useState<string>();

  // Busca de novo ao abrir: as URLs das fotos são assinadas e expiram.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      client.get(id).then(
        (found) => active && setOccurrence(found),
        (e: unknown) => active && setError(e instanceof Error ? e.message : "Não foi possível carregar a ocorrência"),
      );
      return () => {
        active = false;
      };
    }, [client, id]),
  );

  function confirmResolve() {
    Alert.alert("Marcar como resolvido?", "A ocorrência sai do mapa e das buscas.", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Marcar como resolvido",
        onPress: async () => {
          setResolving(true);
          setResolveError(undefined);
          try {
            setOccurrence(await client.resolve(id));
          } catch (e) {
            setResolveError(e instanceof Error ? e.message : "Não foi possível marcar como resolvido");
          } finally {
            setResolving(false);
          }
        },
      },
    ]);
  }

  if (occurrence) {
    return (
      <OccurrenceDetails
        occurrence={occurrence}
        onBack={() => router.back()}
        onDirections={(point) => openDirections(point, { platform: Platform.OS, alert: Alert.alert, openURL: Linking.openURL })}
        onResolve={confirmResolve}
        resolving={resolving}
        resolveError={resolveError}
      />
    );
  }
  return (
    <View className="flex-1 items-center justify-center gap-4 bg-background p-5">
      <Text className="text-center font-sans text-sm text-muted-foreground">{error ?? "Carregando..."}</Text>
      {error ? <PrimaryButton title="Voltar" variant="outline" onPress={() => router.back()} /> : null}
    </View>
  );
}

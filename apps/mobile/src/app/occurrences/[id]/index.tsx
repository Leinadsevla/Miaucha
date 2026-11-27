import { useCallback, useState } from "react";
import { Linking, Platform, Text, View } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import type { PublicOccurrence } from "@miaucha/shared";
import { PrimaryButton } from "@/components";
import { useChat } from "@/features/chat";
import { OccurrenceDetails, createDeviceDirections, useOccurrencesClient } from "@/features/occurrences";
import { showAlert } from "@/lib/dialog";

const showDirections = createDeviceDirections({ Linking, Alert: { alert: showAlert }, Platform });

export default function OccurrenceDetailsRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const client = useOccurrencesClient();
  const [occurrence, setOccurrence] = useState<PublicOccurrence | null>(null);
  const [error, setError] = useState<string>();
  const [resolving, setResolving] = useState(false);
  const [resolveError, setResolveError] = useState<string>();
  const { client: chat } = useChat();
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string>();

  async function openChat() {
    setChatLoading(true);
    setChatError(undefined);
    try {
      const conversation = await chat.start(id);
      router.push({ pathname: "/chat/[id]", params: { id: conversation.id } });
    } catch (e) {
      setChatError(e instanceof Error ? e.message : "Não foi possível abrir a conversa");
    } finally {
      setChatLoading(false);
    }
  }

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
    showAlert("Marcar como resolvido?", "A ocorrência sai do mapa e das buscas.", [
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
        onDirections={showDirections}
        onResolve={confirmResolve}
        resolving={resolving}
        resolveError={resolveError}
        onChat={() => void openChat()}
        onEdit={() => router.push({ pathname: "/occurrences/[id]/edit", params: { id: occurrence.id } })}
        onReportSighting={() => router.push({ pathname: "/occurrences/new", params: { sightingOf: occurrence.id } })}
        chatLoading={chatLoading}
        chatError={chatError}
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

import { Alert, Linking, Platform } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { ConversationScreen, useChat } from "@/features/chat";
import { getCurrentLocation } from "@/features/location";
import { createDeviceDirections } from "@/features/occurrences";
import { createPhotoPicker } from "@/features/pets/pickPhotos";

const showDirections = createDeviceDirections({ Linking, Alert, Platform });

const pickPhotos = createPhotoPicker();

export default function ConversationRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { client, realtime } = useChat();

  return (
    <ConversationScreen
      conversationId={id}
      client={client}
      realtime={realtime}
      onBack={() => router.back()}
      onOpenOccurrence={(occurrenceId) => router.push({ pathname: "/occurrences/[id]", params: { id: occurrenceId } })}
      onOpenLocation={showDirections}
      pickPhoto={async () => (await pickPhotos(1))[0] ?? null}
      getLocation={getCurrentLocation}
      confirm={(title, message, action) =>
        new Promise((resolve) =>
          Alert.alert(title, message, [
            { text: "Cancelar", style: "cancel", onPress: () => resolve(false) },
            { text: action, style: "destructive", onPress: () => resolve(true) },
          ], { cancelable: true, onDismiss: () => resolve(false) }),
        )
      }
    />
  );
}

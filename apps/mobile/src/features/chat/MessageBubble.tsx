import { Pressable, Text, View } from "react-native";
import { Image } from "expo-image";
import { MapPin } from "lucide-react-native";
import { colors, type ChatMessage, type LatLng } from "@miaucha/shared";
import { cn } from "@/lib/cn";
import { formatMessageTime } from "./chatState";

type Props = { message: ChatMessage; now?: Date; onOpenLocation: (point: LatLng) => void };

/** Balão de mensagem (ChatScreen do protótipo): minhas à direita, em laranja, com "Enviada"/"Lida" (CH-09). */
export function MessageBubble({ message: m, now, onOpenLocation }: Props) {
  const time = formatMessageTime(m.createdAt, now);
  return (
    <View className={cn("flex-row", m.mine ? "justify-end" : "justify-start")}>
      <View
        className={cn(
          "max-w-[78%] overflow-hidden rounded-2xl",
          m.mine ? "rounded-tr-sm bg-primary" : "rounded-tl-sm border border-border bg-white",
        )}
      >
        {m.kind === "photo" ? (
          m.photoUrl ? (
            <Image
              source={{ uri: m.photoUrl }}
              contentFit="cover"
              style={{ width: 220, height: 220 }}
              accessibilityLabel={m.mine ? "Foto enviada" : "Foto recebida"}
            />
          ) : (
            <Text className="px-4 py-2.5 font-sans text-sm text-muted-foreground">Foto indisponível</Text>
          )
        ) : m.kind === "location" && m.location ? (
          <View className="gap-2 p-3">
            <View className="flex-row items-center gap-2">
              <View className="h-8 w-8 items-center justify-center rounded-xl bg-primary-soft">
                <MapPin size={14} color={colors.primary} />
              </View>
              <View>
                <Text className={cn("font-nunito-bold text-xs", m.mine ? "text-white" : "text-foreground")}>Localização aproximada</Text>
                <Text className={cn("font-sans text-xs", m.mine ? "text-white/80" : "text-muted-foreground")}>Num raio de ~150 m</Text>
              </View>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Abrir no mapa"
              onPress={() => onOpenLocation(m.location!)}
              className="items-center rounded-xl bg-white py-1.5 active:opacity-80"
            >
              <Text className="font-nunito-bold text-xs text-primary">Abrir no mapa</Text>
            </Pressable>
          </View>
        ) : (
          <Text className={cn("px-4 pt-2.5 font-sans text-sm", m.mine ? "text-white" : "text-foreground")}>{m.text}</Text>
        )}
        <View className="flex-row items-center justify-end gap-1 px-3 pb-1.5 pt-1">
          <Text className={cn("font-sans text-xs", m.mine ? "text-white/70" : "text-muted-foreground")}>{time}</Text>
          {m.mine ? (
            <Text accessibilityLabel={m.readAt ? "Lida" : "Enviada"} className="font-nunito-bold text-xs text-white/80">
              {m.readAt ? "✓✓ Lida" : "✓"}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

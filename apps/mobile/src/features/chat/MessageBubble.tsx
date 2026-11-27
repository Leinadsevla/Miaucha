import { Pressable, Text, View } from "react-native";
import { Image } from "expo-image";
import { Check, CheckCheck, MapPin } from "lucide-react-native";
import { colors, type ChatMessage, type LatLng } from "@miaucha/shared";
import { cn } from "@/lib/cn";
import { formatMessageTime } from "./chatState";

type Props = { message: ChatMessage; now?: Date; onOpenLocation: (point: LatLng) => void };

/** Balão de mensagem: minhas à direita, em azul (texto branco legível), com "Enviada"/"Lida" (CH-09). */
export function MessageBubble({ message: m, now, onOpenLocation }: Props) {
  const time = formatMessageTime(m.createdAt, now);
  return (
    <View className={cn("flex-row", m.mine ? "justify-end" : "justify-start")}>
      <View
        className={cn(
          "max-w-[78%] overflow-hidden rounded-2xl",
          m.mine ? "rounded-tr-md bg-brand" : "rounded-tl-md border border-border bg-white",
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
              <View className="h-9 w-9 items-center justify-center rounded-xl bg-brand-soft">
                <MapPin size={16} color={colors.brand} />
              </View>
              <View>
                <Text className={cn("font-ui-bold text-xs", m.mine ? "text-white" : "text-foreground")}>Localização aproximada</Text>
                <Text className={cn("font-sans text-xs", m.mine ? "text-white" : "text-muted-foreground")}>Num raio de ~150 m</Text>
              </View>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Abrir no mapa"
              onPress={() => onOpenLocation(m.location!)}
              className="items-center justify-center rounded-xl bg-white active:opacity-80"
              style={{ minHeight: 44 }}
            >
              <Text className="font-ui-bold text-sm text-brand">Abrir no mapa</Text>
            </Pressable>
          </View>
        ) : (
          <Text className={cn("px-4 pt-2.5 font-sans text-base leading-6", m.mine ? "text-white" : "text-foreground")}>{m.text}</Text>
        )}
        <View className="flex-row items-center justify-end gap-1 px-3 pb-1.5 pt-1">
          <Text className={cn("font-sans text-xs", m.mine ? "text-white" : "text-muted-foreground")}>{time}</Text>
          {m.mine ? (
            <View accessible accessibilityLabel={m.readAt ? "Lida" : "Enviada"} className="flex-row items-center gap-0.5">
              {m.readAt ? <CheckCheck size={14} color={colors.white} /> : <Check size={14} color={colors.white} />}
              {m.readAt ? <Text className="font-ui-bold text-xs text-white">Lida</Text> : null}
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

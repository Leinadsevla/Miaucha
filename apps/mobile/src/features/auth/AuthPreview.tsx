import { Text, View } from "react-native";
import { Image } from "expo-image";
import { Bell, MapPin } from "lucide-react-native";
import { colors, elevation } from "@miaucha/shared";
import { StatusBadge } from "@/components";
import { DEMO_PHOTOS } from "@/features/demo/demoPhotos";

/**
 * Prévia do app no painel da tela de entrada (tela larga): um pet perdido, o alerta e a conversa.
 * É uma ilustração montada com as peças do app; nada aqui é clicável.
 */
export function AuthPreview() {
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel="Prévia do aplicativo: um pet perdido, um alerta de proximidade e uma conversa"
      style={{ width: 468, height: 292 }}
    >
      <View
        className="absolute overflow-hidden rounded-[20px] border border-border bg-white"
        style={[{ left: 0, top: 18, width: 214, transform: [{ rotate: "-3deg" }] }, elevation.raised]}
      >
        <View style={{ aspectRatio: 4 / 3, backgroundColor: colors.muted }}>
          <Image source={DEMO_PHOTOS.goldenDog} style={{ width: "100%", height: "100%" }} contentFit="cover" />
          <View className="absolute left-2.5 top-2.5">
            <StatusBadge type="lost" />
          </View>
        </View>
        <View className="p-3.5">
          <View className="flex-row items-center justify-between">
            <Text className="font-ui-bold text-base text-foreground">Thor</Text>
            <Text className="font-ui-semibold text-xs text-brand-deep">300 m</Text>
          </View>
          <Text className="mt-0.5 font-sans text-sm text-muted-foreground">Golden Retriever</Text>
          <View className="mt-2 flex-row items-center gap-1.5">
            <MapPin size={13} color={colors.mutedForeground} />
            <Text className="font-sans text-xs text-muted-foreground">Perto da praça · 2h atrás</Text>
          </View>
        </View>
      </View>

      <View className="absolute flex-row items-center gap-3 rounded-2xl border border-border bg-white p-3.5" style={[{ right: 0, top: 0, width: 262 }, elevation.raised]}>
        <View className="h-10 w-10 items-center justify-center rounded-xl bg-brand-soft">
          <Bell size={18} color={colors.brand} />
        </View>
        <View className="flex-1">
          <Text className="font-ui-bold text-sm text-foreground">Alerta perto de você</Text>
          <Text className="font-sans text-xs text-muted-foreground">Thor sumiu a 300 m daqui</Text>
        </View>
      </View>

      <View className="absolute gap-2" style={{ right: 8, top: 108, width: 236 }}>
        <View className="self-start rounded-2xl rounded-tl-md border border-border bg-white px-3.5 py-2.5" style={elevation.card}>
          <Text className="mb-0.5 font-ui-semibold text-xs text-muted-foreground">Vizinho Azul 7</Text>
          <Text className="font-sans text-sm text-foreground">Acho que vi o Thor perto da praça!</Text>
        </View>
        <View className="self-end rounded-2xl rounded-tr-md bg-brand px-3.5 py-2.5">
          <Text className="font-ui-medium text-sm text-white">Estou indo aí. Obrigado!</Text>
        </View>
      </View>
    </View>
  );
}

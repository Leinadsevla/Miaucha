import { Pressable, Text, View } from "react-native";
import { Image } from "expo-image";
import { Clock, MapPin, Navigation, X } from "lucide-react-native";
import { colors, formatTimeAgo, type LatLng, type PublicOccurrence } from "@miaucha/shared";
import { SpeciesIcon, StatusBadge } from "@/components";
import { occurrenceTitle } from "@/features/occurrences/OccurrenceDetails";

type Props = {
  occurrence: PublicOccurrence;
  onOpen: (id: string) => void;
  /** MP-06: recebe o ponto público (o app não conhece o exato). */
  onDirections: (point: LatLng) => void;
  onClose: () => void;
  now?: Date;
};

/** MP-04: card ao tocar num marcador, com foto, nome, espécie e tempo desde o registro. */
export function OccurrenceCard({ occurrence: o, onOpen, onDirections, onClose, now = new Date() }: Props) {
  const title = occurrenceTitle(o);
  const subtitle = [o.species === "dog" ? "Cão" : "Gato", o.breed].filter(Boolean).join(" · ");
  return (
    <View className="flex-row gap-3 rounded-3xl bg-white p-4 shadow-lg">
      <View className="h-20 w-20 overflow-hidden rounded-2xl bg-muted">
        {o.photoUrls[0] ? (
          <Image accessibilityLabel={`Foto de ${title}`} source={{ uri: o.photoUrls[0] }} contentFit="cover" style={{ width: "100%", height: "100%" }} />
        ) : (
          <View accessibilityLabel={`${title} ainda não tem foto`} className="flex-1 items-center justify-center">
            <SpeciesIcon species={o.species} size={32} color={colors.mutedForeground} />
          </View>
        )}
      </View>

      <View className="flex-1 gap-1">
        <View className="flex-row items-start gap-2 pr-6">
          <Text numberOfLines={1} className="flex-shrink font-nunito-black text-base text-foreground">
            {title}
          </Text>
          <StatusBadge type={o.type} />
        </View>
        <Text className="font-sans text-xs text-muted-foreground">{subtitle}</Text>
        <View className="flex-row items-center gap-1">
          <Clock size={11} color={colors.accent} />
          <Text className="font-sans text-xs text-muted-foreground">{formatTimeAgo(new Date(o.createdAt), now)}</Text>
        </View>
        {o.approxAddress ? (
          <View className="flex-row items-center gap-1">
            <MapPin size={11} color={colors.primary} />
            <Text numberOfLines={1} className="flex-1 font-sans text-xs text-muted-foreground">
              {o.approxAddress}
            </Text>
          </View>
        ) : null}

        <View className="mt-1 flex-row gap-2">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Ver detalhes"
            onPress={() => onOpen(o.id)}
            className="flex-1 items-center rounded-xl bg-primary py-2 active:opacity-80"
          >
            <Text className="font-nunito-bold text-xs text-white">Ver detalhes</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Como chegar"
            onPress={() => onDirections(o.publicLocation)}
            className="flex-row items-center gap-1 rounded-xl border border-border px-3 py-2 active:opacity-80"
          >
            <Navigation size={12} color={colors.foreground} />
            <Text className="font-nunito-bold text-xs text-foreground">Como chegar</Text>
          </Pressable>
        </View>
      </View>

      <Pressable accessibilityRole="button" accessibilityLabel="Fechar" onPress={onClose} hitSlop={12} className="absolute right-3 top-3">
        <X size={16} color={colors.mutedForeground} />
      </Pressable>
    </View>
  );
}

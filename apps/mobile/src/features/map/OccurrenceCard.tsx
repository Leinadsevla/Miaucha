import { Pressable, Text, View } from "react-native";
import { Image } from "expo-image";
import { Clock, MapPin, Navigation, X } from "lucide-react-native";
import { colors, elevation, speciesLabel, formatTimeAgo, type LatLng, type PublicOccurrence } from "@miaucha/shared";
import { MISSING_REGION, SpeciesIcon, StatusBadge } from "@/components";
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
  const subtitle = [speciesLabel(o.species), o.breed].filter(Boolean).join(" · ");
  return (
    <View className="flex-row gap-3 rounded-3xl bg-white p-4" style={elevation.floating}>
      <View className="h-24 w-24 overflow-hidden rounded-2xl bg-muted">
        {o.photoUrls[0] ? (
          <Image accessibilityLabel={`Foto de ${title}`} source={{ uri: o.photoUrls[0] }} contentFit="cover" style={{ width: "100%", height: "100%" }} />
        ) : (
          <View accessibilityLabel={`${title} ainda não tem foto`} className="flex-1 items-center justify-center">
            <SpeciesIcon species={o.species} size={32} color={colors.mutedForeground} />
          </View>
        )}
      </View>

      <View className="flex-1 gap-1">
        <View className="flex-row items-start gap-2 pr-9">
          <Text numberOfLines={1} className="flex-shrink font-nunito-black text-base text-foreground">
            {title}
          </Text>
          <StatusBadge type={o.type} />
        </View>
        <Text testID="occurrence-card-subtitle" numberOfLines={1} className="font-sans text-xs text-muted-foreground">
          {subtitle}
        </Text>
        <View className="flex-row items-center gap-1">
          <Clock size={13} color={colors.accent} />
          <Text className="font-sans text-xs text-muted-foreground">{formatTimeAgo(new Date(o.createdAt), now)}</Text>
        </View>
        <View className="flex-row items-center gap-1">
          <MapPin size={13} color={colors.primaryDeep} />
          <Text testID="occurrence-card-address" numberOfLines={1} className="flex-1 font-sans text-xs text-muted-foreground">
            {o.approxAddress ?? MISSING_REGION}
          </Text>
        </View>

        <View className="mt-2 flex-row gap-2">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Ver detalhes"
            onPress={() => onOpen(o.id)}
            style={({ pressed }) => ({ flex: 1, minHeight: 44, alignItems: "center", justifyContent: "center", borderRadius: 14, backgroundColor: pressed ? colors.accentDeep : colors.accent })}
          >
            <Text className="font-nunito-bold text-sm text-white">Ver detalhes</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Como chegar"
            onPress={() => onDirections(o.publicLocation)}
            style={({ pressed }) => ({
              minHeight: 44,
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: colors.border,
              paddingHorizontal: 12,
              backgroundColor: pressed ? colors.muted : colors.white,
            })}
          >
            <Navigation size={14} color={colors.foreground} />
            <Text className="font-nunito-bold text-sm text-foreground">Como chegar</Text>
          </Pressable>
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Fechar"
        onPress={onClose}
        hitSlop={8}
        style={({ pressed }) => ({ position: "absolute", right: 10, top: 10, width: 32, height: 32, alignItems: "center", justifyContent: "center", borderRadius: 16, backgroundColor: pressed ? colors.border : colors.muted })}
      >
        <X size={16} color={colors.foreground} />
      </Pressable>
    </View>
  );
}

import { Pressable, Text, View } from "react-native";
import { Image } from "expo-image";
import { Clock, MapPin } from "lucide-react-native";
import { colors, formatDistance, formatTimeAgo, occurrenceStyle, type PublicOccurrence } from "@miaucha/shared";
import { StatusBadge } from "./StatusBadge";
import { SpeciesIcon } from "./SpeciesIcon";

type Props = {
  occurrence: PublicOccurrence;
  distanceMeters?: number;
  now?: Date;
  onPress: () => void;
};

export function PetCard({ occurrence: o, distanceMeters, now = new Date(), onPress }: Props) {
  const name = o.petName ?? "Sem nome";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${occurrenceStyle(o.type).label}`}
      onPress={onPress}
      className="w-52 overflow-hidden rounded-2xl border border-border bg-card shadow-sm active:opacity-90"
    >
      <View className="relative h-36 bg-muted">
        {o.photoUrls[0] ? (
          <Image source={{ uri: o.photoUrls[0] }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
        ) : null}
        <View className="absolute left-2 top-2">
          <StatusBadge type={o.type} />
        </View>
        <View className="absolute right-2 top-2 h-7 w-7 items-center justify-center rounded-full bg-white/90">
          <SpeciesIcon species={o.species} size={14} color={colors.foreground} />
        </View>
      </View>
      <View className="p-3">
        <View className="flex-row items-center justify-between">
          <Text className="font-nunito-bold text-sm text-foreground">{name}</Text>
          {distanceMeters !== undefined ? (
            <Text className="font-sans text-xs text-muted-foreground">{formatDistance(distanceMeters)}</Text>
          ) : null}
        </View>
        {o.breed ? <Text className="mt-0.5 font-sans text-xs text-muted-foreground">{o.breed}</Text> : null}
        {o.approxAddress ? (
          <View className="mt-2 flex-row items-center gap-1">
            <MapPin size={11} color={colors.primary} />
            <Text numberOfLines={1} className="flex-1 font-sans text-xs text-muted-foreground">
              {o.approxAddress}
            </Text>
          </View>
        ) : null}
        <View className="mt-1 flex-row items-center gap-1">
          <Clock size={11} color={colors.accent} />
          <Text className="font-sans text-xs text-muted-foreground">{formatTimeAgo(new Date(o.createdAt), now)}</Text>
        </View>
      </View>
    </Pressable>
  );
}

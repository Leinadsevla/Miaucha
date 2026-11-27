import { Pressable, Text, View } from "react-native";
import { Image } from "expo-image";
import { Clock, MapPin } from "lucide-react-native";
import { colors, elevation, formatDistance, formatTimeAgo, occurrenceStyle, speciesLabel, type PublicOccurrence } from "@miaucha/shared";
import { SpeciesIcon } from "./SpeciesIcon";
import { StatusBadge } from "./StatusBadge";
import { cn } from "@/lib/cn";

/**
 * Texto no lugar da região quando a ocorrência não tem endereço. Os cards mostram sempre as mesmas
 * linhas (cada uma com uma linha só) para terem a mesma altura lado a lado.
 */
export const MISSING_REGION = "Região não informada";

type Props = {
  occurrence: PublicOccurrence;
  distanceMeters?: number;
  now?: Date;
  onPress: () => void;
  /** Ocupa a largura da coluna (grade da Início) em vez da largura fixa. */
  fill?: boolean;
};

export function PetCard({ occurrence: o, distanceMeters = o.distanceMeters, now = new Date(), onPress, fill }: Props) {
  const name = o.petName ?? "Sem nome";
  const { color, label, soft } = occurrenceStyle(o.type);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${label}`}
      onPress={onPress}
      className={cn("overflow-hidden rounded-[20px] border border-border bg-card active:opacity-90", fill ? "w-full" : "w-52")}
      style={elevation.card}
    >
      {/* Sem foto, o fundo leva a cor clara do tipo: o cartão continua dizendo o que é de relance. */}
      <View testID="pet-card-cover" style={{ aspectRatio: 4 / 3, backgroundColor: o.photoUrls[0] ? colors.muted : soft }}>
        {o.photoUrls[0] ? (
          <Image testID="pet-card-photo" source={{ uri: o.photoUrls[0] }} style={{ width: "100%", height: "100%" }} contentFit="cover" transition={200} />
        ) : (
          <View className="flex-1 items-center justify-center">
            <SpeciesIcon species={o.species} size={44} color={color} />
          </View>
        )}
        <View className="absolute left-2.5 top-2.5">
          <StatusBadge type={o.type} />
        </View>
      </View>
      <View className="p-3.5">
        <View className="flex-row items-center justify-between gap-2">
          <Text testID="pet-card-name" numberOfLines={1} className="flex-1 font-ui-bold text-base text-foreground">
            {name}
          </Text>
          {distanceMeters !== undefined ? (
            <Text className="font-ui-semibold text-xs text-brand">{formatDistance(distanceMeters)}</Text>
          ) : null}
        </View>
        <Text testID="pet-card-breed" numberOfLines={1} className="mt-0.5 font-sans text-sm text-muted-foreground">
          {o.breed ?? speciesLabel(o.species)}
        </Text>
        <View className="mt-2.5 flex-row items-center gap-1.5">
          <MapPin size={13} color={colors.mutedForeground} />
          <Text testID="pet-card-address" numberOfLines={1} className="flex-1 font-sans text-xs text-muted-foreground">
            {o.approxAddress ?? MISSING_REGION}
          </Text>
        </View>
        <View className="mt-1 flex-row items-center gap-1.5">
          <Clock size={13} color={colors.mutedForeground} />
          <Text className="font-sans text-xs text-muted-foreground">{formatTimeAgo(new Date(o.createdAt), now)}</Text>
        </View>
      </View>
    </Pressable>
  );
}

import { Pressable, Text, View } from "react-native";
import { Image } from "expo-image";
import { AlertTriangle, Clock, Eye, HandHeart, MapPin } from "lucide-react-native";
import { colors, elevation, formatDistance, formatTimeAgo, occurrenceStyle, speciesLabel, type PublicOccurrence } from "@miaucha/shared";
import { SpeciesIcon } from "./SpeciesIcon";
import { cn } from "@/lib/cn";

const ICONS = { lost: AlertTriangle, seen: Eye, found: HandHeart } as const;

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
  const { color, label, textOn } = occurrenceStyle(o.type);
  const TypeIcon = ICONS[o.type];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${occurrenceStyle(o.type).label}`}
      onPress={onPress}
      className={cn("overflow-hidden rounded-3xl border border-border bg-card active:opacity-90", fill ? "w-full" : "w-52")}
      style={elevation.card}
    >
      {/* Faixa do tipo no topo: o que mais importa no card, visível de longe. */}
      <View testID="pet-card-band" className="flex-row items-center justify-center gap-1.5 py-1.5" style={{ backgroundColor: color }}>
        <TypeIcon size={14} color={textOn} />
        <Text className="font-nunito-black text-xs uppercase tracking-wider" style={{ color: textOn }}>
          {label}
        </Text>
      </View>
      <View className="relative bg-muted" style={{ aspectRatio: 4 / 3 }}>
        {o.photoUrls[0] ? (
          <Image source={{ uri: o.photoUrls[0] }} style={{ width: "100%", height: "100%" }} contentFit="cover" transition={200} />
        ) : (
          <View className="flex-1 items-center justify-center">
            <SpeciesIcon species={o.species} size={36} color={colors.border} />
          </View>
        )}
        <View className="absolute right-2 top-2 h-8 w-8 items-center justify-center rounded-full bg-white" style={elevation.card}>
          <SpeciesIcon species={o.species} size={16} color={colors.foreground} />
        </View>
      </View>
      <View className="p-3.5">
        <View className="flex-row items-center justify-between">
          <Text testID="pet-card-name" numberOfLines={1} className="flex-1 font-nunito-black text-base text-foreground">
            {name}
          </Text>
          {distanceMeters !== undefined ? (
            <Text className="font-sans text-xs text-muted-foreground">{formatDistance(distanceMeters)}</Text>
          ) : null}
        </View>
        <Text testID="pet-card-breed" numberOfLines={1} className="mt-0.5 font-sans text-xs text-muted-foreground">
          {o.breed ?? speciesLabel(o.species)}
        </Text>
        <View className="mt-2 flex-row items-center gap-1">
          <MapPin size={13} color={colors.primaryDeep} />
          <Text testID="pet-card-address" numberOfLines={1} className="flex-1 font-sans text-xs text-muted-foreground">
            {o.approxAddress ?? MISSING_REGION}
          </Text>
        </View>
        <View className="mt-1 flex-row items-center gap-1">
          <Clock size={13} color={colors.accent} />
          <Text className="font-sans text-xs text-muted-foreground">{formatTimeAgo(new Date(o.createdAt), now)}</Text>
        </View>
      </View>
    </Pressable>
  );
}

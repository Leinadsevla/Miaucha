import { Pressable, Text, View } from "react-native";
import { Image } from "expo-image";
import { AlertTriangle, Clock, Eye, HandHeart, MapPin } from "lucide-react-native";
import { colors, formatDistance, formatTimeAgo, occurrenceStyle, type PublicOccurrence } from "@miaucha/shared";
import { SpeciesIcon } from "./SpeciesIcon";
import { cn } from "@/lib/cn";

const ICONS = { lost: AlertTriangle, seen: Eye, found: HandHeart } as const;

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
      className={cn("overflow-hidden rounded-2xl border border-border bg-card shadow-sm active:opacity-90", fill ? "w-full" : "w-52")}
    >
      {/* Faixa do tipo no topo: o que mais importa no card, visível de longe. */}
      <View testID="pet-card-band" className="flex-row items-center justify-center gap-1.5 py-1.5" style={{ backgroundColor: color }}>
        <TypeIcon size={14} color={textOn} />
        <Text className="font-nunito-black text-xs uppercase tracking-wider" style={{ color: textOn }}>
          {label}
        </Text>
      </View>
      <View className="relative h-32 bg-muted">
        {o.photoUrls[0] ? (
          <Image source={{ uri: o.photoUrls[0] }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
        ) : null}
        <View className="absolute right-2 top-2 h-7 w-7 items-center justify-center rounded-full bg-white/90">
          <SpeciesIcon species={o.species} size={14} color={colors.foreground} />
        </View>
      </View>
      <View className="p-3">
        <View className="flex-row items-center justify-between">
          <Text numberOfLines={1} className="flex-1 font-nunito-bold text-sm text-foreground">
            {name}
          </Text>
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

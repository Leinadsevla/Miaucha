import { Text, View } from "react-native";
import { colors, occurrenceStyle, type OccurrenceType, type PublicOccurrence, type Species } from "@miaucha/shared";
import { SpeciesIcon } from "@/components";
import { occurrenceTitle } from "@/features/occurrences/OccurrenceDetails";
import type { ClusterItem } from "./clusters";
import { MapPoint } from "./MapCanvas";

/** MP-01: cor pelo tipo (perdido, avistado, encontrado) e ícone pela espécie. */
export function OccurrencePin({ type, species, selected = false }: { type: OccurrenceType; species: Species; selected?: boolean }) {
  const { color } = occurrenceStyle(type);
  const label = occurrenceTitle({ petName: null, species, type });
  return (
    <View className="items-center">
      <View
        accessibilityLabel={selected ? `${label}, selecionado` : label}
        className="h-10 w-10 items-center justify-center rounded-2xl border-2 border-white"
        style={{ backgroundColor: color, transform: [{ scale: selected ? 1.2 : 1 }] }}
      >
        <View testID={`pin-icon-${species}`}>
          <SpeciesIcon species={species} size={20} color={colors.white} />
        </View>
      </View>
      <View className="-mt-0.5 h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
    </View>
  );
}

/** MP-03: grupo de ocorrências com a contagem. */
export function ClusterBubble({ count }: { count: number }) {
  const size = count < 10 ? 40 : count < 100 ? 48 : 56;
  return (
    <View
      accessibilityLabel={`${count} ocorrências agrupadas. Toque para aproximar`}
      className="items-center justify-center rounded-full border-4 border-white bg-primary"
      style={{ width: size, height: size }}
    >
      <Text className="font-nunito-black text-sm text-white">{count}</Text>
    </View>
  );
}

export function OccurrenceMarker({ occurrence: o, selected, onPress }: { occurrence: PublicOccurrence; selected: boolean; onPress: () => void }) {
  return (
    <MapPoint testID={`marker-${o.id}`} coordinate={o.publicLocation} anchor="bottom" onPress={onPress}>
      <OccurrencePin type={o.type} species={o.species} selected={selected} />
    </MapPoint>
  );
}

export function ClusterMarker({ cluster, onPress }: { cluster: ClusterItem; onPress: () => void }) {
  return (
    <MapPoint testID={`cluster-${cluster.count}`} coordinate={cluster.coordinate} onPress={onPress}>
      <ClusterBubble count={cluster.count} />
    </MapPoint>
  );
}

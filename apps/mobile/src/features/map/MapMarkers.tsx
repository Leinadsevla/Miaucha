import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { Marker } from "react-native-maps";
import { colors, occurrenceStyle, type OccurrenceType, type PublicOccurrence, type Species } from "@miaucha/shared";
import { SpeciesIcon } from "@/components";
import { occurrenceTitle } from "@/features/occurrences/OccurrenceDetails";
import type { ClusterItem } from "./clusters";

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

/**
 * Marcadores com view própria ficam lentos se o mapa redesenhar a view a todo instante. Redesenha
 * só por um momento depois de montar ou de mudar a aparência (no Android, desligar de cara deixa o
 * marcador em branco).
 */
function useTracksViewChanges(appearanceKey: string) {
  const [tracks, setTracks] = useState(true);
  useEffect(() => {
    setTracks(true);
    const timer = setTimeout(() => setTracks(false), 500);
    return () => clearTimeout(timer);
  }, [appearanceKey]);
  return tracks;
}

export function OccurrenceMarker({ occurrence: o, selected, onPress }: { occurrence: PublicOccurrence; selected: boolean; onPress: () => void }) {
  const tracksViewChanges = useTracksViewChanges(`${o.type}-${o.species}-${selected}`);
  return (
    <Marker
      testID={`marker-${o.id}`}
      coordinate={{ latitude: o.publicLocation.lat, longitude: o.publicLocation.lng }}
      anchor={{ x: 0.5, y: 1 }}
      tracksViewChanges={tracksViewChanges}
      zIndex={selected ? 2 : 1}
      onPress={(e) => {
        e?.stopPropagation?.();
        onPress();
      }}
    >
      <OccurrencePin type={o.type} species={o.species} selected={selected} />
    </Marker>
  );
}

export function ClusterMarker({ cluster, onPress }: { cluster: ClusterItem; onPress: () => void }) {
  const tracksViewChanges = useTracksViewChanges(String(cluster.count));
  return (
    <Marker
      testID={`cluster-${cluster.count}`}
      coordinate={{ latitude: cluster.coordinate.lat, longitude: cluster.coordinate.lng }}
      anchor={{ x: 0.5, y: 0.5 }}
      tracksViewChanges={tracksViewChanges}
      onPress={(e) => {
        e?.stopPropagation?.();
        onPress();
      }}
    >
      <ClusterBubble count={cluster.count} />
    </Marker>
  );
}

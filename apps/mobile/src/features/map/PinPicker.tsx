import { useEffect, useRef } from "react";
import { Text, View } from "react-native";
import MapView, { Marker } from "react-native-maps";
import { MapPin } from "lucide-react-native";
import { colors, type LatLng } from "@miaucha/shared";
import { regionAround } from "./region";

/** Zoom de rua (~500 m de altura): dá para acertar o quarteirão. */
const PIN_DELTA = 0.005;
const MAP_HEIGHT = 192;

type Props = {
  value: LatLng;
  onChange: (point: LatLng) => void;
};

type Coordinate = { latitude: number; longitude: number };
type CoordinateEvent = { nativeEvent: { coordinate: Coordinate } };

const toLatLng = ({ latitude, longitude }: Coordinate): LatLng => ({ lat: latitude, lng: longitude });

/**
 * Mapa pequeno para ajustar o ponto de uma ocorrência: arraste o marcador ou toque no mapa.
 * O ponto escolhido é o real (só a API o vê); no mapa público aparece o ponto deslocado (MP-07).
 */
export function PinPicker({ value, onChange }: Props) {
  const mapRef = useRef<MapView>(null);
  // O último ponto escolhido aqui: quando o valor volta igual, não recentraliza (o usuário já está vendo).
  const lastPicked = useRef<LatLng>(value);

  useEffect(() => {
    const picked = lastPicked.current;
    if (picked.lat === value.lat && picked.lng === value.lng) return;
    lastPicked.current = value;
    mapRef.current?.animateToRegion(regionAround(value, PIN_DELTA), 300);
  }, [value]);

  function pick(event: CoordinateEvent) {
    const point = toLatLng(event.nativeEvent.coordinate);
    lastPicked.current = point;
    onChange(point);
  }

  return (
    <View className="gap-2">
      <View className="overflow-hidden rounded-2xl border border-border" style={{ height: MAP_HEIGHT }}>
        <MapView
          ref={mapRef}
          testID="pin-picker-map"
          style={{ flex: 1 }}
          initialRegion={regionAround(value, PIN_DELTA)}
          toolbarEnabled={false}
          rotateEnabled={false}
          pitchEnabled={false}
          onPress={pick}
        >
          <Marker
            testID="pin-picker-marker"
            coordinate={{ latitude: value.lat, longitude: value.lng }}
            draggable
            pinColor={colors.primary}
            onDragEnd={pick}
          />
        </MapView>
      </View>
      <View className="flex-row items-start gap-2">
        <MapPin size={14} color={colors.accent} />
        <Text className="flex-1 font-sans text-xs text-muted-foreground">
          Arraste o marcador ou toque no mapa para ajustar o local. Para os outros, o mapa mostra só uma região aproximada (~150 m).
        </Text>
      </View>
    </View>
  );
}

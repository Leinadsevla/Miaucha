import { useEffect, useRef } from "react";
import { Text, View } from "react-native";
import { MapPin } from "lucide-react-native";
import { colors, type LatLng } from "@miaucha/shared";
import { DraggablePoint, MapCanvas, type MapCanvasRef } from "./MapCanvas";
import { regionAround } from "./region";

/** Zoom de rua (~500 m de altura): dá para acertar o quarteirão. */
const PIN_DELTA = 0.005;
const MAP_HEIGHT = 192;

type Props = {
  /** null = ainda sem ponto: o mapa abre em `center` e espera o primeiro toque. */
  value: LatLng | null;
  onChange: (point: LatLng) => void;
  center?: LatLng;
  height?: number;
};

/**
 * Mapa pequeno para ajustar o ponto de uma ocorrência: arraste o marcador ou toque no mapa.
 * O ponto escolhido é o real (só a API o vê); no mapa público aparece o ponto deslocado (MP-07).
 */
export function PinPicker({ value, onChange, center, height = MAP_HEIGHT }: Props) {
  const mapRef = useRef<MapCanvasRef>(null);
  // O último ponto escolhido aqui: quando o valor volta igual, não recentraliza (o usuário já está vendo).
  const lastPicked = useRef<LatLng | null>(value);
  const start = value ?? center ?? { lat: 0, lng: 0 };

  useEffect(() => {
    if (!value) return;
    const picked = lastPicked.current;
    if (picked && picked.lat === value.lat && picked.lng === value.lng) return;
    lastPicked.current = value;
    mapRef.current?.animateToRegion(regionAround(value, PIN_DELTA), 300);
  }, [value]);

  function pick(point: LatLng) {
    lastPicked.current = point;
    onChange(point);
  }

  return (
    <View className="gap-2">
      <View className="overflow-hidden rounded-2xl border border-border" style={{ height }}>
        <MapCanvas ref={mapRef} testID="pin-picker-map" initialRegion={regionAround(start, PIN_DELTA)} onPress={pick}>
          {value ? (
            <DraggablePoint testID="pin-picker-marker" coordinate={value} onDragEnd={pick}>
              <View accessibilityLabel="Local marcado">
                <MapPin size={36} color={colors.white} fill={colors.primary} />
              </View>
            </DraggablePoint>
          ) : null}
        </MapCanvas>
      </View>
      <View className="flex-row items-start gap-2">
        <MapPin size={14} color={colors.accent} />
        <Text className="flex-1 font-sans text-xs text-muted-foreground">
          {value
            ? "Arraste o marcador ou toque no mapa para ajustar o local. Para os outros, o mapa mostra só uma região aproximada (~150 m)."
            : "Toque na rua onde o pet foi visto para marcar o local."}
        </Text>
      </View>
    </View>
  );
}

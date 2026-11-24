import { useImperativeHandle, useMemo, useRef, type ReactElement, type ReactNode, type Ref } from "react";
import type { NativeSyntheticEvent, StyleProp, ViewStyle } from "react-native";
import { Camera, Map, Marker, NativeUserLocation, ViewAnnotation, type CameraRef } from "@maplibre/maplibre-react-native";
import type { LatLng } from "@miaucha/shared";
import { boundsToRegion, regionToBounds, type LngLatBounds, type Region } from "./region";

/**
 * Estilo de mapa gratuito do OpenFreeMap (dados do OpenStreetMap): sem chave, sem cadastro e sem
 * limite de uso. A atribuição (botão "i" do mapa) é exigida pela licença e fica ligada.
 */
export const MAP_STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";

export type MapCanvasRef = { animateToRegion(region: Region, durationMs: number): void };

type Props = {
  ref?: Ref<MapCanvasRef>;
  testID?: string;
  style?: StyleProp<ViewStyle>;
  initialRegion: Region;
  showsUserLocation?: boolean;
  onRegionChangeComplete?: (region: Region) => void;
  onPress?: (point: LatLng) => void;
  children?: ReactNode;
};

type LngLatEvent = NativeSyntheticEvent<{ lngLat: [number, number] }>;

const toLatLng = (event: LngLatEvent): LatLng => {
  const [lng, lat] = event.nativeEvent.lngLat;
  return { lat, lng };
};

/**
 * Mapa do app (MapLibre + OpenStreetMap), com a mesma ideia de "região" (centro + deltas) usada
 * no resto do código. As telas não importam o MapLibre direto: só este arquivo conhece a API dele.
 */
export function MapCanvas({ ref, testID, style, initialRegion, showsUserLocation = false, onRegionChangeComplete, onPress, children }: Props) {
  const camera = useRef<CameraRef>(null);
  // A câmera só usa a região inicial na montagem; memoriza para não recriar o objeto a cada render.
  const initialViewState = useMemo(() => ({ bounds: regionToBounds(initialRegion) }), []); // eslint-disable-line react-hooks/exhaustive-deps

  useImperativeHandle(ref, () => ({
    animateToRegion: (region, durationMs) => camera.current?.fitBounds(regionToBounds(region), { duration: durationMs }),
  }));

  return (
    <Map
      testID={testID ?? "map-view"}
      style={style ?? { flex: 1 }}
      mapStyle={MAP_STYLE_URL}
      touchRotate={false}
      touchPitch={false}
      compass={false}
      logo={false}
      attribution
      onRegionDidChange={(event: NativeSyntheticEvent<{ bounds: LngLatBounds }>) =>
        onRegionChangeComplete?.(boundsToRegion(event.nativeEvent.bounds))
      }
      onPress={onPress ? (event: LngLatEvent) => onPress(toLatLng(event)) : undefined}
    >
      <Camera ref={camera} initialViewState={initialViewState} />
      {showsUserLocation ? <NativeUserLocation /> : null}
      {children}
    </Map>
  );
}

type PointProps = { testID?: string; coordinate: LatLng; children: ReactElement };

/** Ponto com view própria (pin, grupo). A view é desenhada pelo React Native, sem snapshot. */
export function MapPoint({
  testID,
  coordinate,
  anchor = "center",
  onPress,
  children,
}: PointProps & { anchor?: "center" | "bottom"; onPress?: () => void }) {
  return (
    <Marker
      testID={testID}
      lngLat={[coordinate.lng, coordinate.lat]}
      anchor={anchor}
      onPress={(event?: { stopPropagation?: () => void }) => {
        event?.stopPropagation?.();
        onPress?.();
      }}
    >
      {children}
    </Marker>
  );
}

/** Ponto que o usuário pode arrastar (PinPicker). */
export function DraggablePoint({ testID, coordinate, onDragEnd, children }: PointProps & { onDragEnd: (point: LatLng) => void }) {
  return (
    <ViewAnnotation
      // O tipo não declara `testID`, mas o componente repassa as props extras para a view nativa.
      {...({ testID } as object)}
      draggable
      anchor="bottom"
      lngLat={[coordinate.lng, coordinate.lat]}
      onDragEnd={(event: LngLatEvent) => onDragEnd(toLatLng(event))}
    >
      {children}
    </ViewAnnotation>
  );
}

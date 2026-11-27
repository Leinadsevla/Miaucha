// Versão web do MapCanvas (o Metro escolhe este arquivo no navegador). O MapLibre nativo não roda
// na web; aqui o mesmo mapa (estilo do OpenFreeMap) é desenhado pelo `maplibre-gl`, com a mesma
// API do arquivo nativo: `MapCanvas`, `MapPoint` e `DraggablePoint` falando em `Region` e `LatLng`.
import "maplibre-gl/dist/maplibre-gl.css";
import { createContext, useContext, useEffect, useImperativeHandle, useRef, useState, type ComponentRef, type ReactElement, type ReactNode, type Ref } from "react";
import { createPortal } from "react-dom";
import { View, type StyleProp, type ViewStyle } from "react-native";
import { Map as MapLibreMap, Marker } from "maplibre-gl";
import { colors, withAlpha, type LatLng } from "@miaucha/shared";
import { boundsToRegion, regionToBounds, type Region } from "./region";

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

const MapContext = createContext<MapLibreMap | null>(null);

function userDot(): HTMLElement {
  const dot = document.createElement("div");
  Object.assign(dot.style, {
    width: "16px",
    height: "16px",
    borderRadius: "8px",
    backgroundColor: colors.accent,
    border: `3px solid ${colors.white}`,
    boxShadow: "0 1px 4px rgba(0,0,0,0.35)",
  });
  dot.setAttribute("aria-label", "Sua localização");
  // Anel que pulsa em volta do ponto (desligado se o sistema pede menos movimento).
  if (!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
    dot.animate(
      [{ boxShadow: `0 0 0 0 ${withAlpha(colors.accent, 0.45)}` }, { boxShadow: `0 0 0 14px ${withAlpha(colors.accent, 0)}` }],
      { duration: 1600, iterations: Infinity },
    );
  }
  return dot;
}

export function MapCanvas({ ref, testID, style, initialRegion, showsUserLocation = false, onRegionChangeComplete, onPress, children }: Props) {
  const container = useRef<ComponentRef<typeof View>>(null);
  const [map, setMap] = useState<MapLibreMap | null>(null);
  // O mapa é criado uma vez; os callbacks mais novos ficam aqui para os eventos dele.
  const handlers = useRef({ onRegionChangeComplete, onPress });
  useEffect(() => {
    handlers.current = { onRegionChangeComplete, onPress };
  });

  useEffect(() => {
    const instance = new MapLibreMap({
      // No react-native-web a View é um elemento do DOM.
      container: container.current as unknown as HTMLElement,
      style: MAP_STYLE_URL,
      bounds: regionToBounds(initialRegion),
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
      // Exigida pela licença do OpenStreetMap (como o botão "i" no app).
      attributionControl: { compact: true },
    });
    instance.touchZoomRotate.disableRotation();
    instance.keyboard.disableRotation();

    const emitRegion = () => {
      const bounds = instance.getBounds();
      handlers.current.onRegionChangeComplete?.(boundsToRegion([bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()]));
    };
    instance.once("load", emitRegion);
    instance.on("moveend", emitRegion);
    instance.on("click", (event) => handlers.current.onPress?.({ lat: event.lngLat.lat, lng: event.lngLat.lng }));
    // O MapLibre só acompanha a janela; aqui o contêiner muda de tamanho sozinho (menu lateral, abas).
    const resizer = new ResizeObserver(() => instance.resize());
    resizer.observe(container.current as unknown as HTMLElement);
    setMap(instance);
    return () => {
      resizer.disconnect();
      setMap(null);
      instance.remove();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- a região inicial só vale na montagem

  useEffect(() => {
    if (!map || !showsUserLocation || !navigator.geolocation) return;
    let marker: Marker | null = null;
    const watch = navigator.geolocation.watchPosition(
      ({ coords }) => {
        marker ??= new Marker({ element: userDot() }).setLngLat([coords.longitude, coords.latitude]).addTo(map);
        marker.setLngLat([coords.longitude, coords.latitude]);
      },
      () => {},
      { enableHighAccuracy: false, maximumAge: 60_000 },
    );
    return () => {
      navigator.geolocation.clearWatch(watch);
      marker?.remove();
    };
  }, [map, showsUserLocation]);

  useImperativeHandle(ref, () => ({
    animateToRegion: (region, durationMs) => map?.fitBounds(regionToBounds(region), { duration: durationMs }),
  }));

  return (
    <View ref={container} testID={testID ?? "map-view"} style={style ?? { flex: 1 }}>
      <MapContext.Provider value={map}>{children}</MapContext.Provider>
    </View>
  );
}

type PointProps = { testID?: string; coordinate: LatLng; children: ReactElement };

type MarkerProps = PointProps & {
  anchor: "center" | "bottom";
  draggable?: boolean;
  onPress?: () => void;
  onDragEnd?: (point: LatLng) => void;
};

/** Marcador do maplibre-gl com o conteúdo desenhado pelo React (portal para o elemento do marcador). */
function PointMarker({ testID, coordinate, anchor, draggable = false, onPress, onDragEnd, children }: MarkerProps) {
  const map = useContext(MapContext);
  const [element] = useState(() => document.createElement("div"));
  const marker = useRef<Marker | null>(null);
  const handlers = useRef({ onPress, onDragEnd });
  useEffect(() => {
    handlers.current = { onPress, onDragEnd };
  });

  // A coordenada mais nova, para criar o marcador já no lugar certo.
  const position = useRef(coordinate);
  useEffect(() => {
    position.current = coordinate;
  });

  useEffect(() => {
    if (!map) return;
    const instance = new Marker({ element, anchor, draggable }).setLngLat([position.current.lng, position.current.lat]).addTo(map);
    instance.on("dragend", () => {
      const { lat, lng } = instance.getLngLat();
      handlers.current.onDragEnd?.({ lat, lng });
    });
    // O clique no ponto não pode chegar ao mapa (que fecharia o card ou mudaria o pino de lugar).
    const click = (event: MouseEvent) => {
      event.stopPropagation();
      handlers.current.onPress?.();
    };
    element.addEventListener("click", click);
    element.style.cursor = draggable ? "grab" : "pointer";
    marker.current = instance;
    return () => {
      element.removeEventListener("click", click);
      instance.remove();
      marker.current = null;
    };
  }, [map, element, anchor, draggable]);

  const { lat, lng } = coordinate;
  useEffect(() => {
    marker.current?.setLngLat([lng, lat]);
  }, [map, lat, lng]);

  useEffect(() => {
    if (testID) element.dataset.testid = testID;
  }, [element, testID]);

  return createPortal(children, element);
}

/** Ponto com view própria (pin, grupo). */
export function MapPoint({
  testID,
  coordinate,
  anchor = "center",
  onPress,
  children,
}: PointProps & { anchor?: "center" | "bottom"; onPress?: () => void }) {
  return (
    <PointMarker testID={testID} coordinate={coordinate} anchor={anchor} onPress={onPress}>
      {children}
    </PointMarker>
  );
}

/** Ponto que o usuário pode arrastar (PinPicker). */
export function DraggablePoint({ testID, coordinate, onDragEnd, children }: PointProps & { onDragEnd: (point: LatLng) => void }) {
  return (
    <PointMarker testID={testID} coordinate={coordinate} anchor="bottom" draggable onDragEnd={onDragEnd}>
      {children}
    </PointMarker>
  );
}

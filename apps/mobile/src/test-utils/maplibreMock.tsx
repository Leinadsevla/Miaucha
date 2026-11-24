// Mock do @maplibre/maplibre-react-native para o Jest (ligado em jest.setup.ts). O mapa nativo não
// roda no Jest; aqui Map, Marker e ViewAnnotation viram Views que repassam as props, para os testes
// dispararem `regionDidChange`, `press` e `dragEnd` com o fireEvent (helpers em `mapEvents`).
import { useImperativeHandle, type ReactNode, type Ref } from "react";
import { View, type ViewProps } from "react-native";

/** Comandos imperativos da Camera, para conferir nos testes. */
export const cameraCommands = {
  fitBounds: jest.fn(),
  easeTo: jest.fn(),
  flyTo: jest.fn(),
  jumpTo: jest.fn(),
  zoomTo: jest.fn(),
  setStop: jest.fn(async () => {}),
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- o mock aceita qualquer prop do mapa
type AnyProps = ViewProps & { children?: ReactNode; ref?: Ref<unknown> } & Record<string, any>;

export function Map({ children, testID = "map-view", ref: _ref, ...props }: AnyProps) {
  return (
    <View testID={testID} {...props}>
      {children}
    </View>
  );
}

export function Camera({ ref, ...props }: AnyProps) {
  useImperativeHandle(ref, () => cameraCommands);
  return <View testID="map-camera" {...props} />;
}

export function Marker({ children, testID, ref: _ref, ...props }: AnyProps) {
  return (
    <View testID={testID ?? "map-marker"} {...props}>
      {children}
    </View>
  );
}

export function ViewAnnotation({ children, testID, ref: _ref, ...props }: AnyProps) {
  return (
    <View testID={testID ?? "map-view-annotation"} {...props}>
      {children}
    </View>
  );
}

export function NativeUserLocation({ ref: _ref, ...props }: AnyProps) {
  return <View testID="map-user-location" {...props} />;
}

export const UserLocation = NativeUserLocation;

type Region = { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number };

/** Eventos no formato do MapLibre, para `fireEvent(map, "regionDidChange", mapEvents.region(r))`. */
export const mapEvents = {
  region: ({ latitude, longitude, latitudeDelta, longitudeDelta }: Region) => ({
    nativeEvent: {
      center: [longitude, latitude],
      zoom: 14,
      bearing: 0,
      pitch: 0,
      bounds: [longitude - longitudeDelta / 2, latitude - latitudeDelta / 2, longitude + longitudeDelta / 2, latitude + latitudeDelta / 2],
      animated: false,
      userInteraction: true,
    },
  }),
  /** Toque no mapa ou fim do arraste de um ponto, em lat/lng. */
  at: (lat: number, lng: number) => ({ nativeEvent: { lngLat: [lng, lat], point: [0, 0], id: "x" } }),
};

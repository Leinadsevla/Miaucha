// Mock do react-native-maps para o Jest (ligado em jest.setup.ts). O mapa nativo não roda no Jest;
// aqui MapView e Marker viram Views que repassam as props, para os testes dispararem
// `regionChangeComplete`, `press` e `dragEnd` com o fireEvent.
import { forwardRef, useImperativeHandle, type ReactNode } from "react";
import { View, type ViewProps } from "react-native";

/** Comandos imperativos do MapView, para conferir nos testes. */
export const mapCommands = { animateToRegion: jest.fn() };

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- o mock aceita qualquer prop do mapa
type AnyProps = ViewProps & { children?: ReactNode } & Record<string, any>;

const MapView = forwardRef<unknown, AnyProps>(function MapView({ children, testID = "map-view", ...props }, ref) {
  useImperativeHandle(ref, () => ({ animateToRegion: mapCommands.animateToRegion }));
  return (
    <View testID={testID} {...props}>
      {children}
    </View>
  );
});

export function Marker({ children, testID, ...props }: AnyProps) {
  return (
    <View testID={testID ?? "map-marker"} {...props}>
      {children}
    </View>
  );
}

export const PROVIDER_GOOGLE = "google";
export const PROVIDER_DEFAULT = undefined;
export default MapView;

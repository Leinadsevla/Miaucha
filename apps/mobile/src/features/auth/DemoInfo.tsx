import { createContext, useContext } from "react";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, elevation } from "@miaucha/shared";

export type DemoInfo = {
  /** O app está com dados de exemplo (nada vai para a API). */
  demo: boolean;
  /** O botão do Google entra na demonstração, porque o login real com Google não está configurado. */
  googleIsDemo: boolean;
};

const DemoInfoContext = createContext<DemoInfo>({ demo: false, googleIsDemo: false });

export const DemoInfoProvider = DemoInfoContext.Provider;

export function useDemoInfo(): DemoInfo {
  return useContext(DemoInfoContext);
}

/** Selo fixo no topo enquanto o app mostra dados de exemplo, para ninguém confundir com a conta real. */
export function DemoBadge() {
  const insets = useSafeAreaInsets();
  const { demo } = useDemoInfo();
  if (!demo) return null;
  return (
    <View pointerEvents="none" style={{ position: "absolute", top: insets.top + 6, left: 0, right: 0, alignItems: "center", zIndex: 50 }}>
      <View accessibilityRole="text" className="rounded-full px-3 py-1" style={[{ backgroundColor: colors.foreground }, elevation.raised]}>
        <Text className="font-nunito-bold text-xs text-white">Modo demonstração · dados de exemplo</Text>
      </View>
    </View>
  );
}

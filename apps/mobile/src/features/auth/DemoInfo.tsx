import { createContext, useContext } from "react";
import { Text, View } from "react-native";
import { colors } from "@miaucha/shared";

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

/** Faixa no topo enquanto o app mostra dados de exemplo, para ninguém confundir com a conta real. */
export function DemoBadge() {
  const { demo } = useDemoInfo();
  if (!demo) return null;
  return (
    <View testID="demo-bar" accessibilityRole="text" className="items-center px-3 py-1.5" style={{ backgroundColor: colors.foreground }}>
      <Text className="font-ui-semibold text-xs text-white">Modo demonstração · dados de exemplo</Text>
    </View>
  );
}

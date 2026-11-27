import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { centered, READING_MAX_WIDTH } from "@/lib/layout";

type Props = {
  title: string;
  /** Linha pequena acima do título (ex.: "Olá, Ana"). */
  eyebrow?: string;
  subtitle?: string;
  /** Botões à direita do título. */
  right?: ReactNode;
  /** Conteúdo abaixo do título (busca, filtros). */
  children?: ReactNode;
  /** Largura máxima do conteúdo (o fundo branco ocupa a tela toda). */
  maxWidth?: number;
};

/** Cabeçalho branco das abas: título grande em grafite, sem faixa de cor. */
export function TabHeader({ title, eyebrow, subtitle, right, children, maxWidth = READING_MAX_WIDTH - 40 }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View className="border-b border-border bg-white px-5 pb-4" style={{ paddingTop: insets.top + 16 }}>
      <View style={centered(maxWidth)}>
        <View className="flex-row items-center justify-between gap-3">
          <View className="flex-1">
            {eyebrow ? <Text className="mb-0.5 font-ui-medium text-sm text-muted-foreground">{eyebrow}</Text> : null}
            <Text accessibilityRole="header" className="font-ui-extrabold text-2xl tracking-tight text-foreground">
              {title}
            </Text>
            {subtitle ? <Text className="mt-0.5 font-sans text-sm text-muted-foreground">{subtitle}</Text> : null}
          </View>
          {right}
        </View>
        {children ? <View className="mt-4">{children}</View> : null}
      </View>
    </View>
  );
}

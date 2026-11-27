import type { ReactNode } from "react";
import { Text, useWindowDimensions, View } from "react-native";
import { Bell, Map as MapIcon, ShieldCheck, type LucideIcon } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, elevation } from "@miaucha/shared";
import { AppLogo, KeyboardScreen } from "@/components";
import { centered, useLayout } from "@/lib/layout";
import { AuthPreview } from "./AuthPreview";

/** Largura do formulário. */
const FORM_WIDTH = 420;
/** Abaixo desta altura de janela, o painel da marca fica sem a prévia (não caberia). */
const PREVIEW_MIN_HEIGHT = 780;

/** Os três motivos mostrados no painel da marca (tela larga). */
const REASONS: { Icon: LucideIcon; text: string }[] = [
  { Icon: MapIcon, text: "Mapa com os casos perto de você" },
  { Icon: Bell, text: "Alertas quando um pet some na sua região" },
  { Icon: ShieldCheck, text: "Conversa segura, só pelo seu nome público" },
];

type Props = {
  title: string;
  subtitle: string;
  children: ReactNode;
  /** Força o layout (testes). Sem ele, vem da largura da tela. */
  wide?: boolean;
};

/**
 * Telas de entrada. No celular (visual original): cabeçalho laranja com a logo e o formulário embaixo.
 * Em tela larga: painel creme com a prévia do app à esquerda e o formulário à direita.
 */
export function AuthScreenLayout({ title, subtitle, children, wide: forceWide }: Props) {
  const insets = useSafeAreaInsets();
  const layout = useLayout();
  const { height } = useWindowDimensions();
  const wide = forceWide ?? layout.wide;

  if (wide) {
    return (
      <View className="flex-1 flex-row bg-white">
        <View testID="auth-brand-panel" style={{ flex: 1, padding: 48, justifyContent: "space-between", gap: 28, backgroundColor: colors.cream }}>
          <View className="flex-row items-center gap-2.5">
            <AppLogo size={40} />
            <Text className="font-ui-extrabold text-2xl tracking-tight text-foreground">Miaucha</Text>
          </View>

          <View style={{ maxWidth: 520, gap: 28 }}>
            <View>
              <Text className="font-ui-extrabold text-[40px] leading-[46px] tracking-tight text-foreground">
                Juntos encontramos quem <Text className="text-brand-deep">se perdeu</Text>
              </Text>
              <Text className="mt-3 font-sans text-lg leading-7 text-muted-foreground">
                A vizinhança avisa, o mapa mostra e o tutor reencontra o seu pet.
              </Text>
            </View>
            {height >= PREVIEW_MIN_HEIGHT ? <AuthPreview /> : null}
            <View className="gap-2.5">
              {REASONS.map(({ Icon, text }) => (
                <View key={text} className="flex-row items-center gap-3">
                  <View className="h-9 w-9 items-center justify-center rounded-xl bg-white">
                    <Icon size={18} color={colors.brand} />
                  </View>
                  <Text className="flex-1 font-ui-medium text-base text-foreground">{text}</Text>
                </View>
              ))}
            </View>
          </View>

          <Text className="font-sans text-sm text-muted-foreground">Miaucha · TCC 2026</Text>
        </View>

        <View className="flex-1">
          <KeyboardScreen className="flex-1 bg-white" contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 40 }}>
            <View style={centered(FORM_WIDTH)}>
              <Text accessibilityRole="header" className="font-ui-extrabold text-[32px] leading-10 tracking-tight text-foreground">
                {title}
              </Text>
              <Text className="mb-8 mt-1.5 font-sans text-base text-muted-foreground">{subtitle}</Text>
              {children}
            </View>
          </KeyboardScreen>
        </View>
      </View>
    );
  }

  return (
    <KeyboardScreen className="flex-1 bg-white" contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + 24 }}>
      <View testID="auth-header" className="items-center gap-4 px-6 pb-8" style={{ paddingTop: insets.top + 24, backgroundColor: colors.brand }}>
        <View className="h-20 w-20 items-center justify-center rounded-3xl bg-white" style={elevation.raised}>
          <AppLogo size={56} />
        </View>
        <View className="items-center" style={centered(FORM_WIDTH)}>
          <Text accessibilityRole="header" className="text-center font-ui-extrabold text-2xl" style={{ color: colors.white }}>
            {title}
          </Text>
          <Text className="mt-1 text-center font-sans text-sm text-white/80">{subtitle}</Text>
        </View>
      </View>
      <View className="px-6 pt-6" style={centered(FORM_WIDTH)}>
        {children}
      </View>
    </KeyboardScreen>
  );
}

import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Bell, Map as MapIcon, ShieldCheck, type LucideIcon } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, elevation } from "@miaucha/shared";
import { AppLogo, KeyboardScreen } from "@/components";
import { centered, useLayout } from "@/lib/layout";

/** Largura do formulário em telas largas. */
const FORM_WIDTH = 440;

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
 * Telas de entrada. No celular: cabeçalho laranja com a logo e o formulário num cartão sobreposto.
 * Em tela larga: painel da marca à esquerda e o formulário à direita.
 */
export function AuthScreenLayout({ title, subtitle, children, wide: forceWide }: Props) {
  const insets = useSafeAreaInsets();
  const layout = useLayout();
  const wide = forceWide ?? layout.wide;

  if (wide) {
    return (
      <View className="flex-1 flex-row bg-white">
        <LinearGradient
          testID="auth-brand-panel"
          colors={[colors.primary, colors.primaryDeep]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ flex: 1, padding: 56, justifyContent: "space-between" }}
        >
          <View className="flex-row items-center gap-3">
            <View className="h-14 w-14 items-center justify-center rounded-2xl bg-white" style={elevation.raised}>
              <AppLogo size={40} />
            </View>
            <Text className="font-nunito-black text-3xl text-white">Miaucha</Text>
          </View>

          <View style={{ maxWidth: 520 }}>
            <Text className="font-nunito-black text-[44px] leading-[52px] text-white">Juntos encontramos quem se perdeu</Text>
            <Text className="mt-4 font-nunito-semibold text-lg leading-7 text-white">
              A vizinhança avisa, o mapa mostra e o tutor reencontra o seu pet.
            </Text>
            <View className="mt-10 gap-4">
              {REASONS.map(({ Icon, text }) => (
                <View key={text} className="flex-row items-center gap-4">
                  <View className="h-12 w-12 items-center justify-center rounded-2xl bg-white" style={elevation.card}>
                    <Icon size={22} color={colors.primaryDeep} />
                  </View>
                  <Text className="flex-1 font-nunito-bold text-lg text-white">{text}</Text>
                </View>
              ))}
            </View>
          </View>

          <Text className="font-sans text-sm text-white">Miaucha · TCC 2026</Text>
        </LinearGradient>

        <View className="flex-1">
          <KeyboardScreen className="flex-1 bg-white" contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 40 }}>
            <View style={centered(FORM_WIDTH)}>
              <Text accessibilityRole="header" className="font-nunito-black text-4xl text-foreground">
                {title}
              </Text>
              <Text className="mb-8 mt-2 font-sans text-base text-muted-foreground">{subtitle}</Text>
              {children}
            </View>
          </KeyboardScreen>
        </View>
      </View>
    );
  }

  return (
    <KeyboardScreen contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
      <LinearGradient
        colors={[colors.primary, colors.primaryDeep]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ alignItems: "center", gap: 16, paddingHorizontal: 24, paddingTop: insets.top + 28, paddingBottom: 56 }}
      >
        <View className="h-20 w-20 items-center justify-center rounded-3xl bg-white" style={elevation.floating}>
          <AppLogo size={56} />
        </View>
        <View className="items-center">
          <Text accessibilityRole="header" className="text-center font-nunito-black text-[28px] leading-9 text-white">
            {title}
          </Text>
          <Text className="mt-1 text-center font-nunito-semibold text-base text-white">{subtitle}</Text>
        </View>
      </LinearGradient>
      <View className="-mt-8 px-4">
        <View className="rounded-3xl border border-border bg-card p-5" style={[centered(FORM_WIDTH + 40), elevation.raised]}>
          {children}
        </View>
      </View>
    </KeyboardScreen>
  );
}

import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Bell, MessageCircle, Plus } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@miaucha/shared";
import { AppLogo, PrimaryButton } from "@/components";
import { centered } from "@/lib/layout";

export const ONBOARDING_SLIDES = [
  {
    title: "Bem-vindo ao Miaucha",
    body: "Aqui a vizinhança se ajuda a reencontrar pets perdidos. Cada aviso conta.",
    Icon: null,
  },
  {
    title: "Registre uma ocorrência",
    body: "Perdeu, viu ou encontrou um pet? Toque em Registrar ocorrência, adicione fotos e marque o local no mapa.",
    Icon: Plus,
  },
  {
    title: "Veja no mapa e receba alertas",
    body: "O mapa mostra os casos perto de você, e o app avisa quando surge um alerta de pet perdido na sua região.",
    Icon: Bell,
  },
  {
    title: "Converse com segurança",
    body: "No chat você aparece só pelo seu nome público. Seu e-mail, telefone e endereço exato nunca são mostrados.",
    Icon: MessageCircle,
  },
] as const;

/** Tutorial de boas-vindas: aparece uma vez, depois do primeiro acesso, e pode ser revisto na Ajuda. */
export function OnboardingScreen({ onDone }: { onDone: () => void }) {
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);
  const slide = ONBOARDING_SLIDES[index];
  const last = index === ONBOARDING_SLIDES.length - 1;

  return (
    <View className="flex-1 bg-white" style={{ paddingHorizontal: 24, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }}>
      <View style={[centered(520), { flex: 1 }]}>
      <View className="flex-row justify-end">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Pular"
          onPress={onDone}
          style={({ pressed }) => ({ minHeight: 44, minWidth: 64, alignItems: "center", justifyContent: "center", borderRadius: 22, opacity: pressed ? 0.6 : 1 })}
        >
          <Text className="font-ui-semibold text-base text-muted-foreground">Pular</Text>
        </Pressable>
      </View>

      <View className="flex-1 items-center justify-center gap-6">
        <View className="h-32 w-32 items-center justify-center rounded-[40px] bg-brand-soft">
          {slide.Icon ? <slide.Icon size={56} color={colors.brand} /> : <AppLogo size={88} />}
        </View>
        <Text accessibilityRole="header" className="text-center font-ui-extrabold text-[28px] leading-9 tracking-tight text-foreground">
          {slide.title}
        </Text>
        <Text className="text-center font-sans text-base leading-6 text-muted-foreground">{slide.body}</Text>
      </View>

      <View className="gap-4">
        <View className="flex-row justify-center gap-2" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {ONBOARDING_SLIDES.map((s, i) => (
            <View key={s.title} className="h-2 rounded-full" style={{ width: i === index ? 24 : 8, backgroundColor: i === index ? colors.brand : colors.border }} />
          ))}
        </View>
        <Text className="text-center font-sans text-xs text-muted-foreground">
          Passo {index + 1} de {ONBOARDING_SLIDES.length}
        </Text>
        {last ? (
          <PrimaryButton title="Começar" onPress={onDone} />
        ) : (
          <PrimaryButton title="Próximo" arrow onPress={() => setIndex(index + 1)} />
        )}
        {index > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Voltar"
            onPress={() => setIndex(index - 1)}
            style={({ pressed }) => ({ minHeight: 44, alignSelf: "center", paddingHorizontal: 16, justifyContent: "center", opacity: pressed ? 0.6 : 1 })}
          >
            <Text className="font-ui-semibold text-sm text-muted-foreground">Voltar</Text>
          </Pressable>
        ) : null}
      </View>
      </View>
    </View>
  );
}

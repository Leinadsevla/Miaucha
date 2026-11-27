import { ScrollView, Text } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Card, ScreenHeader } from "@/components";
import { centered, READING_MAX_WIDTH } from "@/lib/layout";

// Rascunho para a S1. O texto final da política entra no checklist LGPD (NF-01).
const SECTIONS = [
  ["O que coletamos", "Nome, e-mail, fotos dos pets e das ocorrências e sua localização aproximada (cerca de 1 km)."],
  ["O que não coletamos", "Não guardamos seu trajeto nem sua localização exata. O ponto exibido no mapa é deslocado cerca de 150 m."],
  ["Com quem compartilhamos", "Outros usuários veem só seu pseudônimo. Seu contato só aparece se vocês dois aceitarem no chat."],
  ["Seus direitos", "Você pode revogar o consentimento e excluir a conta a qualquer momento; seus dados e fotos são apagados."],
] as const;

export default function Privacy() {
  const insets = useSafeAreaInsets();
  return (
    <>
      <ScreenHeader title="Política de privacidade" subtitle="Como cuidamos dos seus dados" onBack={() => router.back()} />
      <ScrollView className="flex-1 bg-background" contentContainerStyle={{ ...centered(READING_MAX_WIDTH), padding: 20, paddingBottom: insets.bottom + 24, gap: 12 }}>
        {SECTIONS.map(([title, body]) => (
          <Card key={title}>
            <Text accessibilityRole="header" className="mb-1 font-ui-extrabold text-base text-foreground">
              {title}
            </Text>
            <Text className="font-sans text-sm leading-5 text-muted-foreground">{body}</Text>
          </Card>
        ))}
      </ScrollView>
    </>
  );
}

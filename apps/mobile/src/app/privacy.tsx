import { ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PrimaryButton } from "@/components";

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
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ padding: 20, paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20, gap: 16 }}
    >
      <Text className="font-nunito-black text-2xl text-foreground">Política de privacidade</Text>
      {SECTIONS.map(([title, body]) => (
        <View key={title} className="rounded-3xl border border-border bg-card p-4">
          <Text className="mb-1 font-nunito-bold text-sm text-foreground">{title}</Text>
          <Text className="font-sans text-sm leading-5 text-muted-foreground">{body}</Text>
        </View>
      ))}
      <PrimaryButton title="Voltar" variant="primary" onPress={() => router.back()} />
    </ScrollView>
  );
}

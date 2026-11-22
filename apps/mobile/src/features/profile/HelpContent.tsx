import { Text, View } from "react-native";

export const HELP_TOPICS = [
  ["Perdi meu pet. O que faço?", "Toque em \"Registrar pet perdido\" na aba Início, ou abra o pet em Meus Pets e use \"Registrar como perdido\". Quem estiver por perto recebe um alerta."],
  ["Como funcionam os alertas?", "Quando alguém registra um pet perdido, avistado ou encontrado dentro do raio que você escolheu (1, 3 ou 5 km), ele aparece na aba Alertas e, se as notificações estiverem ligadas, você recebe um aviso. Ajuste o raio e o horário de silêncio em Perfil → Notificações."],
  ["Minha localização fica visível?", "Não. Para os alertas guardamos só a sua região aproximada (cerca de 1 km), nunca o ponto exato nem o seu trajeto. O ponto de uma ocorrência no mapa é deslocado cerca de 150 m."],
  ["Quem vê meu nome?", "Os outros usuários veem só o seu nome público (pseudônimo), mostrado no topo do Perfil. E-mail e telefone nunca aparecem."],
  ["Não recebo notificações", "Confira se as notificações do Miaucha estão liberadas nas configurações do celular. No Expo Go para Android as notificações push não funcionam; os alertas continuam aparecendo na aba Alertas."],
  ["Encontrei o pet. E agora?", "Abra a ocorrência em Perfil → Minhas ocorrências e marque como resolvida. Ela sai das buscas e dos alertas."],
] as const;

/** Texto simples da tela de ajuda. */
export function HelpContent() {
  return (
    <View className="gap-3">
      {HELP_TOPICS.map(([title, body]) => (
        <View key={title} className="rounded-3xl border border-border bg-card p-4">
          <Text className="mb-1 font-nunito-bold text-sm text-foreground">{title}</Text>
          <Text className="font-sans text-sm leading-5 text-muted-foreground">{body}</Text>
        </View>
      ))}
    </View>
  );
}

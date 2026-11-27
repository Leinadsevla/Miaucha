import { Pressable, Text, View } from "react-native";
import { Bell, Home, Map, MessageCircle, User, type LucideIcon } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@miaucha/shared";

export type TabName = "index" | "map" | "alerts" | "chat" | "profile";

/** As abas do app, na ordem (compartilhadas pela barra de baixo e pelo menu lateral). */
export const TAB_ITEMS: { name: TabName; label: string; Icon: LucideIcon }[] = [
  { name: "index", label: "Início", Icon: Home },
  { name: "map", label: "Mapa", Icon: Map },
  { name: "alerts", label: "Alertas", Icon: Bell },
  { name: "chat", label: "Chat", Icon: MessageCircle },
  { name: "profile", label: "Perfil", Icon: User },
];

export function BottomNav({ active, onNavigate }: { active: TabName; onNavigate: (tab: TabName) => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View
      testID="bottom-nav"
      accessibilityRole="tablist"
      className="flex-row border-t border-border bg-white px-1 pt-2"
      // Largura total explícita: com `tabBarPosition`, o contêiner da barra pode não esticar o filho.
      style={{ paddingBottom: Math.max(insets.bottom, 10), width: "100%", alignSelf: "stretch" }}
    >
      {TAB_ITEMS.map(({ name, label, Icon }) => {
        const selected = active === name;
        const tint = selected ? colors.brand : colors.mutedForeground;
        return (
          <Pressable
            key={name}
            accessibilityRole="tab"
            accessibilityLabel={label}
            accessibilityState={{ selected }}
            onPress={() => onNavigate(name)}
            // `flex-1` por classe e estilo fixo: o estilo em função descartava o `flex` no aparelho
            // (as abas ficavam espremidas à esquerda).
            className="flex-1 items-center justify-center gap-0.5 rounded-xl active:opacity-70"
            style={{ flex: 1, minHeight: 52 }}
          >
            <View style={{ transform: [{ scale: selected ? 1.1 : 1 }] }}>
              <Icon size={22} color={tint} strokeWidth={selected ? 2.4 : 2} />
            </View>
            <Text className={selected ? "font-ui-bold" : "font-ui-semibold"} style={{ color: tint, fontSize: 12 }}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

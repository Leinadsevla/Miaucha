import { Pressable, Text, View } from "react-native";
import { Bell, Home, Map, MessageCircle, User, type LucideIcon } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@miaucha/shared";

export type TabName = "index" | "map" | "alerts" | "chat" | "profile";

const ITEMS: { name: TabName; label: string; Icon: LucideIcon }[] = [
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
      accessibilityRole="tablist"
      className="flex-row border-t border-border bg-white px-1 pt-2"
      style={{ paddingBottom: Math.max(insets.bottom, 8) }}
    >
      {ITEMS.map(({ name, label, Icon }) => {
        const selected = active === name;
        const tint = selected ? colors.primary : colors.mutedForeground;
        return (
          <Pressable
            key={name}
            accessibilityRole="tab"
            accessibilityLabel={label}
            accessibilityState={{ selected }}
            onPress={() => onNavigate(name)}
            className="flex-1 items-center gap-0.5 rounded-xl py-1"
          >
            <View style={{ transform: [{ scale: selected ? 1.1 : 1 }] }}>
              <Icon size={20} color={tint} />
            </View>
            <Text className="font-nunito-semibold text-[10px]" style={{ color: tint }}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

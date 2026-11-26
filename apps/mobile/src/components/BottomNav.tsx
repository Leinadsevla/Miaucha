import { Pressable, Text, View } from "react-native";
import { Bell, Home, Map, MessageCircle, User, type LucideIcon } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, elevation } from "@miaucha/shared";

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
      className="flex-row border-t border-border bg-white px-2 pt-2"
      style={[{ paddingBottom: Math.max(insets.bottom, 10) }, elevation.raised]}
    >
      {ITEMS.map(({ name, label, Icon }) => {
        const selected = active === name;
        const tint = selected ? colors.primaryDeep : colors.mutedForeground;
        return (
          <Pressable
            key={name}
            accessibilityRole="tab"
            accessibilityLabel={label}
            accessibilityState={{ selected }}
            onPress={() => onNavigate(name)}
            style={({ pressed }) => ({ flex: 1, minHeight: 52, alignItems: "center", justifyContent: "center", gap: 2, opacity: pressed ? 0.7 : 1 })}
          >
            <View className="h-8 w-14 items-center justify-center rounded-full">
              {selected ? <View testID={`tab-indicator-${name}`} className="absolute inset-0 rounded-full bg-primary-soft" /> : null}
              <Icon size={22} color={tint} strokeWidth={selected ? 2.4 : 2} />
            </View>
            <Text className={selected ? "font-nunito-bold" : "font-nunito-semibold"} style={{ color: tint, fontSize: 12 }}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

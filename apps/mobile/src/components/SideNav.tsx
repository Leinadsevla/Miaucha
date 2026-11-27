import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@miaucha/shared";
import { SIDE_NAV_WIDTH } from "@/lib/layout";
import { AppLogo } from "./AppLogo";
import { TAB_ITEMS, type TabName } from "./BottomNav";

/** Menu lateral das telas largas (computador, tablet deitado): as mesmas abas da barra de baixo. */
export function SideNav({ active, onNavigate }: { active: TabName; onNavigate: (tab: TabName) => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View
      accessibilityRole="tablist"
      className="border-r border-border bg-white px-4"
      style={{ width: SIDE_NAV_WIDTH, paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }}
    >
      <View className="mb-8 flex-row items-center gap-3 px-2">
        <AppLogo size={40} />
        <Text className="font-ui-extrabold text-2xl text-foreground">Miaucha</Text>
      </View>
      <View className="gap-1">
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
              style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => ({
                minHeight: 48,
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                paddingHorizontal: 14,
                borderRadius: 14,
                backgroundColor: selected ? colors.brandSoft : pressed || hovered ? colors.muted : "transparent",
              })}
            >
              <Icon size={22} color={tint} strokeWidth={selected ? 2.4 : 2} />
              <Text className={selected ? "font-ui-extrabold text-base text-foreground" : "font-ui-bold text-base text-muted-foreground"}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { centered, READING_MAX_WIDTH } from "@/lib/layout";

/** Cabeçalho branco das abas sem cor de marca (Alertas, Chat): título grande, subtítulo e ação à direita. */
export function TabHeader({ title, subtitle, right, children }: { title: string; subtitle?: string; right?: ReactNode; children?: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View className="border-b border-border bg-white px-5 pb-4" style={{ paddingTop: insets.top + 16 }}>
      <View style={centered(READING_MAX_WIDTH - 40)}>
      <View className="flex-row items-center justify-between gap-3">
        <View className="flex-1">
          <Text accessibilityRole="header" className="font-nunito-black text-2xl text-foreground">
            {title}
          </Text>
          {subtitle ? <Text className="font-sans text-sm text-muted-foreground">{subtitle}</Text> : null}
        </View>
        {right}
      </View>
      {children ? <View className="mt-4">{children}</View> : null}
      </View>
    </View>
  );
}

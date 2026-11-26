import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { ChevronLeft } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@miaucha/shared";
import { IconButton } from "./IconButton";
import { centered, READING_MAX_WIDTH } from "@/lib/layout";

/** Cabeçalho branco com "Voltar" das telas empilhadas. `right`: botões à direita (ex.: Editar). */
export function ScreenHeader({ title, subtitle, onBack, right }: { title: string; subtitle?: string; onBack: () => void; right?: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View className="border-b border-border bg-white px-4 pb-3" style={{ paddingTop: insets.top + 12 }}>
      <View className="flex-row items-center gap-3" style={centered(READING_MAX_WIDTH)}>
      <IconButton label="Voltar" icon={<ChevronLeft size={22} color={colors.foreground} />} onPress={onBack} />
      <View className="flex-1">
        <Text accessibilityRole="header" numberOfLines={1} className="font-nunito-black text-lg text-foreground">
          {title}
        </Text>
        {subtitle ? (
          <Text numberOfLines={1} className="font-sans text-xs text-muted-foreground">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
      </View>
    </View>
  );
}

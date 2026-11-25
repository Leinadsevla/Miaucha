import { Pressable, Text, View } from "react-native";
import { ChevronLeft } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@miaucha/shared";

/** Cabeçalho branco com "Voltar" das telas empilhadas (mesmo visual do cadastro de pet). */
export function ScreenHeader({ title, subtitle, onBack }: { title: string; subtitle?: string; onBack: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View className="flex-row items-center gap-3 border-b border-border bg-white px-5 pb-4" style={{ paddingTop: insets.top + 16 }}>
      <Pressable accessibilityRole="button" accessibilityLabel="Voltar" onPress={onBack} className="h-9 w-9 items-center justify-center rounded-xl bg-muted">
        <ChevronLeft size={20} color={colors.foreground} />
      </Pressable>
      <View className="flex-1">
        <Text accessibilityRole="header" className="font-nunito-black text-base text-foreground">
          {title}
        </Text>
        {subtitle ? <Text className="font-sans text-xs text-muted-foreground">{subtitle}</Text> : null}
      </View>
    </View>
  );
}

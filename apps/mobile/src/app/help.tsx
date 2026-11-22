import { ScrollView, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScreenHeader } from "@/components";
import { HelpContent } from "@/features/profile";

export default function Help() {
  const insets = useSafeAreaInsets();
  return (
    <View className="flex-1 bg-background">
      <ScreenHeader title="Ajuda" subtitle="Perguntas frequentes" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 24 }}>
        <HelpContent />
      </ScrollView>
    </View>
  );
}

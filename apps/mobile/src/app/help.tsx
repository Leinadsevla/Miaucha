import { ScrollView, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PrimaryButton, ScreenHeader } from "@/components";
import { HelpContent } from "@/features/profile";
import { centered, READING_MAX_WIDTH } from "@/lib/layout";

export default function Help() {
  const insets = useSafeAreaInsets();
  return (
    <View className="flex-1 bg-background">
      <ScreenHeader title="Ajuda" subtitle="Perguntas frequentes" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ ...centered(READING_MAX_WIDTH), padding: 20, paddingBottom: insets.bottom + 24 }}>
        <HelpContent />
        <View className="mt-4">
          <PrimaryButton title="Ver o tutorial de novo" variant="outline" onPress={() => router.push("/welcome")} />
        </View>
      </ScrollView>
    </View>
  );
}

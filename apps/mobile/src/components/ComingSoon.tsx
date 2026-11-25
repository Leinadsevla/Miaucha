import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppLogo } from "./AppLogo";

/** Placeholder das abas que serão construídas nas próximas sprints. */
export function ComingSoon({ title, sprint, description }: { title: string; sprint: string; description: string }) {
  const insets = useSafeAreaInsets();
  return (
    <View className="flex-1 bg-background">
      <View className="bg-primary px-5 pb-5" style={{ paddingTop: insets.top + 16 }}>
        <Text className="font-nunito-black text-lg text-white">{title}</Text>
      </View>
      <View className="flex-1 items-center justify-center gap-2 px-8">
        <AppLogo size={56} />
        <Text className="font-nunito-bold text-base text-foreground">Chega na {sprint}</Text>
        <Text className="text-center font-sans text-sm text-muted-foreground">{description}</Text>
      </View>
    </View>
  );
}

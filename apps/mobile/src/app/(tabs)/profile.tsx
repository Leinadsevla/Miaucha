import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PrimaryButton } from "@/components";
import { useAuth } from "@/features/auth";

export default function ProfileTab() {
  const { state, logout } = useAuth();
  const insets = useSafeAreaInsets();
  const name = state.status === "signedIn" ? state.user.name : "";

  return (
    <View className="flex-1 bg-background">
      <View className="items-center gap-3 bg-primary px-5 pb-8" style={{ paddingTop: insets.top + 24 }}>
        <View className="h-20 w-20 items-center justify-center rounded-3xl bg-white/20">
          <Text className="font-nunito-black text-3xl text-white">{name.charAt(0).toUpperCase()}</Text>
        </View>
        <Text className="font-nunito-black text-lg text-white">{name}</Text>
      </View>
      <View className="gap-3 p-5">
        <Text className="text-center font-sans text-sm text-muted-foreground">
          Meus pets, histórico e configurações chegam nas próximas sprints.
        </Text>
        <PrimaryButton title="Sair da conta" variant="outline" onPress={logout} />
      </View>
    </View>
  );
}

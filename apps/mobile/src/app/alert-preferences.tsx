import { View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardScreen, ScreenHeader } from "@/components";
import { AlertPreferencesForm, useAlerts } from "@/features/alerts";
import { showAlert } from "@/lib/dialog";

export default function AlertPreferencesScreen() {
  const insets = useSafeAreaInsets();
  const { client, pushStatus, geofencing, enableGeofencing } = useAlerts();

  async function enable() {
    const ok = await enableGeofencing();
    showAlert(
      ok ? "Alertas com o app fechado ativados" : "Não foi possível ativar",
      ok ? "Você será avisado ao passar perto de um pet perdido." : "Libere a localização \"sempre\" para o Miaucha nas configurações do aparelho.",
    );
  }

  return (
    <View className="flex-1 bg-background">
      <ScreenHeader title="Notificações e localização" subtitle="Raio, horário de silêncio e privacidade" onBack={() => router.back()} />
      <KeyboardScreen className="flex-1" contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 24 }}>
        <AlertPreferencesForm client={client} pushStatus={pushStatus} geofencing={geofencing} onEnableGeofencing={() => void enable()} />
      </KeyboardScreen>
    </View>
  );
}

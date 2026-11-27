import { useEffect } from "react";
import { ActivityIndicator, Platform, Text, View } from "react-native";
import { colors } from "@miaucha/shared";
import { GOOGLE_MESSAGE_TYPE } from "@/features/auth/googleWeb";

/**
 * Retorno do popup do Google (só na web): o Google volta para cá com o ID token no endereço. Esta tela
 * entrega o resultado à janela do app que abriu o popup e fecha. O token nunca sai do navegador por aqui.
 */
export default function GoogleCallback() {
  useEffect(() => {
    if (Platform.OS !== "web") return;
    window.opener?.postMessage({ type: GOOGLE_MESSAGE_TYPE, hash: window.location.hash }, window.location.origin);
    window.close();
  }, []);

  return (
    <View className="flex-1 items-center justify-center gap-3 bg-background p-6">
      <ActivityIndicator color={colors.brand} />
      <Text className="text-center font-ui-semibold text-base text-foreground">Concluindo o login com Google...</Text>
      <Text className="text-center font-sans text-sm text-muted-foreground">Esta janela fecha sozinha.</Text>
    </View>
  );
}

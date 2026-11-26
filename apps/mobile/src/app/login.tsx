import { useEffect } from "react";
import { Text, View } from "react-native";
import { router } from "expo-router";
import { LoginForm, useAuth } from "@/features/auth";
import { DEMO_MODE } from "@/features/auth/createAuthClient";
import { AuthScreenLayout } from "@/features/auth/AuthScreenLayout";

export default function Login() {
  const { login, signUp, loginWithGoogle, canUseGoogle, busy, error, clearError } = useAuth();
  // O erro de outra tela de entrada (ex.: senha errada no login) não aparece aqui.
  useEffect(() => clearError(), []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <AuthScreenLayout title="Bem-vindo ao Miaucha" subtitle="Juntos encontramos quem se perdeu">
      {DEMO_MODE ? (
        <View className="mb-4 rounded-2xl bg-accent-soft p-3">
          <Text className="font-nunito-black text-sm text-foreground">Modo demonstração</Text>
          <Text className="font-sans text-xs leading-4 text-muted-foreground">
            Dados de exemplo, nada vai para o servidor. Entre com qualquer e-mail e senha, ou com o Google.
          </Text>
        </View>
      ) : null}
      <LoginForm
        onLogin={login}
        onSignUp={signUp}
        onGoogle={canUseGoogle ? loginWithGoogle : undefined}
        onForgotPassword={() => router.push("/forgot-password")}
        loading={busy}
        serverError={error}
      />
    </AuthScreenLayout>
  );
}

import { useEffect } from "react";
import { router } from "expo-router";
import { LoginForm, useAuth } from "@/features/auth";
import { AuthScreenLayout } from "@/features/auth/AuthScreenLayout";

export default function Login() {
  const { login, signUp, loginWithGoogle, busy, error, clearError } = useAuth();
  // O erro de outra tela de entrada (ex.: senha errada no login) não aparece aqui.
  useEffect(() => clearError(), []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <AuthScreenLayout title="Bem-vindo ao Miaucha" subtitle="Juntos encontramos quem se perdeu">
      <LoginForm
        onLogin={login}
        onSignUp={signUp}
        onGoogle={loginWithGoogle}
        onForgotPassword={() => router.push("/forgot-password")}
        loading={busy}
        serverError={error}
      />
    </AuthScreenLayout>
  );
}

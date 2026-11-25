import { router } from "expo-router";
import { LoginForm, useAuth } from "@/features/auth";
import { AuthScreenLayout } from "@/features/auth/AuthScreenLayout";

export default function Login() {
  const { login, signUp, loginWithGoogle, busy, error } = useAuth();
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

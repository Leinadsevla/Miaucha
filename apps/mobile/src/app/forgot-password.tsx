import { useEffect } from "react";
import { router } from "expo-router";
import { ForgotPasswordForm, useAuth } from "@/features/auth";
import { AuthScreenLayout } from "@/features/auth/AuthScreenLayout";

export default function ForgotPassword() {
  const { requestPasswordReset, resetPassword, busy, error, clearError } = useAuth();
  // O erro de outra tela de entrada (ex.: senha errada no login) não aparece aqui.
  useEffect(() => clearError(), []); // eslint-disable-line react-hooks/exhaustive-deps
  // Depois de trocar a senha a sessão vira "signedIn" e o AuthGate leva ao app (ou ao consentimento).
  return (
    <AuthScreenLayout title="Esqueci minha senha" subtitle="Vamos criar uma senha nova">
      <ForgotPasswordForm
        onRequestCode={requestPasswordReset}
        onReset={resetPassword}
        onBack={() => router.replace("/login")}
        loading={busy}
        serverError={error}
      />
    </AuthScreenLayout>
  );
}

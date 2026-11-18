import { useAuth, VerifyEmailForm } from "@/features/auth";
import { AuthScreenLayout } from "@/features/auth/AuthScreenLayout";

export default function VerifyEmail() {
  const { state, verifyEmail, resendCode, busy, error } = useAuth();
  const email = state.status === "pendingVerification" ? state.email : "";
  return (
    <AuthScreenLayout title="Confirme seu e-mail" subtitle="Falta só um passo">
      <VerifyEmailForm email={email} onSubmit={verifyEmail} onResend={resendCode} loading={busy} serverError={error} />
    </AuthScreenLayout>
  );
}

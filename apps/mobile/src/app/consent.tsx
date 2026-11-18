import { router } from "expo-router";
import { ConsentForm, useAuth } from "@/features/auth";
import { AuthScreenLayout } from "@/features/auth/AuthScreenLayout";

export default function ConsentScreen() {
  const { acceptConsent } = useAuth();
  return (
    <AuthScreenLayout title="Sua privacidade" subtitle="Antes de começar, precisamos do seu consentimento">
      <ConsentForm onAccept={acceptConsent} onOpenPolicy={() => router.push("/privacy")} />
    </AuthScreenLayout>
  );
}

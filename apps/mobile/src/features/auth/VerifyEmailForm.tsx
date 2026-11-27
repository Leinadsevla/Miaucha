import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { validateEmailCode } from "@miaucha/shared";
import { PrimaryButton, TextField, TextLink } from "@/components";
import { useCountdown } from "@/lib/useCountdown";
import { RESEND_COOLDOWN_SECONDS } from "./ForgotPasswordForm";

type Props = {
  email: string;
  onSubmit: (code: string) => void;
  onResend: () => void | Promise<void>;
  loading?: boolean;
  serverError?: string;
};

export function VerifyEmailForm({ email, onSubmit, onResend, loading, serverError }: Props) {
  const [code, setCode] = useState("");
  const [resent, setResent] = useState(false);
  const cooldown = useCountdown(RESEND_COOLDOWN_SECONDS);
  const valid = validateEmailCode(code);

  // A tela abre logo depois do cadastro, que acabou de enviar o código.
  useEffect(() => cooldown.start(), []); // eslint-disable-line react-hooks/exhaustive-deps

  async function resend() {
    cooldown.start();
    await onResend();
    setResent(true);
  }

  return (
    <View className="gap-4">
      <View className="gap-1 rounded-2xl bg-accent-soft p-4">
        <Text className="font-sans text-sm leading-5 text-foreground">
          Enviamos um código para <Text className="font-ui-bold">{email}</Text>. Ele vale por 10 minutos.
        </Text>
        <Text className="font-sans text-xs leading-4 text-muted-foreground">Não chegou? Confira a caixa de spam e as abas Promoções ou Atualizações.</Text>
        {resent ? (
          <Text accessibilityLiveRegion="polite" className="mt-1 font-ui-bold text-xs text-brand">
            Enviamos um novo código. Use sempre o mais recente.
          </Text>
        ) : null}
      </View>
      <TextField
        label="Código de 6 dígitos"
        value={code}
        onChangeText={(t) => setCode(t.replace(/\D/g, "").slice(0, 6))}
        keyboardType="number-pad"
        autoComplete="one-time-code"
        textContentType="oneTimeCode"
        maxLength={6}
        returnKeyType="done"
        onSubmitEditing={() => valid && onSubmit(code)}
        error={serverError}
      />
      <PrimaryButton title="Confirmar" onPress={() => onSubmit(code)} disabled={!valid} loading={loading} />
      <TextLink
        label={cooldown.left > 0 ? `Reenviar código em ${cooldown.left} s` : "Reenviar código"}
        tone="brand"
        onPress={() => void resend()}
        disabled={cooldown.left > 0}
      />
    </View>
  );
}

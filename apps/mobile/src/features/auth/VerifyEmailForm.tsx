import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { validateEmailCode } from "@miaucha/shared";
import { PrimaryButton, TextField } from "@/components";

type Props = {
  email: string;
  onSubmit: (code: string) => void;
  onResend: () => void;
  loading?: boolean;
  serverError?: string;
};

export function VerifyEmailForm({ email, onSubmit, onResend, loading, serverError }: Props) {
  const [code, setCode] = useState("");
  const valid = validateEmailCode(code);

  return (
    <View className="gap-4">
      <Text className="font-sans text-sm text-muted-foreground">
        Enviamos um código para <Text className="font-nunito-bold text-foreground">{email}</Text>. Ele vale por 10
        minutos.
      </Text>
      <TextField
        label="Código de 6 dígitos"
        value={code}
        onChangeText={(t) => setCode(t.replace(/\D/g, "").slice(0, 6))}
        keyboardType="number-pad"
        autoComplete="one-time-code"
        textContentType="oneTimeCode"
        maxLength={6}
        error={serverError}
      />
      <PrimaryButton title="Confirmar" onPress={() => onSubmit(code)} disabled={!valid} loading={loading} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Reenviar código"
        onPress={onResend}
        className="self-center"
      >
        <Text className="font-nunito-bold text-xs text-primary">Reenviar código</Text>
      </Pressable>
    </View>
  );
}

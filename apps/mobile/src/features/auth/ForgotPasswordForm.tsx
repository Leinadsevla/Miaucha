import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { isValidEmail, validateEmailCode, validatePassword } from "@miaucha/shared";
import { PrimaryButton, TextField } from "@/components";

type Props = {
  /** Pede o código; resolve `true` se deu certo (aí o formulário vai para o segundo passo). */
  onRequestCode: (email: string) => Promise<boolean>;
  onReset: (email: string, code: string, password: string) => void;
  onBack: () => void;
  loading?: boolean;
  serverError?: string;
};

type Errors = { email?: string; code?: string; password?: string; confirm?: string };

/** Dois passos: e-mail → código, senha nova e confirmação. */
export function ForgotPasswordForm({ onRequestCode, onReset, onBack, loading, serverError }: Props) {
  const [step, setStep] = useState<"email" | "reset">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Errors>({});

  async function requestCode() {
    const trimmed = email.trim();
    if (!isValidEmail(trimmed)) return setErrors({ email: "E-mail inválido" });
    setErrors({});
    if (await onRequestCode(trimmed)) {
      setEmail(trimmed);
      setStep("reset");
    }
  }

  function reset() {
    const found: Errors = {};
    if (!validateEmailCode(code)) found.code = "O código tem 6 dígitos";
    found.password = validatePassword(password);
    if (!found.password && confirm !== password) found.confirm = "As senhas não conferem";
    setErrors(found);
    if (!found.code && !found.password && !found.confirm) onReset(email, code, password);
  }

  return (
    <View className="gap-4">
      {step === "email" ? (
        <>
          <Text className="font-sans text-sm text-muted-foreground">
            Informe o e-mail da sua conta. Vamos enviar um código para você criar uma senha nova.
          </Text>
          <TextField
            label="E-mail"
            placeholder="seu@email.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            error={errors.email}
          />
        </>
      ) : (
        <>
          <Text className="font-sans text-sm text-muted-foreground">
            Se existir uma conta com <Text className="font-nunito-bold text-foreground">{email}</Text>, enviamos um código
            que vale por 10 minutos.
          </Text>
          <TextField
            label="Código"
            placeholder="6 dígitos"
            value={code}
            onChangeText={(t) => setCode(t.replace(/\D/g, "").slice(0, 6))}
            keyboardType="number-pad"
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
            error={errors.code}
          />
          <TextField
            label="Nova senha"
            placeholder="••••••••"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="new-password"
            error={errors.password}
          />
          <TextField
            label="Confirmar nova senha"
            placeholder="••••••••"
            value={confirm}
            onChangeText={setConfirm}
            secureTextEntry
            autoComplete="new-password"
            error={errors.confirm}
          />
        </>
      )}

      {serverError ? (
        <Text accessibilityRole="alert" className="text-center font-nunito-semibold text-xs text-lost">
          {serverError}
        </Text>
      ) : null}

      {step === "email" ? (
        <PrimaryButton title="Enviar código" onPress={requestCode} loading={loading} />
      ) : (
        <>
          <PrimaryButton title="Trocar senha" onPress={reset} loading={loading} />
          <Pressable accessibilityRole="button" accessibilityLabel="Reenviar código" onPress={() => onRequestCode(email)} className="self-center">
            <Text className="font-nunito-semibold text-xs text-primary">Reenviar código</Text>
          </Pressable>
        </>
      )}
      <Pressable accessibilityRole="button" accessibilityLabel="Voltar para o login" onPress={onBack} className="self-center">
        <Text className="font-nunito-semibold text-xs text-muted-foreground">Voltar para o login</Text>
      </Pressable>
    </View>
  );
}

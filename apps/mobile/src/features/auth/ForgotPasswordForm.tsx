import { useRef, useState, type ComponentRef } from "react";
import { Text, View, type TextInput } from "react-native";

type InputRef = ComponentRef<typeof TextInput>;
import { isValidEmail, validateEmailCode, validatePassword } from "@miaucha/shared";
import { PrimaryButton, TextField, TextLink } from "@/components";
import { useCountdown } from "@/lib/useCountdown";

/** A API recusa um novo código antes de 1 minuto (429). */
export const RESEND_COOLDOWN_SECONDS = 60;

type Props = {
  /** Pede o código; resolve `true` se deu certo (aí o formulário vai para o segundo passo). */
  onRequestCode: (email: string) => Promise<boolean>;
  onReset: (email: string, code: string, password: string) => void;
  onBack: () => void;
  loading?: boolean;
  serverError?: string;
};

type Errors = { email?: string; code?: string; password?: string; confirm?: string };

/** Erros da API sobre o código (incorreto, expirado) vão para o campo do código. */
const isCodeError = (message: string) => /c[óo]digo/i.test(message);

/** Dois passos: e-mail → código, senha nova e confirmação. */
export function ForgotPasswordForm({ onRequestCode, onReset, onBack, loading, serverError }: Props) {
  const [step, setStep] = useState<"email" | "reset">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const cooldown = useCountdown(RESEND_COOLDOWN_SECONDS);
  const passwordRef = useRef<InputRef>(null);
  const confirmRef = useRef<InputRef>(null);

  async function requestCode() {
    const trimmed = email.trim();
    if (!isValidEmail(trimmed)) return setErrors({ email: "E-mail inválido" });
    setErrors({});
    if (await onRequestCode(trimmed)) {
      setEmail(trimmed);
      setResent(false);
      setStep("reset");
      cooldown.start();
    }
  }

  async function resend() {
    setResending(true);
    try {
      if (await onRequestCode(email)) {
        setResent(true);
        cooldown.start();
      }
    } finally {
      setResending(false);
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

  const codeServerError = step === "reset" && serverError && isCodeError(serverError) ? serverError : undefined;
  const generalError = serverError && !codeServerError ? serverError : undefined;
  const resendLabel = resending ? "Reenviando..." : cooldown.left > 0 ? `Reenviar código em ${cooldown.left} s` : "Reenviar código";

  return (
    <View className="gap-4">
      {step === "email" ? (
        <>
          <Text className="font-sans text-sm leading-5 text-muted-foreground">
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
            returnKeyType="send"
            onSubmitEditing={() => void requestCode()}
            error={errors.email}
          />
        </>
      ) : (
        <>
          <View className="gap-1 rounded-2xl bg-accent-soft p-4">
            <Text className="font-sans text-sm leading-5 text-foreground">
              Se existir uma conta com <Text className="font-ui-bold">{email}</Text>, enviamos um código que vale por 10 minutos.
            </Text>
            <Text className="font-sans text-xs leading-4 text-muted-foreground">Não chegou? Confira a caixa de spam e as abas Promoções ou Atualizações.</Text>
            {resent ? (
              <Text accessibilityLiveRegion="polite" className="mt-1 font-ui-bold text-xs text-brand-deep">
                Enviamos um novo código. Use sempre o mais recente.
              </Text>
            ) : null}
          </View>
          <TextField
            label="Código"
            placeholder="6 dígitos"
            value={code}
            onChangeText={(t) => setCode(t.replace(/\D/g, "").slice(0, 6))}
            keyboardType="number-pad"
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
            error={errors.code ?? codeServerError}
          />
          <TextField
            ref={passwordRef}
            label="Nova senha"
            placeholder="••••••••"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="new-password"
            returnKeyType="next"
            onSubmitEditing={() => confirmRef.current?.focus()}
            error={errors.password}
          />
          <TextField
            ref={confirmRef}
            label="Confirmar nova senha"
            placeholder="••••••••"
            value={confirm}
            onChangeText={setConfirm}
            secureTextEntry
            autoComplete="new-password"
            returnKeyType="done"
            onSubmitEditing={reset}
            error={errors.confirm}
          />
        </>
      )}

      {generalError ? (
        <Text accessibilityRole="alert" className="text-center font-ui-semibold text-sm text-lost">
          {generalError}
        </Text>
      ) : null}

      {step === "email" ? (
        <PrimaryButton title="Enviar código" onPress={requestCode} loading={loading} />
      ) : (
        <>
          <PrimaryButton title="Trocar senha" onPress={reset} loading={loading && !resending} disabled={resending} />
          <View className="flex-row flex-wrap items-center justify-center">
            <TextLink label={resendLabel} tone="brand" onPress={() => void resend()} disabled={resending || cooldown.left > 0} />
            <TextLink label="Trocar e-mail" onPress={() => setStep("email")} />
          </View>
        </>
      )}
      <TextLink label="Voltar para o login" onPress={onBack} />
    </View>
  );
}

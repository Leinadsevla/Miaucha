import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { elevation, validateLogin, validateSignUp, type LoginInput, type SignUpInput } from "@miaucha/shared";
import { PrimaryButton, TextField, TextLink } from "@/components";
import { cn } from "@/lib/cn";

type Tab = "login" | "register";
type Errors = Partial<Record<keyof SignUpInput | "confirmPassword", string>>;

type Props = {
  onLogin: (input: LoginInput) => void;
  onSignUp: (input: SignUpInput) => void;
  /** Sem ele (login com Google não configurado), o botão não aparece. */
  onGoogle?: () => void;
  onForgotPassword?: () => void;
  loading?: boolean;
  serverError?: string;
};

export function LoginForm({ onLogin, onSignUp, onGoogle, onForgotPassword, loading, serverError }: Props) {
  const [tab, setTab] = useState<Tab>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<Errors>({});

  function switchTab(next: Tab) {
    setTab(next);
    setErrors({});
  }

  function submit() {
    const trimmedEmail = email.trim();
    if (tab === "login") {
      const input = { email: trimmedEmail, password };
      const found = validateLogin(input);
      setErrors(found);
      if (Object.keys(found).length === 0) onLogin(input);
    } else {
      const input = { name: name.trim(), email: trimmedEmail, password };
      const found: Errors = validateSignUp(input);
      if (!found.password && confirmPassword !== password) found.confirmPassword = "As senhas não conferem";
      setErrors(found);
      if (Object.keys(found).length === 0) onSignUp(input);
    }
  }

  return (
    <View className="gap-5">
      <View accessibilityRole="tablist" className="flex-row rounded-2xl bg-muted p-1">
        {(["login", "register"] as const).map((t) => {
          const selected = tab === t;
          const label = t === "login" ? "Entrar" : "Cadastrar";
          return (
            <Pressable
              key={t}
              accessibilityRole="tab"
              accessibilityLabel={label}
              accessibilityState={{ selected }}
              onPress={() => switchTab(t)}
              className={cn("flex-1 items-center justify-center rounded-xl", selected && "bg-white")}
              style={[{ minHeight: 44 }, selected ? elevation.card : null]}
            >
              <Text className={cn("text-base", selected ? "font-nunito-black text-foreground" : "font-nunito-bold text-muted-foreground")}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View className="gap-3">
        {tab === "register" ? (
          <TextField
            label="Nome completo"
            placeholder="Seu nome"
            value={name}
            onChangeText={setName}
            autoComplete="name"
            error={errors.name}
          />
        ) : null}
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
        <TextField
          label="Senha"
          placeholder="••••••••"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete={tab === "login" ? "current-password" : "new-password"}
          returnKeyType={tab === "login" ? "go" : "next"}
          onSubmitEditing={tab === "login" ? submit : undefined}
          error={errors.password}
        />
        {tab === "register" ? (
          <TextField
            label="Confirmar senha"
            placeholder="••••••••"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            autoComplete="new-password"
            returnKeyType="go"
            onSubmitEditing={submit}
            error={errors.confirmPassword}
          />
        ) : null}
        {tab === "login" && onForgotPassword ? (
          <View className="-my-2 self-end">
            <TextLink label="Esqueci minha senha" tone="primary" onPress={onForgotPassword} />
          </View>
        ) : null}

        {serverError ? (
          <Text accessibilityRole="alert" className="text-center font-nunito-semibold text-sm text-lost">
            {serverError}
          </Text>
        ) : null}

        <PrimaryButton
          title={tab === "login" ? "Entrar" : "Criar conta"}
          onPress={submit}
          loading={loading}
          className="mt-2"
        />

        {onGoogle ? (
          <>
            <View className="my-1 flex-row items-center gap-3">
              <View className="h-px flex-1 bg-border" />
              <Text className="font-nunito-semibold text-xs text-muted-foreground">ou</Text>
              <View className="h-px flex-1 bg-border" />
            </View>

            <PrimaryButton
              title="Continuar com Google"
              variant="outline"
              onPress={onGoogle}
              disabled={loading}
              icon={<GoogleLogo />}
            />
          </>
        ) : null}
      </View>
    </View>
  );
}

function GoogleLogo() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24">
      <Path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <Path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <Path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <Path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </Svg>
  );
}

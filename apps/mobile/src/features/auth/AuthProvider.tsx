import { createContext, useCallback, useContext, useMemo, useReducer, useState, type ReactNode } from "react";
import type { Consent } from "./ConsentForm";
import type { LoginInput, SignUpInput } from "@miaucha/shared";
import { authReducer, initialAuthState, type AuthState, type SessionUser } from "./session";

/** Contrato com a API (apps/api). Até o backend existir, o app usa o mockAuthClient. */
export type AuthClient = {
  restore(): Promise<SessionUser | null>;
  login(input: LoginInput): Promise<SessionUser>;
  signUp(input: SignUpInput): Promise<void>;
  verifyEmail(email: string, code: string): Promise<SessionUser>;
  resendCode(email: string): Promise<void>;
  requestPasswordReset(email: string): Promise<void>;
  resetPassword(email: string, code: string, password: string): Promise<SessionUser>;
  loginWithGoogle(): Promise<SessionUser>;
  saveConsent(consent: Consent): Promise<void>;
  logout(): Promise<void>;
};

type AuthContextValue = {
  state: AuthState;
  busy: boolean;
  error?: string;
  restore(): Promise<void>;
  login(input: LoginInput): Promise<void>;
  signUp(input: SignUpInput): Promise<void>;
  verifyEmail(code: string): Promise<void>;
  resendCode(): Promise<void>;
  /** Resolve `true` se o código foi pedido (para a tela seguir ao próximo passo). */
  requestPasswordReset(email: string): Promise<boolean>;
  resetPassword(email: string, code: string, password: string): Promise<void>;
  loginWithGoogle(): Promise<void>;
  acceptConsent(consent: Consent): Promise<void>;
  logout(): Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ client, children }: { client: AuthClient; children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialAuthState);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const attempt = useCallback(async (task: () => Promise<void>): Promise<boolean> => {
    setBusy(true);
    setError(undefined);
    try {
      await task();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Algo deu errado. Tente de novo.");
      return false;
    } finally {
      setBusy(false);
    }
  }, []);
  const run = useCallback(async (task: () => Promise<void>) => void (await attempt(task)), [attempt]);

  const pendingEmail = state.status === "pendingVerification" ? state.email : "";

  const value = useMemo<AuthContextValue>(
    () => ({
      state,
      busy,
      error,
      restore: () => run(async () => dispatch({ type: "restored", user: await client.restore() })),
      login: (input) => run(async () => dispatch({ type: "signedIn", user: await client.login(input) })),
      signUp: (input) =>
        run(async () => {
          await client.signUp(input);
          dispatch({ type: "signedUp", email: input.email });
        }),
      verifyEmail: (code) =>
        run(async () => dispatch({ type: "signedIn", user: await client.verifyEmail(pendingEmail, code) })),
      resendCode: () => run(() => client.resendCode(pendingEmail)),
      requestPasswordReset: (email) => attempt(() => client.requestPasswordReset(email)),
      resetPassword: (email, code, password) =>
        run(async () => dispatch({ type: "signedIn", user: await client.resetPassword(email, code, password) })),
      loginWithGoogle: () => run(async () => dispatch({ type: "signedIn", user: await client.loginWithGoogle() })),
      acceptConsent: (consent) =>
        run(async () => {
          await client.saveConsent(consent);
          dispatch({ type: "consentGiven" });
        }),
      logout: () =>
        run(async () => {
          await client.logout();
          dispatch({ type: "signedOut" });
        }),
    }),
    [state, busy, error, run, attempt, client, pendingEmail],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth precisa estar dentro de <AuthProvider>");
  return ctx;
}

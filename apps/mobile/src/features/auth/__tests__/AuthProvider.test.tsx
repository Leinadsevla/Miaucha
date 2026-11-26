import type { ReactNode } from "react";
import { act, renderHook } from "@testing-library/react-native";
import { AuthProvider, useAuth, type AuthClient } from "../AuthProvider";
import { createMockAuthClient } from "../mockAuthClient";

jest.useFakeTimers();

function setup(client: AuthClient = createMockAuthClient()) {
  const wrapper = ({ children }: { children: ReactNode }) => <AuthProvider client={client}>{children}</AuthProvider>;
  return renderHook(() => useAuth(), { wrapper });
}

async function settle(promise: Promise<void>) {
  await act(async () => {
    const done = promise;
    jest.runAllTimers();
    await done;
  });
}

describe("AuthProvider", () => {
  it("cadastro → código → consentimento → pronto", async () => {
    const { result } = await setup();
    await settle(result.current.restore());
    expect(result.current.state).toEqual({ status: "signedOut" });

    await settle(result.current.signUp({ name: "Ana", email: "ana@exemplo.com", password: "segura123" }));
    expect(result.current.state).toEqual({ status: "pendingVerification", email: "ana@exemplo.com" });

    await settle(result.current.verifyEmail("123456"));
    expect(result.current.state).toMatchObject({ status: "signedIn", user: { name: "Ana", hasConsent: false } });

    await settle(result.current.acceptConsent({ privacyPolicy: true, approximateLocation: true }));
    expect(result.current.state).toMatchObject({ status: "signedIn", user: { hasConsent: true } });
  });

  it("sessão expirada no meio do uso (refresh recusado) → volta para signedOut", async () => {
    const client = createMockAuthClient();
    let expire!: () => void;
    client.onSessionExpired = (listener) => {
      expire = listener;
      return () => undefined;
    };
    const { result } = await setup(client);
    await settle(result.current.login({ email: "ana@exemplo.com", password: "segura123" }));
    expect(result.current.state.status).toBe("signedIn");

    await act(async () => expire());
    expect(result.current.state).toEqual({ status: "signedOut" });
  });

  it("clearError apaga o erro (para o erro do login não aparecer em Esqueci minha senha)", async () => {
    const { result } = await setup();
    await settle(result.current.restore());
    await settle(result.current.login({ email: "ana@exemplo.com", password: "errada123" }));
    expect(result.current.error).toBe("E-mail ou senha incorretos");
    await act(async () => result.current.clearError());
    expect(result.current.error).toBeUndefined();
  });

  it("erro da API aparece em error e a sessão não muda", async () => {
    const { result } = await setup();
    await settle(result.current.restore());
    await settle(result.current.login({ email: "ana@exemplo.com", password: "errada123" }));
    expect(result.current.error).toBe("E-mail ou senha incorretos");
    expect(result.current.state).toEqual({ status: "signedOut" });
    expect(result.current.busy).toBe(false);
  });

  it("esqueci a senha: pedir código não muda a sessão; trocar a senha entra na conta", async () => {
    const client = createMockAuthClient();
    const request = jest.spyOn(client, "requestPasswordReset");
    const { result } = await setup(client);
    await settle(result.current.restore());

    let sent = false;
    await act(async () => {
      const p = result.current.requestPasswordReset("ana@exemplo.com").then((ok) => (sent = ok));
      jest.runAllTimers();
      await p;
    });
    expect(sent).toBe(true);
    expect(request).toHaveBeenCalledWith("ana@exemplo.com");
    expect(result.current.state).toEqual({ status: "signedOut" });

    await settle(result.current.resetPassword("ana@exemplo.com", "123456", "novaSenha1"));
    expect(result.current.state).toMatchObject({ status: "signedIn" });
  });

  it("useAuth fora do provider avisa o erro", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    await expect(renderHook(() => useAuth())).rejects.toThrow("useAuth precisa estar dentro de <AuthProvider>");
  });
});

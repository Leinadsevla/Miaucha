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

  it("erro da API aparece em error e a sessão não muda", async () => {
    const { result } = await setup();
    await settle(result.current.restore());
    await settle(result.current.login({ email: "ana@exemplo.com", password: "errada123" }));
    expect(result.current.error).toBe("E-mail ou senha incorretos");
    expect(result.current.state).toEqual({ status: "signedOut" });
    expect(result.current.busy).toBe(false);
  });

  it("useAuth fora do provider avisa o erro", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    await expect(renderHook(() => useAuth())).rejects.toThrow("useAuth precisa estar dentro de <AuthProvider>");
  });
});

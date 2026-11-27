import { createNativeGoogleSignIn, type GoogleSignInModule } from "../googleNative";

const statusCodes = { SIGN_IN_CANCELLED: "CANCELLED", IN_PROGRESS: "IN_PROGRESS", PLAY_SERVICES_NOT_AVAILABLE: "PLAY" };

function fakeModule(signIn: () => Promise<unknown>) {
  const GoogleSignin = {
    configure: jest.fn(),
    hasPlayServices: jest.fn(async () => true),
    signIn: jest.fn(signIn),
    signOut: jest.fn(async () => null),
  };
  return { GoogleSignin, statusCodes } as unknown as GoogleSignInModule & { GoogleSignin: typeof GoogleSignin };
}

const success = (idToken: string | null) => async () => ({ type: "success", data: { idToken } });
const nativeError = (code: string) => async () => {
  throw Object.assign(new Error("nativo"), { code });
};

describe("createNativeGoogleSignIn (login com Google no Android)", () => {
  it("configura com o Client ID Web (uma vez só), confere o Play Services e devolve o ID token", async () => {
    const mod = fakeModule(success("id-token"));
    const google = createNativeGoogleSignIn("web.apps.googleusercontent.com", () => mod);

    await expect(google.getIdToken()).resolves.toBe("id-token");
    await google.getIdToken();

    expect(mod.GoogleSignin.configure).toHaveBeenCalledTimes(1);
    expect(mod.GoogleSignin.configure).toHaveBeenCalledWith({ webClientId: "web.apps.googleusercontent.com" });
    expect(mod.GoogleSignin.hasPlayServices).toHaveBeenCalledWith({ showPlayServicesUpdateDialog: true });
  });

  it("depois de pegar o token, sai da conta do Google no aparelho (o próximo login deixa escolher a conta)", async () => {
    const mod = fakeModule(success("id-token"));
    await createNativeGoogleSignIn("web", () => mod).getIdToken();
    expect(mod.GoogleSignin.signOut).toHaveBeenCalledTimes(1);
  });

  it("não carrega o módulo nativo antes do primeiro login", () => {
    const load = jest.fn(() => fakeModule(success("t")));
    createNativeGoogleSignIn("web", load);
    expect(load).not.toHaveBeenCalled();
  });

  it("a pessoa fechou a janela do Google → 'Login com Google cancelado'", async () => {
    const mod = fakeModule(async () => ({ type: "cancelled", data: null }));
    await expect(createNativeGoogleSignIn("web", () => mod).getIdToken()).rejects.toThrow("Login com Google cancelado");
    await expect(createNativeGoogleSignIn("web", () => fakeModule(nativeError("CANCELLED"))).getIdToken()).rejects.toThrow(
      "Login com Google cancelado",
    );
  });

  it("sem ID token (Client ID Web errado) → erro claro", async () => {
    await expect(createNativeGoogleSignIn("web", () => fakeModule(success(null))).getIdToken()).rejects.toThrow(
      "O Google não devolveu a identificação da conta. Tente de novo.",
    );
  });

  it("erros do aparelho viram mensagens em português", async () => {
    const run = (code: string) => createNativeGoogleSignIn("web", () => fakeModule(nativeError(code))).getIdToken();
    await expect(run("PLAY")).rejects.toThrow("Atualize o Google Play Services para entrar com o Google");
    await expect(run("IN_PROGRESS")).rejects.toThrow("O login com Google já está aberto");
    await expect(run("DEVELOPER_ERROR")).rejects.toThrow("Não foi possível entrar com o Google. Tente de novo.");
  });
});

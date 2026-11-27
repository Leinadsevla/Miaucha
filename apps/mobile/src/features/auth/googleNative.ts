import type { GoogleSignIn } from "./httpAuthClient";

/** O que usamos do `@react-native-google-signin/google-signin` (o teste passa um falso). */
export type GoogleSignInModule = {
  GoogleSignin: {
    configure(options: { webClientId: string }): void;
    hasPlayServices(options: { showPlayServicesUpdateDialog: boolean }): Promise<boolean>;
    signIn(): Promise<{ type: "success"; data: { idToken: string | null } } | { type: "cancelled"; data: null }>;
    signOut(): Promise<unknown>;
  };
  statusCodes: { SIGN_IN_CANCELLED: string; IN_PROGRESS: string; PLAY_SERVICES_NOT_AVAILABLE: string };
};

const CANCELLED = "Login com Google cancelado";
const FAILED = "Não foi possível entrar com o Google. Tente de novo.";

// `require` só no primeiro login: no Jest e no Expo Go o módulo nativo não existe.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const loadModule = (): GoogleSignInModule => require("@react-native-google-signin/google-signin");

/**
 * Login com Google no Android (precisa de development build ou APK). O Client ID é o do tipo
 * "Aplicativo da Web": é ele que vai como destinatário do ID token que a API confere (`GOOGLE_CLIENT_IDS`).
 * O Client ID "Android" (pacote + SHA-1) só precisa existir no mesmo projeto do Google Cloud.
 */
export function createNativeGoogleSignIn(webClientId: string, load: () => GoogleSignInModule = loadModule): GoogleSignIn {
  let mod: GoogleSignInModule | null = null;

  return {
    async getIdToken() {
      if (!mod) {
        mod = load();
        mod.GoogleSignin.configure({ webClientId });
      }
      const { GoogleSignin, statusCodes } = mod;
      let response: Awaited<ReturnType<GoogleSignInModule["GoogleSignin"]["signIn"]>>;
      try {
        await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
        response = await GoogleSignin.signIn();
      } catch (error) {
        const code = (error as { code?: string } | null)?.code;
        if (code === statusCodes.SIGN_IN_CANCELLED) throw new Error(CANCELLED);
        if (code === statusCodes.IN_PROGRESS) throw new Error("O login com Google já está aberto");
        if (code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) throw new Error("Atualize o Google Play Services para entrar com o Google");
        throw new Error(FAILED);
      }
      if (response.type === "cancelled") throw new Error(CANCELLED);
      // A sessão do app é da API; sair do Google no aparelho deixa escolher outra conta no próximo login.
      void GoogleSignin.signOut().catch(() => {});
      if (!response.data.idToken) throw new Error("O Google não devolveu a identificação da conta. Tente de novo.");
      return response.data.idToken;
    },
  };
}

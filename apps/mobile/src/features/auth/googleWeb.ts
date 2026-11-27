import type { GoogleSignIn } from "./httpAuthClient";

/**
 * Login com Google no navegador: abre a janela oficial do Google (popup), que volta para a rota
 * `/google-callback` do próprio app com o ID token no endereço. A API confere o token (`POST /auth/google`).
 * O Client ID é do tipo "Aplicativo da Web" e precisa ter `<origem>/google-callback` nos redirecionamentos.
 */
export const GOOGLE_CALLBACK_PATH = "/google-callback";
/** Tipo da mensagem que a rota de retorno manda para a janela que abriu o popup. */
export const GOOGLE_MESSAGE_TYPE = "miaucha-google";

const CANCELLED = "Login com Google cancelado";
const INVALID = "Resposta do Google inválida. Tente de novo.";

export function buildGoogleAuthUrl({ clientId, origin, nonce }: { clientId: string; origin: string; nonce: string }): string {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${origin}${GOOGLE_CALLBACK_PATH}`,
    response_type: "id_token",
    scope: "openid email profile",
    nonce,
    prompt: "select_account",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

function nonceOf(idToken: string): string | undefined {
  try {
    const payload = idToken.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return (JSON.parse(atob(payload)) as { nonce?: string }).nonce;
  } catch {
    return undefined;
  }
}

/**
 * Lê o `#id_token=...` devolvido pelo Google. O nonce prova que a resposta é deste pedido (a assinatura
 * e o destinatário do token quem confere é a API).
 */
export function idTokenFromCallback(hash: string, expectedNonce: string): string {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  const error = params.get("error");
  if (error) throw new Error(error === "access_denied" ? CANCELLED : `O Google recusou o login (${error})`);
  const idToken = params.get("id_token");
  if (!idToken || nonceOf(idToken) !== expectedNonce) throw new Error(INVALID);
  return idToken;
}

export type PopupWindow = { closed: boolean; close(): void };
type MessageEventLike = { origin: string; data: unknown };

type Deps = {
  clientId: string;
  /** Origem do app (ex.: `http://localhost:8081`): só mensagens dela são aceitas. */
  origin: string;
  open: (url: string) => PopupWindow | null;
  /** Ouve mensagens da janela; devolve como parar de ouvir. */
  onMessage: (listener: (event: MessageEventLike) => void) => () => void;
  newNonce: () => string;
  /** De quanto em quanto tempo confere se a pessoa fechou o popup. */
  pollMs?: number;
};

export function createWebGoogleSignIn({ clientId, origin, open, onMessage, newNonce, pollMs = 500 }: Deps): GoogleSignIn {
  return {
    getIdToken() {
      return new Promise<string>((resolve, reject) => {
        const nonce = newNonce();
        const popup = open(buildGoogleAuthUrl({ clientId, origin, nonce }));
        if (!popup) {
          reject(new Error("O navegador bloqueou a janela do Google. Libere os pop-ups para este site e tente de novo."));
          return;
        }

        const finish = (result: () => void) => {
          clearInterval(watcher);
          stopListening();
          result();
        };
        const stopListening = onMessage((event) => {
          const data = event.data as { type?: string; hash?: string } | null;
          if (event.origin !== origin || data?.type !== GOOGLE_MESSAGE_TYPE) return;
          finish(() => {
            popup.close();
            try {
              resolve(idTokenFromCallback(data.hash ?? "", nonce));
            } catch (error) {
              reject(error);
            }
          });
        });
        const watcher = setInterval(() => {
          if (popup.closed) finish(() => reject(new Error(CANCELLED)));
        }, pollMs);
      });
    },
  };
}

/** Login com Google usando as APIs do navegador. */
export function createBrowserGoogleSignIn(clientId: string): GoogleSignIn {
  return createWebGoogleSignIn({
    clientId,
    origin: window.location.origin,
    open: (url) => window.open(url, "miaucha-google", "popup,width=500,height=650"),
    onMessage: (listener) => {
      window.addEventListener("message", listener);
      return () => window.removeEventListener("message", listener);
    },
    newNonce: () => Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, "0")).join(""),
  });
}

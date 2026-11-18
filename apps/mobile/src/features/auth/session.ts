export type SessionUser = { id: string; name: string; hasConsent: boolean };

export type AuthState =
  | { status: "loading" }
  | { status: "signedOut" }
  | { status: "pendingVerification"; email: string }
  | { status: "signedIn"; user: SessionUser };

export type AuthAction =
  | { type: "restored"; user: SessionUser | null }
  | { type: "signedUp"; email: string }
  | { type: "signedIn"; user: SessionUser }
  | { type: "consentGiven" }
  | { type: "signedOut" };

export const initialAuthState: AuthState = { status: "loading" };

export function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case "restored":
      return action.user ? { status: "signedIn", user: action.user } : { status: "signedOut" };
    case "signedUp":
      return { status: "pendingVerification", email: action.email };
    case "signedIn":
      return { status: "signedIn", user: action.user };
    case "consentGiven":
      return state.status === "signedIn" ? { status: "signedIn", user: { ...state.user, hasConsent: true } } : state;
    case "signedOut":
      return { status: "signedOut" };
  }
}

/** Para qual tela o usuário deve ir em cada estado da sessão. */
export function routeFor(state: AuthState): "/splash" | "/login" | "/verify-email" | "/consent" | "/" {
  switch (state.status) {
    case "loading":
      return "/splash";
    case "signedOut":
      return "/login";
    case "pendingVerification":
      return "/verify-email";
    case "signedIn":
      return state.user.hasConsent ? "/" : "/consent";
  }
}

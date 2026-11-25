import type { AuthClient } from "./AuthProvider";
import type { SessionUser } from "./session";

const wait = (ms = 400) => new Promise((r) => setTimeout(r, ms));

/**
 * Cliente falso para desenvolver as telas antes da API existir.
 * Qualquer código de 6 dígitos é aceito; a senha "errada123" simula erro de login.
 */
export function createMockAuthClient(): AuthClient {
  let user: SessionUser | null = null;
  let pendingName = "";

  return {
    async restore() {
      return user;
    },
    async login({ email, password }) {
      await wait();
      if (password === "errada123") throw new Error("E-mail ou senha incorretos");
      user = { id: "dev", name: email.split("@")[0], hasConsent: false };
      return user;
    },
    async signUp({ name }) {
      await wait();
      pendingName = name;
    },
    async requestPasswordReset() {
      await wait();
    },
    async resetPassword(email) {
      await wait();
      user = { id: "dev", name: email.split("@")[0], hasConsent: false };
      return user;
    },
    async verifyEmail() {
      await wait();
      user = { id: "dev", name: pendingName || "Tutor", hasConsent: false };
      return user;
    },
    async resendCode() {
      await wait();
    },
    async loginWithGoogle() {
      await wait();
      user = { id: "dev-google", name: "Tutor Google", hasConsent: false };
      return user;
    },
    async saveConsent() {
      await wait(200);
      if (user) user = { ...user, hasConsent: true };
    },
    async logout() {
      user = null;
    },
  };
}

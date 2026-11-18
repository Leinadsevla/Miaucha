import { OAuth2Client } from "google-auth-library";

export type GoogleProfile = { sub: string; email: string; emailVerified: boolean; name: string };

export interface GoogleVerifier {
  /** Valida o ID token (assinatura, `aud`, expiração) e devolve o perfil, ou lança InvalidGoogleTokenError. */
  verify(idToken: string): Promise<GoogleProfile>;
}

export class InvalidGoogleTokenError extends Error {
  constructor() {
    super("ID token do Google inválido");
  }
}

export class GoogleAuthLibraryVerifier implements GoogleVerifier {
  private readonly client = new OAuth2Client();

  constructor(private readonly clientIds: string[]) {}

  async verify(idToken: string): Promise<GoogleProfile> {
    if (this.clientIds.length === 0) throw new InvalidGoogleTokenError();
    try {
      const ticket = await this.client.verifyIdToken({ idToken, audience: this.clientIds });
      const payload = ticket.getPayload();
      if (!payload?.sub || !payload.email) throw new InvalidGoogleTokenError();
      return {
        sub: payload.sub,
        email: payload.email,
        emailVerified: payload.email_verified === true,
        name: payload.name ?? payload.email.split("@")[0],
      };
    } catch {
      throw new InvalidGoogleTokenError();
    }
  }
}

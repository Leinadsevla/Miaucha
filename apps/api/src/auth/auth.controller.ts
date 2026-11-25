import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";
import { AuthService } from "./auth.service";
import { str } from "./body";

/** Todas as rotas de autenticação têm rate limit por IP e por rota (NF-04). */
@Controller("auth")
@UseGuards(ThrottlerGuard)
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post("signup")
  async signUp(@Body() body: unknown): Promise<void> {
    await this.auth.signUp({ name: str(body, "name"), email: str(body, "email"), password: str(body, "password") });
  }

  @Post("verify-email")
  @HttpCode(HttpStatus.OK)
  verifyEmail(@Body() body: unknown) {
    return this.auth.verifyEmail(str(body, "email"), str(body, "code"));
  }

  @Post("login")
  @HttpCode(HttpStatus.OK)
  login(@Body() body: unknown) {
    return this.auth.login({ email: str(body, "email"), password: str(body, "password") });
  }

  @Post("google")
  @HttpCode(HttpStatus.OK)
  loginWithGoogle(@Body() body: unknown) {
    return this.auth.loginWithGoogle(str(body, "idToken"));
  }

  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  refresh(@Body() body: unknown) {
    return this.auth.refresh(str(body, "refreshToken"));
  }

  @Post("logout")
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Body() body: unknown): Promise<void> {
    await this.auth.logout(str(body, "refreshToken"));
  }

  @Post("forgot-password")
  @HttpCode(HttpStatus.NO_CONTENT)
  async forgotPassword(@Body() body: unknown): Promise<void> {
    await this.auth.requestPasswordReset(str(body, "email"));
  }

  @Post("reset-password")
  @HttpCode(HttpStatus.OK)
  resetPassword(@Body() body: unknown) {
    return this.auth.resetPassword(str(body, "email"), str(body, "code"), str(body, "password"));
  }

  @Post("resend-code")
  @HttpCode(HttpStatus.NO_CONTENT)
  async resendCode(@Body() body: unknown): Promise<void> {
    await this.auth.resendCode(str(body, "email"));
  }
}

import { BadRequestException, Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Put, UseGuards } from "@nestjs/common";
import { SkipThrottle, ThrottlerGuard } from "@nestjs/throttler";
import { isValidPushToken } from "@miaucha/shared";
import { AccessTokenGuard, CurrentUserId } from "../auth/access-token.guard";
import { str } from "../auth/body";
import { parseLocationBody, parsePreferencesBody } from "./alert-params";
import { AlertsService } from "./alerts.service";

const PUSH_TOKEN_MESSAGE = "Token de notificação inválido";

/** Rotas de alertas do próprio usuário. Escritas com rate limit (NF-04); leituras sem. */
@Controller("me")
@UseGuards(AccessTokenGuard, ThrottlerGuard)
export class AlertsController {
  constructor(private readonly alerts: AlertsService) {}

  /** AL-06: `{ geohash }` de 6 caracteres; nada de coordenada. */
  @Put("location")
  @HttpCode(HttpStatus.NO_CONTENT)
  async updateLocation(@CurrentUserId() userId: string, @Body() body: unknown): Promise<void> {
    const parsed = parseLocationBody(body);
    if ("error" in parsed) throw new BadRequestException(parsed.error);
    await this.alerts.updateLocation(userId, parsed.geohash);
  }

  @Get("alert-preferences")
  @SkipThrottle()
  getPreferences(@CurrentUserId() userId: string) {
    return this.alerts.getPreferences(userId);
  }

  @Put("alert-preferences")
  savePreferences(@CurrentUserId() userId: string, @Body() body: unknown) {
    const parsed = parsePreferencesBody(body);
    if ("errors" in parsed) throw new BadRequestException({ message: "Confira as preferências de alerta", errors: parsed.errors });
    return this.alerts.savePreferences(userId, parsed.prefs);
  }

  @Post("push-token")
  @HttpCode(HttpStatus.NO_CONTENT)
  async registerPushToken(@CurrentUserId() userId: string, @Body() body: unknown): Promise<void> {
    const token = str(body, "token");
    if (!isValidPushToken(token)) throw new BadRequestException(PUSH_TOKEN_MESSAGE);
    await this.alerts.registerPushToken(userId, token);
  }

  @Delete("push-token")
  @HttpCode(HttpStatus.NO_CONTENT)
  @SkipThrottle()
  async removePushToken(@CurrentUserId() userId: string, @Body() body: unknown): Promise<void> {
    const token = str(body, "token");
    if (!isValidPushToken(token)) throw new BadRequestException(PUSH_TOKEN_MESSAGE);
    await this.alerts.removePushToken(userId, token);
  }

  @Get("alerts")
  @SkipThrottle()
  list(@CurrentUserId() userId: string) {
    return this.alerts.list(userId);
  }

  @Post("alerts/:id/seen")
  @HttpCode(HttpStatus.NO_CONTENT)
  @SkipThrottle()
  async markSeen(@CurrentUserId() userId: string, @Param("id") id: string): Promise<void> {
    await this.alerts.markSeen(userId, id);
  }
}

import { BadRequestException, Body, Controller, HttpCode, HttpStatus, Inject, Post, UnauthorizedException, UseGuards } from "@nestjs/common";
import type { Pool } from "pg";
import { AccessTokenGuard, CurrentUserId } from "../auth/access-token.guard";
import { PG_POOL } from "../tokens";

@Controller("me")
@UseGuards(AccessTokenGuard)
export class MeController {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  /** NF-01: o app só libera o uso depois dos dois aceites (política e localização aproximada). */
  @Post("consent")
  @HttpCode(HttpStatus.NO_CONTENT)
  async consent(@CurrentUserId() userId: string, @Body() body: unknown): Promise<void> {
    const consent = body as { privacyPolicy?: unknown; approximateLocation?: unknown } | undefined;
    if (consent?.privacyPolicy !== true || consent?.approximateLocation !== true) {
      throw new BadRequestException("É preciso aceitar a política de privacidade e o uso da localização aproximada");
    }
    const { rowCount } = await this.pool.query("update users set consent_at = now() where id = $1", [userId]);
    if (rowCount === 0) throw new UnauthorizedException();
  }
}

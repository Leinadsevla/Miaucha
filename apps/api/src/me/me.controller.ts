import { BadRequestException, Body, Controller, Get, HttpCode, HttpStatus, Inject, Post, UnauthorizedException, UseGuards } from "@nestjs/common";
import type { Pool } from "pg";
import { AccessTokenGuard, CurrentUserId } from "../auth/access-token.guard";
import { PG_POOL } from "../tokens";

@Controller("me")
@UseGuards(AccessTokenGuard)
export class MeController {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  /** Perfil do próprio usuário: nome, pseudônimo público e contadores. Sem e-mail. */
  @Get()
  async profile(@CurrentUserId() userId: string) {
    const { rows } = await this.pool.query<{ id: string; name: string; pseudonym: string; pet_count: number; occurrence_count: number }>(
      `select u.id, u.name, u.pseudonym,
              (select count(*)::int from pets where owner_id = u.id) as pet_count,
              (select count(*)::int from occurrences where author_id = u.id) as occurrence_count
         from users u where u.id = $1`,
      [userId],
    );
    const user = rows[0];
    if (!user) throw new UnauthorizedException();
    return { id: user.id, name: user.name, pseudonym: user.pseudonym, petCount: user.pet_count, occurrenceCount: user.occurrence_count };
  }

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

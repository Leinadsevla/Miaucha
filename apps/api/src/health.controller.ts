import { Controller, Get, Inject, ServiceUnavailableException } from "@nestjs/common";
import type { Pool } from "pg";
import { mailProvider, type AppConfig } from "./config";
import { APP_CONFIG, PG_POOL } from "./tokens";

/**
 * Verificação de saúde do Render (healthCheckPath): sem login, confere que o banco responde.
 * `mail` diz qual provedor de e-mail está ativo (nunca um valor de configuração), para diagnosticar o deploy.
 */
@Controller("health")
export class HealthController {
  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  @Get()
  async check() {
    try {
      await this.pool.query("select 1");
      return { status: "ok", mail: mailProvider(this.config) };
    } catch {
      throw new ServiceUnavailableException("Banco de dados indisponível");
    }
  }
}

import { Controller, Get, Inject, ServiceUnavailableException } from "@nestjs/common";
import type { Pool } from "pg";
import { PG_POOL } from "./tokens";

/** Verificação de saúde do Render (healthCheckPath): sem login, confere que o banco responde. */
@Controller("health")
export class HealthController {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  @Get()
  async check() {
    try {
      await this.pool.query("select 1");
      return { status: "ok" };
    } catch {
      throw new ServiceUnavailableException("Banco de dados indisponível");
    }
  }
}

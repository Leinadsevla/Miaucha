import { PostgreSqlContainer } from "@testcontainers/postgresql";

/** Sobe um PostGIS real uma vez para todos os testes de integração. */
export default async function globalSetup() {
  const container = await new PostgreSqlContainer("postgis/postgis:17-3.5-alpine").start();
  process.env.DATABASE_URL = container.getConnectionUri();
  (globalThis as { __PG__?: unknown }).__PG__ = container;
}

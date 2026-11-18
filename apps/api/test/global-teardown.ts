import type { StartedPostgreSqlContainer } from "@testcontainers/postgresql";

export default async function globalTeardown() {
  await (globalThis as { __PG__?: StartedPostgreSqlContainer }).__PG__?.stop();
}

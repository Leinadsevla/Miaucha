import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import type { Pool } from "pg";

export const MIGRATIONS_DIR = resolve(__dirname, "..", "..", "migrations");

/** Aplica, em ordem, os arquivos .sql de `dir` que ainda não estão em `schema_migrations`. */
export async function runMigrations(pool: Pool, dir = MIGRATIONS_DIR): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    // Impede que duas instâncias (ou dois arquivos de teste) migrem ao mesmo tempo.
    await client.query("select pg_advisory_xact_lock(hashtext('miaucha_migrations'))");
    await client.query(
      "create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())",
    );
    const { rows } = await client.query<{ name: string }>("select name from schema_migrations");
    const applied = new Set(rows.map((r) => r.name));

    const pending = readdirSync(dir)
      .filter((file) => file.endsWith(".sql") && !applied.has(file))
      .sort();
    for (const file of pending) {
      await client.query(readFileSync(join(dir, file), "utf8"));
      await client.query("insert into schema_migrations (name) values ($1)", [file]);
    }
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

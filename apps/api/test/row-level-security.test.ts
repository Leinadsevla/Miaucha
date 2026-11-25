import { Pool } from "pg";
import { runMigrations } from "../src/db/migrate";

/**
 * No Supabase, toda tabela do schema `public` fica exposta pela Data API (PostgREST) para os papéis
 * `anon` e `authenticated`, a menos que tenha RLS ligado. A API conecta como dona das tabelas e não é afetada.
 */
describe("RLS em todas as tabelas (proteção contra a Data API do Supabase)", () => {
  let pool: Pool;

  beforeAll(async () => {
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
    await runMigrations(pool);
  });

  afterAll(() => pool.end());

  it("toda tabela do schema public tem RLS ligado (inclusive as que vierem em migrações futuras)", async () => {
    const { rows } = await pool.query<{ table: string }>(
      `select c.relname as table
         from pg_class c join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity
          and c.relname <> 'spatial_ref_sys'`, // tabela do PostGIS, dona é o superusuário no Supabase
    );
    expect(rows.map((r) => r.table)).toEqual([]);
  });

  it("um papel com SELECT em tudo (como o `anon` do Supabase) não lê nenhum usuário", async () => {
    await pool.query("insert into users (name, pseudonym, email) values ('Ana', 'Tutor Azul 10', $1)", [
      `rls.${Date.now()}@exemplo.com`,
    ]);
    await pool.query("do $$ begin create role fake_anon nologin; exception when duplicate_object then null; end $$");
    await pool.query("grant usage on schema public to fake_anon; grant select on all tables in schema public to fake_anon");

    const client = await pool.connect();
    try {
      await client.query("begin; set local role fake_anon");
      for (const table of ["users", "refresh_tokens", "email_codes"]) {
        const { rows } = await client.query(`select * from ${table}`);
        expect({ table, rows }).toEqual({ table, rows: [] });
      }
    } finally {
      await client.query("rollback");
      client.release();
    }
  });
});

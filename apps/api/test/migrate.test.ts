import { Pool } from "pg";
import { runMigrations } from "../src/db/migrate";

describe("runMigrations", () => {
  let pool: Pool;

  beforeAll(() => {
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
  });

  afterAll(() => pool.end());

  it("cria as tabelas de autenticação e é idempotente", async () => {
    await runMigrations(pool);
    await runMigrations(pool);

    const { rows } = await pool.query<{ table_name: string }>(
      "select table_name from information_schema.tables where table_schema = 'public' order by table_name",
    );
    expect(rows.map((r) => r.table_name)).toEqual(
      expect.arrayContaining(["email_codes", "refresh_tokens", "schema_migrations", "users"]),
    );

    const applied = await pool.query("select name from schema_migrations order by name");
    expect(applied.rows.map((r) => r.name)).toEqual(["001_auth.sql", "002_row_level_security.sql", "003_pets.sql"]);
  });

  it("ativa o PostGIS (necessário a partir da S2)", async () => {
    await runMigrations(pool);
    const { rows } = await pool.query("select extname from pg_extension where extname = 'postgis'");
    expect(rows).toHaveLength(1);
  });

  it("não aceita dois usuários com o mesmo e-mail, ignorando maiúsculas", async () => {
    await runMigrations(pool);
    const insert = "insert into users (name, pseudonym, email) values ('Ana', 'Tutor Azul 10', $1)";
    await pool.query(insert, ["dup@exemplo.com"]);
    await expect(pool.query(insert, ["DUP@exemplo.com"])).rejects.toThrow(/duplicate key/);
  });
});

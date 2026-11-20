import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { Pool } from "pg";
import { AppModule, configureApp } from "./app.module";
import { loadConfig } from "./config";
import { runMigrations } from "./db/migrate";

async function bootstrap() {
  const config = loadConfig(process.env);

  const pool = new Pool({ connectionString: config.databaseUrl });
  await runMigrations(pool);
  await pool.end();

  const app = configureApp(await NestFactory.create(AppModule.forRoot(config)));
  await app.listen(config.port);
}

void bootstrap();

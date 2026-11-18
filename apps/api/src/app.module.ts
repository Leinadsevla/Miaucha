import { type DynamicModule, type INestApplication, Inject, Module, type OnApplicationShutdown } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { ThrottlerModule } from "@nestjs/throttler";
import { Pool } from "pg";
import { AccessTokenGuard } from "./auth/access-token.guard";
import { AuthController } from "./auth/auth.controller";
import { AuthService } from "./auth/auth.service";
import { GoogleAuthLibraryVerifier } from "./auth/google-verifier";
import type { AppConfig } from "./config";
import { ConsoleMailer } from "./mail/mailer";
import { MeController } from "./me/me.controller";
import { APP_CONFIG, GOOGLE_VERIFIER, MAILER, PG_POOL } from "./tokens";

@Module({})
export class AppModule implements OnApplicationShutdown {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  static forRoot(config: AppConfig): DynamicModule {
    return {
      module: AppModule,
      imports: [
        JwtModule.register({ secret: config.jwtSecret }),
        ThrottlerModule.forRoot({
          throttlers: [{ ttl: config.throttle.ttlMs, limit: config.throttle.limit }],
          errorMessage: "Muitas tentativas. Espere um pouco e tente de novo.",
        }),
      ],
      controllers: [AuthController, MeController],
      providers: [
        AuthService,
        AccessTokenGuard,
        { provide: APP_CONFIG, useValue: config },
        { provide: PG_POOL, useFactory: () => new Pool({ connectionString: config.databaseUrl }) },
        { provide: MAILER, useClass: ConsoleMailer },
        { provide: GOOGLE_VERIFIER, useFactory: () => new GoogleAuthLibraryVerifier(config.googleClientIds) },
      ],
    };
  }

  async onApplicationShutdown() {
    await this.pool.end();
  }
}

/** Configuração comum ao main.ts e aos testes. */
export function configureApp<T extends INestApplication>(app: T): T {
  app.enableShutdownHooks();
  return app;
}

import { type DynamicModule, type INestApplication, Inject, Module, type OnApplicationShutdown } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { ThrottlerModule } from "@nestjs/throttler";
import { Pool } from "pg";
import { InProcessAlertQueue } from "./alerts/alert-queue";
import { AlertsController } from "./alerts/alerts.controller";
import { AlertsService } from "./alerts/alerts.service";
import { ExpoPushSender } from "./alerts/push-sender";
import { AccessTokenGuard } from "./auth/access-token.guard";
import { AuthController } from "./auth/auth.controller";
import { AuthService } from "./auth/auth.service";
import { GoogleAuthLibraryVerifier } from "./auth/google-verifier";
import { ChatController } from "./chat/chat.controller";
import { ChatGateway } from "./chat/chat.gateway";
import { ChatService } from "./chat/chat.service";
import { ChatThrottlerGuard } from "./chat/chat-throttler.guard";
import { CHAT_PUSH_SENDER, LogChatPushSender } from "./chat/push-sender";
import type { AppConfig } from "./config";
import { ConsoleMailer } from "./mail/mailer";
import { MeController } from "./me/me.controller";
import { OccurrencesController } from "./occurrences/occurrences.controller";
import { OccurrencesService } from "./occurrences/occurrences.service";
import { PetsController } from "./pets/pets.controller";
import { PetsService } from "./pets/pets.service";
import { S3PhotoStorage } from "./storage/s3-photo-storage";
import { ALERT_QUEUE, APP_CONFIG, GOOGLE_VERIFIER, MAILER, PG_POOL, PHOTO_STORAGE, PUSH_SENDER } from "./tokens";

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
      controllers: [AuthController, MeController, PetsController, OccurrencesController, ChatController, AlertsController],
      providers: [
        AuthService,
        AccessTokenGuard,
        PetsService,
        OccurrencesService,
        ChatService,
        ChatGateway,
        ChatThrottlerGuard,
        { provide: CHAT_PUSH_SENDER, useClass: LogChatPushSender },
        { provide: PHOTO_STORAGE, useFactory: () => new S3PhotoStorage(config.storage) },
        { provide: APP_CONFIG, useValue: config },
        { provide: PG_POOL, useFactory: () => new Pool({ connectionString: config.databaseUrl }) },
        { provide: MAILER, useClass: ConsoleMailer },
        { provide: GOOGLE_VERIFIER, useFactory: () => new GoogleAuthLibraryVerifier(config.googleClientIds) },
        AlertsService,
        InProcessAlertQueue,
        { provide: ALERT_QUEUE, useExisting: InProcessAlertQueue },
        { provide: PUSH_SENDER, useFactory: () => new ExpoPushSender({ accessToken: config.expoAccessToken }) },
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

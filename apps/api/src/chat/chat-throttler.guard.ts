import { type ExecutionContext, Inject, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import {
  InjectThrottlerOptions,
  InjectThrottlerStorage,
  ThrottlerGuard,
  type ThrottlerModuleOptions,
  type ThrottlerStorage,
} from "@nestjs/throttler";
import { DEFAULT_CHAT_THROTTLE, type AppConfig } from "../config";
import { APP_CONFIG } from "../tokens";

/**
 * Rate limit do envio de mensagens (NF-04): por usuário, não por IP (várias pessoas atrás do mesmo NAT
 * conversando não se atrapalham), e com limite próprio (`chatThrottle`), maior que o das rotas de criação.
 * Precisa vir depois do AccessTokenGuard, que preenche `userId`.
 */
@Injectable()
export class ChatThrottlerGuard extends ThrottlerGuard {
  constructor(
    @InjectThrottlerOptions() options: ThrottlerModuleOptions,
    @InjectThrottlerStorage() storage: ThrottlerStorage,
    reflector: Reflector,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {
    super(options, storage, reflector);
  }

  /**
   * Não passa pelo `canActivate` do ThrottlerGuard: a rota usa @SkipThrottle() para sair do limite geral,
   * e esse mesmo metadado faria este guard ser pulado.
   */
  override async canActivate(context: ExecutionContext): Promise<boolean> {
    if (!this.throttlers) await this.onModuleInit();
    const { ttlMs, limit } = this.config.chatThrottle ?? DEFAULT_CHAT_THROTTLE;
    return this.handleRequest({
      context,
      limit,
      ttl: ttlMs,
      blockDuration: ttlMs,
      throttler: { name: "chat", limit, ttl: ttlMs },
      getTracker: (req: Record<string, unknown>) => (typeof req.userId === "string" ? `user:${req.userId}` : String(req.ip)),
      generateKey: (ctx, tracker, name) => this.generateKey(ctx, tracker, name),
    });
  }
}

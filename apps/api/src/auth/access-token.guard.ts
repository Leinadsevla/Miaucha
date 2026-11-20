import { type CanActivate, createParamDecorator, type ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";

type AuthedRequest = { headers: Record<string, string | undefined>; userId?: string };

/** Exige `Authorization: Bearer <access token>` válido e expõe o id do usuário via @CurrentUserId(). */
@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthedRequest>();
    const [scheme, token] = (request.headers.authorization ?? "").split(" ");
    if (scheme !== "Bearer" || !token) throw new UnauthorizedException();
    try {
      const payload = await this.jwt.verifyAsync<{ sub?: unknown }>(token, { algorithms: ["HS256"] });
      if (typeof payload.sub !== "string") throw new Error("sub ausente");
      request.userId = payload.sub;
      return true;
    } catch {
      throw new UnauthorizedException();
    }
  }
}

export const CurrentUserId = createParamDecorator(
  (_data: unknown, context: ExecutionContext) => context.switchToHttp().getRequest<AuthedRequest>().userId!,
);

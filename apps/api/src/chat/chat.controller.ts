import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Query, UseGuards } from "@nestjs/common";
import { SkipThrottle, ThrottlerGuard } from "@nestjs/throttler";
import { AccessTokenGuard, CurrentUserId } from "../auth/access-token.guard";
import { str } from "../auth/body";
import { ChatThrottlerGuard } from "./chat-throttler.guard";
import { ChatService } from "./chat.service";

/**
 * Chat interno (S4). Todas as rotas exigem login; quem não participa da conversa recebe 404.
 * Mensagens têm limite próprio, por usuário (ChatThrottlerGuard); abrir conversa, fotos e denúncia usam o
 * limite geral (NF-04); leituras e ações de estado não têm limite.
 */
@Controller("conversations")
@UseGuards(AccessTokenGuard, ThrottlerGuard)
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  start(@CurrentUserId() userId: string, @Body() body: unknown) {
    return this.chat.start(userId, str(body, "occurrenceId"));
  }

  @Get()
  @SkipThrottle()
  list(@CurrentUserId() userId: string) {
    return this.chat.list(userId);
  }

  @Get(":id")
  @SkipThrottle()
  get(@CurrentUserId() userId: string, @Param("id") id: string) {
    return this.chat.view(userId, id);
  }

  @Get(":id/messages")
  @SkipThrottle()
  messages(@CurrentUserId() userId: string, @Param("id") id: string, @Query() query: Record<string, unknown>) {
    return this.chat.messages(userId, id, query);
  }

  @Post(":id/messages")
  @SkipThrottle()
  @UseGuards(ChatThrottlerGuard)
  send(@CurrentUserId() userId: string, @Param("id") id: string, @Body() body: unknown) {
    return this.chat.send(userId, id, body);
  }

  @Post(":id/read")
  @SkipThrottle()
  @HttpCode(HttpStatus.NO_CONTENT)
  read(@CurrentUserId() userId: string, @Param("id") id: string) {
    return this.chat.markRead(userId, id);
  }

  @Post(":id/photos")
  requestUpload(@CurrentUserId() userId: string, @Param("id") id: string, @Body() body: unknown) {
    return this.chat.requestUpload(userId, id, str(body, "contentType"));
  }

  @Post(":id/photos/:photoId/confirm")
  @HttpCode(HttpStatus.OK)
  confirm(@CurrentUserId() userId: string, @Param("id") id: string, @Param("photoId") photoId: string) {
    return this.chat.confirmUpload(userId, id, photoId);
  }

  @Post(":id/contact-consent")
  @SkipThrottle()
  @HttpCode(HttpStatus.OK)
  consent(@CurrentUserId() userId: string, @Param("id") id: string) {
    return this.chat.setContactConsent(userId, id, true);
  }

  @Delete(":id/contact-consent")
  @SkipThrottle()
  revokeConsent(@CurrentUserId() userId: string, @Param("id") id: string) {
    return this.chat.setContactConsent(userId, id, false);
  }

  @Post(":id/block")
  @SkipThrottle()
  @HttpCode(HttpStatus.OK)
  block(@CurrentUserId() userId: string, @Param("id") id: string) {
    return this.chat.setBlocked(userId, id, true);
  }

  @Delete(":id/block")
  @SkipThrottle()
  unblock(@CurrentUserId() userId: string, @Param("id") id: string) {
    return this.chat.setBlocked(userId, id, false);
  }

  @Post(":id/report")
  @HttpCode(HttpStatus.NO_CONTENT)
  report(@CurrentUserId() userId: string, @Param("id") id: string, @Body() body: unknown) {
    return this.chat.report(userId, id, body);
  }
}

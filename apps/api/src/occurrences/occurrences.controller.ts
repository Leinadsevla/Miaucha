import { BadRequestException, Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query, UseGuards } from "@nestjs/common";
import { SkipThrottle, ThrottlerGuard } from "@nestjs/throttler";
import type { OccurrenceType, Species } from "@miaucha/shared";
import { AccessTokenGuard, CurrentUserId } from "../auth/access-token.guard";
import { num, str } from "../auth/body";
import { OccurrencesService } from "./occurrences.service";
import { parseOccurrenceSearch } from "./search-params";

/** Todas exigem login. Criação, fotos e resolução com rate limit (NF-04); leitura sem limite. */
@Controller()
@UseGuards(AccessTokenGuard, ThrottlerGuard)
export class OccurrencesController {
  constructor(private readonly occurrences: OccurrencesService) {}

  @Post("occurrences")
  create(@CurrentUserId() userId: string, @Body() body: unknown) {
    return this.occurrences.create(userId, {
      type: str(body, "type") as OccurrenceType,
      species: str(body, "species") as Species,
      petName: str(body, "petName"),
      breed: str(body, "breed"),
      color: str(body, "color"),
      description: str(body, "description"),
      approxAddress: str(body, "approxAddress"),
      lat: num(body, "lat"),
      lng: num(body, "lng"),
      petId: str(body, "petId") || undefined,
      sightingOf: str(body, "sightingOf") || undefined,
    });
  }

  @Get("occurrences")
  @SkipThrottle()
  search(@CurrentUserId() userId: string, @Query() query: Record<string, unknown>) {
    const parsed = parseOccurrenceSearch(query);
    if ("error" in parsed) throw new BadRequestException(parsed.error);
    return this.occurrences.search(userId, parsed);
  }

  @Get("me/occurrences")
  @SkipThrottle()
  listMine(@CurrentUserId() userId: string) {
    return this.occurrences.listMine(userId);
  }

  @Get("occurrences/:id")
  @SkipThrottle()
  findOne(@CurrentUserId() userId: string, @Param("id") id: string) {
    return this.occurrences.findPublic(userId, id);
  }

  @Post("occurrences/:id/resolve")
  @HttpCode(HttpStatus.OK)
  resolve(@CurrentUserId() userId: string, @Param("id") id: string) {
    return this.occurrences.resolve(userId, id);
  }

  @Post("occurrences/:id/photos")
  requestUpload(@CurrentUserId() userId: string, @Param("id") id: string, @Body() body: unknown) {
    return this.occurrences.requestUpload(userId, id, str(body, "contentType"));
  }

  @Post("occurrences/:id/photos/:photoId/confirm")
  @HttpCode(HttpStatus.OK)
  confirm(@CurrentUserId() userId: string, @Param("id") id: string, @Param("photoId") photoId: string) {
    return this.occurrences.confirmUpload(userId, id, photoId);
  }
}

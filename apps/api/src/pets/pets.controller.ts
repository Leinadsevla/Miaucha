import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { SkipThrottle, ThrottlerGuard } from "@nestjs/throttler";
import type { PetInput, Species } from "@miaucha/shared";
import { AccessTokenGuard, CurrentUserId } from "../auth/access-token.guard";
import { str } from "../auth/body";
import { PetsService } from "./pets.service";

function petInput(body: unknown): PetInput {
  return {
    name: str(body, "name"),
    species: str(body, "species") as Species,
    breed: str(body, "breed"),
    color: str(body, "color"),
    approxAge: str(body, "approxAge"),
  };
}

/** Rotas de criação com rate limit (NF-04); leitura sem limite. */
@Controller()
@UseGuards(AccessTokenGuard, ThrottlerGuard)
export class PetsController {
  constructor(private readonly pets: PetsService) {}

  @Post("pets")
  create(@CurrentUserId() userId: string, @Body() body: unknown) {
    return this.pets.create(userId, petInput(body));
  }

  @Get("me/pets")
  @SkipThrottle()
  listMine(@CurrentUserId() userId: string) {
    return this.pets.listMine(userId);
  }

  @Get("pets/:petId")
  @SkipThrottle()
  findMine(@CurrentUserId() userId: string, @Param("petId") petId: string) {
    return this.pets.findMine(userId, petId);
  }

  @Patch("pets/:petId")
  update(@CurrentUserId() userId: string, @Param("petId") petId: string, @Body() body: unknown) {
    return this.pets.update(userId, petId, petInput(body));
  }

  @Delete("pets/:petId/photos/:photoId")
  @HttpCode(HttpStatus.NO_CONTENT)
  async removePhoto(@CurrentUserId() userId: string, @Param("petId") petId: string, @Param("photoId") photoId: string) {
    await this.pets.removePhoto(userId, petId, photoId);
  }

  @Post("pets/:petId/photos")
  requestUpload(@CurrentUserId() userId: string, @Param("petId") petId: string, @Body() body: unknown) {
    return this.pets.requestUpload(userId, petId, str(body, "contentType"));
  }

  @Post("pets/:petId/photos/:photoId/confirm")
  @HttpCode(HttpStatus.OK)
  confirm(@CurrentUserId() userId: string, @Param("petId") petId: string, @Param("photoId") photoId: string) {
    return this.pets.confirmUpload(userId, petId, photoId);
  }
}

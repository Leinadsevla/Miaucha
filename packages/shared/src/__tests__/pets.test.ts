import { MAX_PET_PHOTOS, MAX_PHOTO_BYTES, PHOTO_CONTENT_TYPES, isAllowedPhotoType, validatePet } from "../pets";

describe("validatePet", () => {
  const valid = { name: "Thor", species: "dog" as const, breed: "", color: "", approxAge: "" };

  it("aceita só nome e espécie (o resto é opcional)", () => {
    expect(validatePet(valid)).toEqual({});
  });

  it("exige nome e espécie válida", () => {
    expect(validatePet({ ...valid, name: "  ", species: "hamster" as never })).toEqual({
      name: "Informe o nome do pet",
      species: "Escolha cão ou gato",
    });
  });

  it("limita o tamanho dos textos", () => {
    const long = "a".repeat(61);
    expect(validatePet({ ...valid, name: "a".repeat(41), breed: long, color: long, approxAge: long })).toEqual({
      name: "Use até 40 caracteres",
      breed: "Use até 60 caracteres",
      color: "Use até 60 caracteres",
      approxAge: "Use até 60 caracteres",
    });
  });
});

describe("regras de foto", () => {
  it("aceita JPG, PNG e WebP, até 10 MB e 5 fotos por pet", () => {
    expect(PHOTO_CONTENT_TYPES).toEqual(["image/jpeg", "image/png", "image/webp"]);
    expect(MAX_PHOTO_BYTES).toBe(10 * 1024 * 1024);
    expect(MAX_PET_PHOTOS).toBe(5);
  });

  it("isAllowedPhotoType", () => {
    expect(isAllowedPhotoType("image/png")).toBe(true);
    expect(isAllowedPhotoType("image/gif")).toBe(false);
    expect(isAllowedPhotoType("text/html")).toBe(false);
  });
});

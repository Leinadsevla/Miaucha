import { checkPhoto, photoContentType } from "../photos";

describe("photoContentType", () => {
  it("usa o mimeType do picker quando é aceito", () => {
    expect(photoContentType({ uri: "file:///a", mimeType: "image/png" })).toBe("image/png");
  });

  it("sem mimeType, deduz pela extensão", () => {
    expect(photoContentType({ uri: "file:///x/IMG_1.JPG" })).toBe("image/jpeg");
    expect(photoContentType({ uri: "file:///x/a.jpeg", mimeType: null })).toBe("image/jpeg");
    expect(photoContentType({ uri: "file:///x/a.webp" })).toBe("image/webp");
  });

  it("formatos não aceitos (HEIC, GIF) → null", () => {
    expect(photoContentType({ uri: "file:///x/IMG.HEIC", mimeType: "image/heic" })).toBeNull();
    expect(photoContentType({ uri: "file:///x/a.gif" })).toBeNull();
  });
});

describe("checkPhoto", () => {
  it("aceita foto válida, mesmo sem fileSize (o servidor confere)", () => {
    expect(checkPhoto({ uri: "file:///a.jpg", fileSize: 1000 })).toBeNull();
    expect(checkPhoto({ uri: "file:///a.jpg" })).toBeNull();
  });

  it("recusa tipo não aceito e foto acima de 10 MB", () => {
    expect(checkPhoto({ uri: "file:///a.heic" })).toBe("Envie uma foto JPG, PNG ou WebP");
    expect(checkPhoto({ uri: "file:///a.jpg", fileSize: 10 * 1024 * 1024 + 1 })).toBe("A foto passa de 10 MB");
  });
});

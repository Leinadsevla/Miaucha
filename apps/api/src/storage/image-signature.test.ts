import { detectImageType } from "./image-signature";

const bytes = (...b: number[]) => new Uint8Array(b);
const ascii = (s: string) => new TextEncoder().encode(s);

describe("detectImageType", () => {
  it("reconhece JPEG, PNG e WebP pela assinatura", () => {
    expect(detectImageType(bytes(0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0))).toBe("image/jpeg");
    expect(detectImageType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0))).toBe("image/png");
    expect(detectImageType(new Uint8Array([...ascii("RIFF"), 1, 2, 3, 4, ...ascii("WEBP")]))).toBe("image/webp");
  });

  it("texto, HTML, HEIC ou arquivo curto → null", () => {
    expect(detectImageType(ascii("File not found"))).toBeNull(); // o bug visto no Expo Go
    expect(detectImageType(ascii("<html><body>"))).toBeNull();
    expect(detectImageType(new Uint8Array([0, 0, 0, 0x18, ...ascii("ftypheic")]))).toBeNull();
    expect(detectImageType(bytes(0xff, 0xd8))).toBeNull();
    expect(detectImageType(new Uint8Array())).toBeNull();
  });
});

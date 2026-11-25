import { S3PhotoStorage } from "../src/storage/s3-photo-storage";
import { storageConfigFromEnv } from "./helpers";

/** Adaptador S3 contra um storage S3 real (RustFS). O mesmo código fala com o Supabase Storage (protocolo S3). */
describe("S3PhotoStorage", () => {
  const config = storageConfigFromEnv();
  const storage = new S3PhotoStorage(config);
  const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4]);
  const key = () => `teste/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;

  async function upload(k: string) {
    const url = await storage.presignUpload(k, "image/jpeg", 300);
    const res = await fetch(url, { method: "PUT", body: jpeg, headers: { "Content-Type": "image/jpeg" } });
    expect(res.status).toBe(200);
  }

  it("a URL de upload aceita PUT direto do aparelho, sem credenciais", async () => {
    const k = key();
    await upload(k);
    expect(await storage.stat(k)).toEqual({ size: jpeg.length, contentType: "image/jpeg" });
  });

  it("a URL de upload não aceita outro tipo de arquivo", async () => {
    const url = await storage.presignUpload(key(), "image/jpeg", 300);
    const res = await fetch(url, { method: "PUT", body: "<html>", headers: { "Content-Type": "text/html" } });
    expect(res.status).toBe(403);
  });

  it("a URL de leitura é assinada, expira e devolve a foto", async () => {
    const k = key();
    await upload(k);
    const url = await storage.presignDownload(k, 3600);

    expect(new URL(url).searchParams.get("X-Amz-Signature")).toBeTruthy();
    expect(new URL(url).searchParams.get("X-Amz-Expires")).toBe("3600");
    const res = await fetch(url);
    expect(res.status).toBe(200);
    expect(Buffer.from(await res.arrayBuffer())).toEqual(jpeg);
  });

  it("NF-05: a foto não é acessível sem assinatura (bucket privado)", async () => {
    const k = key();
    await upload(k);
    const res = await fetch(`${config.endpoint}/${config.bucket}/${k}`);
    expect(res.status).toBe(403);
  });

  it("copy duplica o arquivo em outra chave", async () => {
    const from = key();
    const to = key();
    await upload(from);
    await storage.copy(from, to);
    expect(await storage.stat(to)).toEqual({ size: jpeg.length, contentType: "image/jpeg" });
    expect(Buffer.from(await storage.readHead(to, jpeg.length))).toEqual(jpeg);
  });

  it("stat de arquivo inexistente → null; delete apaga", async () => {
    const k = key();
    expect(await storage.stat(k)).toBeNull();
    await upload(k);
    await storage.delete(k);
    expect(await storage.stat(k)).toBeNull();
  });
});

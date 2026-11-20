import { createFileUploader, type StartUpload } from "../fileUploader";

describe("createFileUploader", () => {
  it("envia o arquivo local com PUT e o Content-Type assinado", async () => {
    const start = jest.fn<ReturnType<StartUpload>, Parameters<StartUpload>>(async () => ({ status: 200, body: "" }));
    await createFileUploader(start)("https://storage/assinada", { uri: "file:///cache/foto.jpg" }, "image/jpeg");
    expect(start).toHaveBeenCalledWith("file:///cache/foto.jpg", "https://storage/assinada", {
      httpMethod: "PUT",
      headers: { "Content-Type": "image/jpeg" },
    });
  });

  it("status de erro do storage → falha com mensagem (não engole o erro)", async () => {
    const upload = createFileUploader(async () => ({ status: 403, body: "<Error>SignatureDoesNotMatch</Error>" }));
    await expect(upload("u", { uri: "file:///a.jpg" }, "image/jpeg")).rejects.toThrow("Não foi possível enviar a foto. Tente de novo.");
  });

  it("arquivo local ilegível ou sem rede → falha com mensagem", async () => {
    const upload = createFileUploader(async () => {
      throw new Error("File not found");
    });
    await expect(upload("u", { uri: "file:///sumiu.jpg" }, "image/jpeg")).rejects.toThrow("Não foi possível enviar a foto. Tente de novo.");
  });
});

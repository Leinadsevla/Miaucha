import { createPhotoPicker, type LaunchLibrary } from "../pickPhotos";

describe("createPhotoPicker", () => {
  it("abre a galeria só com imagens, seleção múltipla limitada às vagas e compressão", async () => {
    const launch = jest.fn<ReturnType<LaunchLibrary>, Parameters<LaunchLibrary>>(async () => ({
      canceled: false,
      assets: [{ uri: "file:///a.jpg", mimeType: "image/jpeg", fileSize: 1234, width: 10, height: 10 }],
    }));
    const pick = createPhotoPicker(launch);

    expect(await pick(3)).toEqual([{ uri: "file:///a.jpg", mimeType: "image/jpeg", fileSize: 1234 }]);
    expect(launch).toHaveBeenCalledWith({ mediaTypes: ["images"], allowsMultipleSelection: true, selectionLimit: 3, quality: 0.7 });
  });

  it("cancelado ou sem vagas → nenhuma foto", async () => {
    const launch = jest.fn<ReturnType<LaunchLibrary>, Parameters<LaunchLibrary>>(async () => ({ canceled: true, assets: null }));
    const pick = createPhotoPicker(launch);
    expect(await pick(2)).toEqual([]);
    expect(await pick(0)).toEqual([]);
    expect(launch).toHaveBeenCalledTimes(1);
  });
});

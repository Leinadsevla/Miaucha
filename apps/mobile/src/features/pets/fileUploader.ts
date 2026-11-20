import { File, UploadTask } from "expo-file-system";
import type { PickedPhoto } from "./photos";
import type { Uploader } from "./petsClient";

type UploadOptions = { httpMethod: "PUT"; headers: Record<string, string> };

/** Envia o arquivo local para a URL; resolve com o status HTTP mesmo quando não é 2xx. Injetável nos testes. */
export type StartUpload = (fileUri: string, url: string, options: UploadOptions) => Promise<{ status: number; body: string }>;

/**
 * Upload nativo do expo-file-system: lê o arquivo direto do disco. Não use `fetch(uri).blob()`:
 * no SDK 58 ele não lê `file://` e devolveu o texto "File not found", que foi enviado no lugar da foto.
 */
const nativeUpload: StartUpload = async (fileUri, url, options) => {
  const task = new UploadTask(new File(fileUri), url, options);
  try {
    return await task.uploadAsync();
  } finally {
    task.release();
  }
};

const FAILED = "Não foi possível enviar a foto. Tente de novo.";

export function createFileUploader(start: StartUpload = nativeUpload): Uploader {
  return async (uploadUrl: string, photo: PickedPhoto, contentType: string) => {
    let result: { status: number };
    try {
      result = await start(photo.uri, uploadUrl, { httpMethod: "PUT", headers: { "Content-Type": contentType } });
    } catch {
      throw new Error(FAILED);
    }
    if (result.status < 200 || result.status >= 300) throw new Error(FAILED);
  };
}

export type StoredObject = { size: number; contentType: string };

/** Fotos ficam num bucket privado; o app só as vê por URL assinada e com prazo (NF-05). */
export interface PhotoStorage {
  /** URL para o aparelho enviar a foto com PUT, sem passar pela API. Só aceita o Content-Type assinado. */
  presignUpload(key: string, contentType: string, ttlSeconds: number): Promise<string>;
  presignDownload(key: string, ttlSeconds: number): Promise<string>;
  /** Tamanho e tipo do arquivo enviado, ou null se ainda não existe. */
  stat(key: string): Promise<StoredObject | null>;
  delete(key: string): Promise<void>;
}

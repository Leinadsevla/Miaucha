export type StoredObject = { size: number; contentType: string };

/** Fotos ficam num bucket privado; o app só as vê por URL assinada e com prazo (NF-05). */
export interface PhotoStorage {
  /** URL para o aparelho enviar a foto com PUT, sem passar pela API. Só aceita o Content-Type assinado. */
  presignUpload(key: string, contentType: string, ttlSeconds: number): Promise<string>;
  presignDownload(key: string, ttlSeconds: number): Promise<string>;
  /** Tamanho e tipo do arquivo enviado, ou null se ainda não existe. */
  stat(key: string): Promise<StoredObject | null>;
  /** Primeiros `bytes` do arquivo (para conferir a assinatura do formato). */
  readHead(key: string, bytes: number): Promise<Uint8Array>;
  /** Copia o arquivo para outra chave, dentro do próprio storage. */
  copy(fromKey: string, toKey: string): Promise<void>;
  delete(key: string): Promise<void>;
}

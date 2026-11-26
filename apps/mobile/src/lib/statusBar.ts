/** Detalhe de ocorrência e de pet (foto no topo), mas não as telas de criar e editar. */
const PHOTO_ON_TOP = /^\/(occurrences|pets)\/(?!new$)[^/]+$/;

/** Ícones da barra de status: claros só onde há foto no topo. Todas as outras telas têm topo branco. */
export function statusBarStyleFor(pathname: string): "light" | "dark" {
  return PHOTO_ON_TOP.test(pathname) ? "light" : "dark";
}

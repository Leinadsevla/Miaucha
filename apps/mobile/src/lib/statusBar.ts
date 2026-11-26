/** Telas com fundo laranja ou foto no topo: ícones da barra de status claros. As demais têm topo branco. */
const LIGHT_EXACT = ["/splash", "/login", "/forgot-password", "/verify-email", "/consent", "/welcome", "/", "/profile"];
/** Detalhe de ocorrência e de pet (foto no topo), mas não as telas de criar e editar. */
const LIGHT_DETAIL = /^\/(occurrences|pets)\/(?!new$)[^/]+$/;

export function statusBarStyleFor(pathname: string): "light" | "dark" {
  return LIGHT_EXACT.includes(pathname) || LIGHT_DETAIL.test(pathname) ? "light" : "dark";
}

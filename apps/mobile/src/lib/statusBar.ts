/** Detalhe de ocorrência e de pet (foto no topo), mas não as telas de criar e editar. */
const PHOTO_ON_TOP = /^\/(occurrences|pets)\/(?!new$)[^/]+$/;
/** Telas com a faixa laranja da marca no topo: abas (TabHeader e Perfil) e telas de entrada (AuthScreenLayout). */
const BRAND_ON_TOP = new Set(["/", "/alerts", "/chat", "/profile", "/login", "/forgot-password", "/verify-email", "/consent"]);

/** Ícones da barra de status: claros sobre foto ou sobre a faixa laranja; escuros nas telas de topo branco. */
export function statusBarStyleFor(pathname: string): "light" | "dark" {
  return PHOTO_ON_TOP.test(pathname) || BRAND_ON_TOP.has(pathname) ? "light" : "dark";
}

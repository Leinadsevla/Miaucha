import type { routeFor } from "./session";

type Target = ReturnType<typeof routeFor>;

/** Telas de quem ainda não entrou: depois de entrar, levam ao app. */
const ENTRY_ROUTES = ["/splash", "/login", "/verify-email", "/consent", "/forgot-password"];
/** Telas que quem saiu pode abrir sem ser mandado para o login. */
const PUBLIC_ROUTES = ["/privacy", "/forgot-password"];

/** Para onde redirecionar a partir de `pathname`, ou null se a tela atual é permitida. */
export function redirectTarget(pathname: string, target: Target): Target | null {
  if (target === "/") {
    return ENTRY_ROUTES.includes(pathname) ? "/" : null;
  }
  if (pathname === target) return null;
  if (target !== "/splash" && PUBLIC_ROUTES.includes(pathname)) return null;
  return target;
}

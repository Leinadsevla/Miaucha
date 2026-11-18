import type { routeFor } from "./session";

type Target = ReturnType<typeof routeFor>;

const ENTRY_ROUTES = ["/splash", "/login", "/verify-email", "/consent"];
const PUBLIC_ROUTES = ["/privacy"];

/** Para onde redirecionar a partir de `pathname`, ou null se a tela atual é permitida. */
export function redirectTarget(pathname: string, target: Target): Target | null {
  if (target === "/") {
    return ENTRY_ROUTES.includes(pathname) ? "/" : null;
  }
  if (pathname === target) return null;
  if (target !== "/splash" && PUBLIC_ROUTES.includes(pathname)) return null;
  return target;
}

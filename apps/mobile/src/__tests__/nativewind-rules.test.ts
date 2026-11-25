// Sem @types/node no app (é React Native): só o mínimo do `fs`, carregado pelo Jest.
type Fs = {
  readdirSync(path: string): string[];
  readFileSync(path: string, encoding: "utf8"): string;
  statSync(path: string): { isDirectory(): boolean };
};
const { readdirSync, readFileSync, statSync } = jest.requireActual<Fs>("fs");
const join = (...parts: string[]) => parts.join("/");

/**
 * NativeWind 4: utilitários que usam variáveis CSS (shadow, ring, transform, gradiente...) não podem
 * aparecer só depois da primeira renderização. O componente é "promovido", o aviso de dev tenta
 * serializar as props e, dentro do Expo Router, quebra com "Couldn't find a LinkingContext context".
 * Use a classe sempre (ex.: `shadow-none` ↔ `shadow-sm`) em vez de adicioná-la num condicional.
 */
const CSS_VARIABLE_UTILITY = /(^|\s)!?-?(shadow|ring|translate-|rotate-|scale-|skew-|from-|via-|to-|blur|space-[xy]-|divide-)/;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === "__tests__" ? [] : sourceFiles(path);
    return path.endsWith(".tsx") ? [path] : [];
  });
}

/** Strings que só entram no className quando uma condição é verdadeira: `cond && "..."`, `cond ? "..." : "..."`. */
function conditionalClassStrings(source: string): string[] {
  const found: string[] = [];
  for (const match of source.matchAll(/(?:&&|\?|:)\s*"([^"]*)"/g)) found.push(match[1]);
  return found;
}

describe("regras do NativeWind", () => {
  // Pasta `src`, a partir do caminho deste teste (funciona com \\ no Windows).
  const root = expect.getState().testPath!.replace(/[\\/]__tests__[\\/][^\\/]+$/, "");

  it.each(sourceFiles(root).map((f) => [f.slice(root.length + 1), f]))(
    "%s não adiciona utilitários com variável CSS de forma condicional",
    (_name, file) => {
      const offending = conditionalClassStrings(readFileSync(file, "utf8")).filter((cls) =>
        cls.split(/\s+/).some((token) => CSS_VARIABLE_UTILITY.test(` ${token}`)),
      );
      expect(offending).toEqual([]);
    },
  );
});

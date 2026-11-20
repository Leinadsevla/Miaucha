import { generateEmailCode, generatePseudonym, generateRefreshToken, hashEmailCode, hashRefreshToken, PSEUDONYM_COLORS, PSEUDONYM_NOUNS } from "./secrets";

describe("generatePseudonym", () => {
  it("monta substantivo + cor + número de 2 dígitos a partir do sorteio", () => {
    const picks = [0, 1, 42];
    const pick = (max: number) => {
      const n = picks.shift()!;
      expect(n).toBeLessThan(max);
      return n;
    };
    expect(generatePseudonym(pick)).toBe(`${PSEUDONYM_NOUNS[0]} ${PSEUDONYM_COLORS[1]} 52`);
  });

  it("gera nomes no formato 'Tutor Laranja 42' com o sorteio real", () => {
    for (let i = 0; i < 50; i++) {
      expect(generatePseudonym()).toMatch(/^\p{Lu}\p{Ll}+ \p{Lu}\p{Ll}+ [1-9]\d$/u);
    }
  });
});

describe("generateEmailCode", () => {
  it("completa com zeros à esquerda até 6 dígitos", () => {
    expect(generateEmailCode(() => 42)).toBe("000042");
  });

  it("gera 6 dígitos com o sorteio real", () => {
    expect(generateEmailCode()).toMatch(/^\d{6}$/);
  });
});

describe("hashEmailCode", () => {
  const secret = "s".repeat(32);

  it("é determinístico e não contém o código em claro", () => {
    const hash = hashEmailCode(secret, "ana@exemplo.com", "123456");
    expect(hash).toBe(hashEmailCode(secret, "ana@exemplo.com", "123456"));
    expect(hash).not.toContain("123456");
  });

  it("muda com o e-mail, o código ou o segredo", () => {
    const hash = hashEmailCode(secret, "ana@exemplo.com", "123456");
    expect(hashEmailCode(secret, "bia@exemplo.com", "123456")).not.toBe(hash);
    expect(hashEmailCode(secret, "ana@exemplo.com", "654321")).not.toBe(hash);
    expect(hashEmailCode("t".repeat(32), "ana@exemplo.com", "123456")).not.toBe(hash);
  });
});

describe("refresh token", () => {
  it("é aleatório e o hash guardado não revela o token", () => {
    const a = generateRefreshToken();
    const b = generateRefreshToken();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThanOrEqual(43);
    expect(hashRefreshToken(a)).toBe(hashRefreshToken(a));
    expect(hashRefreshToken(a)).not.toContain(a);
  });
});

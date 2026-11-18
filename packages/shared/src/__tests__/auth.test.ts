import { validateLogin, validateSignUp, validateEmailCode } from "../auth";

describe("validateLogin (NF-02)", () => {
  it("aceita e-mail e senha preenchidos", () => {
    expect(validateLogin({ email: "ana@exemplo.com", password: "qualquer1" })).toEqual({});
  });
  it("rejeita e-mail inválido", () => {
    expect(validateLogin({ email: "ana@", password: "x" }).email).toBe("E-mail inválido");
  });
  it("exige senha", () => {
    expect(validateLogin({ email: "ana@exemplo.com", password: "" }).password).toBe("Informe a senha");
  });
  it("ignora espaços em volta do e-mail", () => {
    expect(validateLogin({ email: "  ana@exemplo.com ", password: "x" })).toEqual({});
  });
});

describe("validateSignUp (NF-02)", () => {
  const ok = { name: "Ana Souza", email: "ana@exemplo.com", password: "segura123" };

  it("aceita dados válidos", () => {
    expect(validateSignUp(ok)).toEqual({});
  });
  it("exige nome com pelo menos 2 letras", () => {
    expect(validateSignUp({ ...ok, name: " A " }).name).toBe("Informe seu nome");
  });
  it("senha precisa de 8+ caracteres", () => {
    expect(validateSignUp({ ...ok, password: "abc1234" }).password).toBe(
      "A senha precisa de pelo menos 8 caracteres, com letras e números",
    );
  });
  it("senha precisa de letra e número", () => {
    expect(validateSignUp({ ...ok, password: "somenteletras" }).password).toBeDefined();
    expect(validateSignUp({ ...ok, password: "12345678" }).password).toBeDefined();
  });
});

describe("validateEmailCode", () => {
  it("aceita 6 dígitos", () => expect(validateEmailCode("123456")).toBe(true));
  it.each(["12345", "1234567", "12a456", ""])("rejeita %p", (c) =>
    expect(validateEmailCode(c)).toBe(false),
  );
});

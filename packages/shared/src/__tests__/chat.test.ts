import {
  CHAT_MESSAGE_MAX_LENGTH,
  CHAT_REPORT_REASONS,
  MASKED_EMAIL,
  MASKED_LINK,
  MASKED_PHONE,
  chatPushPreview,
  isChatReportReason,
  maskContactInfo,
  validateChatText,
} from "../chat";

describe("maskContactInfo (CH-06)", () => {
  describe("telefones brasileiros", () => {
    it.each([
      "11987654321",
      "987654321",
      "98765-4321",
      "98765 4321",
      "9 8765-4321",
      "8765-4321",
      "87654321",
      "(11) 98765-4321",
      "(11)98765-4321",
      "(11) 9 8765-4321",
      "11 98765-4321",
      "11 9 8765 4321",
      "011 98765-4321",
      "(011) 98765-4321",
      "+55 11 98765-4321",
      "+5511987654321",
      "+55 (11) 98765-4321",
      "55 11 98765 4321",
      "5511987654321",
      "11.98765.4321",
      "(11) 3456-7890",
      "11 3456 7890",
      "3456-7890",
      "9 9 8 7 6 5 4 3 2 1",
      "11-98765-4321",
    ])("%s", (phone) => {
      expect(maskContactInfo(`me liga no ${phone} por favor`)).toBe(`me liga no ${MASKED_PHONE} por favor`);
    });

    it("telefone no começo e no fim do texto", () => {
      expect(maskContactInfo("11 98765-4321")).toBe(MASKED_PHONE);
      expect(maskContactInfo("zap: 98765-4321")).toBe(`zap: ${MASKED_PHONE}`);
    });

    it("dois telefones na mesma mensagem", () => {
      expect(maskContactInfo("98765-4321 ou (21) 3456-7890")).toBe(`${MASKED_PHONE} ou ${MASKED_PHONE}`);
    });
  });

  describe("e-mails", () => {
    it.each([
      "ana@gmail.com",
      "ana.souza@hotmail.com.br",
      "ana_souza+pets@empresa.org",
      "ANA@GMAIL.COM",
      "joao-silva99@uol.com.br",
      "ana @ gmail.com",
      "ana arroba gmail.com",
      "ana arroba gmail ponto com",
      "ana(at)gmail.com",
    ])("%s", (email) => {
      expect(maskContactInfo(`meu email é ${email} ok`)).toBe(`meu email é ${MASKED_EMAIL} ok`);
    });
  });

  describe("links", () => {
    it.each([
      "https://exemplo.com",
      "http://exemplo.com.br/pagina?x=1",
      "https://www.instagram.com/fulano",
      "www.exemplo.com.br",
      "WWW.EXEMPLO.COM",
      "wa.me/5511987654321",
      "https://wa.me/5511987654321",
      "api.whatsapp.com/send?phone=5511987654321",
      "bit.ly/abc123",
      "exemplo.com",
      "meusite.com.br",
      "pix.app/fulano",
      "t.me/fulano",
      "instagram.com/fulano",
    ])("%s", (link) => {
      expect(maskContactInfo(`olha ${link} aqui`)).toBe(`olha ${MASKED_LINK} aqui`);
    });

    it("link no fim da frase com ponto final", () => {
      expect(maskContactInfo("Veja exemplo.com.")).toBe(`Veja ${MASKED_LINK}.`);
    });
  });

  describe("sem falsos positivos óbvios", () => {
    it.each([
      "Vi ele às 14:30 perto do metrô",
      "Às 9h45 ele estava na praça",
      "Ofereço R$ 50 de recompensa",
      "Recompensa de R$ 1.500,00",
      "Recompensa de R$ 10.000.000",
      "R$1500",
      "Sumiu dia 20/11/2026",
      "Sumiu em 20/11",
      "Sumiu dia 20.11.2026",
      "Sumiu dia 20-11-2026",
      "CEP 01310-100",
      "Rua Augusta, 1500, apto 42",
      "Ele tem 3 anos e pesa 12 kg",
      "Tenho 2 cães e 1 gato",
      "Ele é muito dócil. Obrigada!",
      "Ok.Vou lá agora",
      "Microchip 985112003456789",
      "Estava com a coleira azul...",
      "😀 obrigado!!",
      "Linha 2-verde do metrô, saída 3",
    ])("%s", (text) => {
      expect(maskContactInfo(text)).toBe(text);
    });
  });

  it("mistura de tudo", () => {
    expect(maskContactInfo("Oi! Me chama no (11) 98765-4321, ana@gmail.com ou www.site.com.br. Vi ele às 14:30.")).toBe(
      `Oi! Me chama no ${MASKED_PHONE}, ${MASKED_EMAIL} ou ${MASKED_LINK}. Vi ele às 14:30.`,
    );
  });

  it("texto vazio continua vazio", () => {
    expect(maskContactInfo("")).toBe("");
  });
});

describe("validateChatText", () => {
  it("aceita texto comum", () => {
    expect(validateChatText("Oi, tudo bem?")).toBeNull();
  });

  it("recusa vazio ou só espaços", () => {
    expect(validateChatText("   ")).toBe("Escreva uma mensagem");
  });

  it(`recusa mais de ${CHAT_MESSAGE_MAX_LENGTH} caracteres`, () => {
    expect(validateChatText("a".repeat(CHAT_MESSAGE_MAX_LENGTH))).toBeNull();
    expect(validateChatText("a".repeat(CHAT_MESSAGE_MAX_LENGTH + 1))).toBe(`A mensagem pode ter até ${CHAT_MESSAGE_MAX_LENGTH} caracteres`);
  });
});

describe("motivos de denúncia (CH-08)", () => {
  it("tem rótulo em português para cada motivo", () => {
    expect(CHAT_REPORT_REASONS.map((r) => r.value)).toEqual(["scam", "harassment", "spam", "fake", "other"]);
    for (const r of CHAT_REPORT_REASONS) expect(r.label.length).toBeGreaterThan(3);
  });

  it("isChatReportReason", () => {
    expect(isChatReportReason("scam")).toBe(true);
    expect(isChatReportReason("qualquer")).toBe(false);
    expect(isChatReportReason(undefined)).toBe(false);
  });
});

describe("chatPushPreview (CH-04)", () => {
  it("trecho curto do texto", () => {
    expect(chatPushPreview({ kind: "text", text: "Oi, vi seu cachorro" })).toBe("Oi, vi seu cachorro");
  });

  it("corta textos longos com reticências", () => {
    const preview = chatPushPreview({ kind: "text", text: "a".repeat(200) });
    expect(preview).toHaveLength(80);
    expect(preview.endsWith("…")).toBe(true);
  });

  it("foto e localização", () => {
    expect(chatPushPreview({ kind: "photo", text: null })).toBe("Enviou uma foto");
    expect(chatPushPreview({ kind: "location", text: null })).toBe("Enviou uma localização aproximada");
  });
});

import type { CodePurpose } from "./mailer";

/** Assunto e corpo (texto e HTML) do e-mail com o código, iguais em todos os provedores. */
export function emailCodeContent(code: string, purpose: CodePurpose) {
  const reset = purpose === "reset";
  const subject = reset ? `Código para trocar sua senha no Miaucha: ${code}` : `Seu código do Miaucha: ${code}`;
  const intro = reset ? "Use este código para trocar sua senha no Miaucha:" : "Use este código para confirmar seu e-mail no Miaucha:";
  const outro = reset
    ? "Se não foi você que pediu para trocar a senha, ignore este e-mail: sua senha continua a mesma."
    : "Se não foi você que criou a conta, ignore este e-mail.";
  const text = `${intro}\n\n${code}\n\nO código vale por 10 minutos.\n\n${outro}`;
  const html = `<div style="font-family:Arial,sans-serif;color:#1F2430">
<p>${intro}</p>
<p style="font-size:32px;font-weight:bold;letter-spacing:6px;color:#FF8A3D">${code}</p>
<p>O código vale por 10 minutos.</p>
<p style="color:#6B7280;font-size:13px">${outro}</p>
</div>`;
  return { subject, text, html };
}

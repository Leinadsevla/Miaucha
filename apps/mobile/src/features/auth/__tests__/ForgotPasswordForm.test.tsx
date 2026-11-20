import { fireEvent, render, screen } from "@testing-library/react-native";
import { ForgotPasswordForm } from "../ForgotPasswordForm";

async function setup(requestOk = true) {
  const onRequestCode = jest.fn(async (_email: string) => requestOk);
  const onReset = jest.fn();
  const onBack = jest.fn();
  await render(<ForgotPasswordForm onRequestCode={onRequestCode} onReset={onReset} onBack={onBack} />);
  return { onRequestCode, onReset, onBack };
}

async function goToStep2() {
  await fireEvent.changeText(screen.getByLabelText("E-mail"), " ana@exemplo.com ");
  await fireEvent.press(screen.getByRole("button", { name: "Enviar código" }));
}

describe("ForgotPasswordForm", () => {
  it("e-mail inválido não envia", async () => {
    const { onRequestCode } = await setup();
    await fireEvent.changeText(screen.getByLabelText("E-mail"), "nao-e-email");
    await fireEvent.press(screen.getByRole("button", { name: "Enviar código" }));
    expect(screen.getByText("E-mail inválido")).toBeOnTheScreen();
    expect(onRequestCode).not.toHaveBeenCalled();
  });

  it("depois de enviar, pede código, senha nova e confirmação, e troca a senha", async () => {
    const { onRequestCode, onReset } = await setup();
    await goToStep2();
    expect(onRequestCode).toHaveBeenCalledWith("ana@exemplo.com");
    expect(screen.getByText(/ana@exemplo.com/)).toBeOnTheScreen();

    await fireEvent.changeText(screen.getByLabelText("Código"), "123456");
    await fireEvent.changeText(screen.getByLabelText("Nova senha"), "novaSenha1");
    await fireEvent.changeText(screen.getByLabelText("Confirmar nova senha"), "novaSenha1");
    await fireEvent.press(screen.getByRole("button", { name: "Trocar senha" }));
    expect(onReset).toHaveBeenCalledWith("ana@exemplo.com", "123456", "novaSenha1");
  });

  it("se o envio falhar, continua no primeiro passo", async () => {
    await setup(false);
    await goToStep2();
    expect(screen.queryByLabelText("Código")).toBeNull();
  });

  it("valida código, força da senha e confirmação", async () => {
    const { onReset } = await setup();
    await goToStep2();
    await fireEvent.changeText(screen.getByLabelText("Código"), "12");
    await fireEvent.changeText(screen.getByLabelText("Nova senha"), "curta");
    await fireEvent.press(screen.getByRole("button", { name: "Trocar senha" }));
    expect(screen.getByText("O código tem 6 dígitos")).toBeOnTheScreen();
    expect(screen.getByText("A senha precisa de pelo menos 8 caracteres, com letras e números")).toBeOnTheScreen();

    await fireEvent.changeText(screen.getByLabelText("Código"), "123456");
    await fireEvent.changeText(screen.getByLabelText("Nova senha"), "novaSenha1");
    await fireEvent.changeText(screen.getByLabelText("Confirmar nova senha"), "outraSenha1");
    await fireEvent.press(screen.getByRole("button", { name: "Trocar senha" }));
    expect(screen.getByText("As senhas não conferem")).toBeOnTheScreen();
    expect(onReset).not.toHaveBeenCalled();
  });

  it("reenviar código e voltar para o login", async () => {
    const { onRequestCode, onBack } = await setup();
    await goToStep2();
    await fireEvent.press(screen.getByRole("button", { name: "Reenviar código" }));
    expect(onRequestCode).toHaveBeenCalledTimes(2);
    await fireEvent.press(screen.getByRole("button", { name: "Voltar para o login" }));
    expect(onBack).toHaveBeenCalled();
  });

  it("mostra o erro do servidor", async () => {
    await render(<ForgotPasswordForm onRequestCode={jest.fn()} onReset={jest.fn()} onBack={jest.fn()} serverError="Código incorreto" />);
    expect(screen.getByText("Código incorreto")).toBeOnTheScreen();
  });
});

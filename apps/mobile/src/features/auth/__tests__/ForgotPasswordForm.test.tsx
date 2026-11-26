import { act, fireEvent, render, screen } from "@testing-library/react-native";
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

  it("reenviar só depois de 60 s (a API recusa antes), com contagem e aviso de que foi reenviado", async () => {
    jest.useFakeTimers();
    try {
      const { onRequestCode } = await setup();
      await goToStep2();
      const resend = () => screen.getByRole("button", { name: /Reenviar código/ });
      expect(resend()).toBeDisabled();
      expect(screen.getByText("Reenviar código em 60 s")).toBeOnTheScreen();

      await act(async () => jest.advanceTimersByTime(30_000));
      expect(screen.getByText("Reenviar código em 30 s")).toBeOnTheScreen();
      await fireEvent.press(resend());
      expect(onRequestCode).toHaveBeenCalledTimes(1);

      await act(async () => jest.advanceTimersByTime(30_000));
      expect(resend()).toBeEnabled();
      await fireEvent.press(resend());
      expect(onRequestCode).toHaveBeenCalledTimes(2);
      expect(screen.getByText(/Enviamos um novo código/)).toBeOnTheScreen();
      expect(screen.getByText("Reenviar código em 60 s")).toBeOnTheScreen();
    } finally {
      jest.useRealTimers();
    }
  });

  it("enquanto reenvia, o botão Trocar senha não fica carregando", async () => {
    jest.useFakeTimers();
    try {
      let calls = 0;
      const props = {
        onRequestCode: jest.fn(() => (++calls === 1 ? Promise.resolve(true) : new Promise<boolean>(() => {}))),
        onReset: jest.fn(),
        onBack: jest.fn(),
      };
      const view = await render(<ForgotPasswordForm {...props} />);
      await goToStep2();
      await act(async () => jest.advanceTimersByTime(60_000));
      await fireEvent.press(screen.getByRole("button", { name: /Reenviar código/ }));
      // Na tela real, `loading` vem do `busy` do AuthProvider, que fica true durante o reenvio.
      await view.rerender(<ForgotPasswordForm {...props} loading />);
      expect(screen.queryByTestId("button-loading")).toBeNull();
      expect(screen.getByRole("button", { name: /Reenviando/ })).toBeDisabled();
    } finally {
      jest.useRealTimers();
    }
  });

  it("Trocar e-mail volta ao primeiro passo mantendo o e-mail digitado", async () => {
    await setup();
    await goToStep2();
    await fireEvent.press(screen.getByRole("button", { name: "Trocar e-mail" }));
    expect(screen.getByLabelText("E-mail")).toHaveDisplayValue("ana@exemplo.com");
    expect(screen.queryByLabelText("Código")).toBeNull();
  });

  it("explica onde procurar o código (inclusive no spam)", async () => {
    await setup();
    await goToStep2();
    expect(screen.getByText(/spam/)).toBeOnTheScreen();
  });

  it("Enter no e-mail envia o código; Enter na confirmação troca a senha", async () => {
    const { onRequestCode, onReset } = await setup();
    await fireEvent.changeText(screen.getByLabelText("E-mail"), "ana@exemplo.com");
    await fireEvent(screen.getByLabelText("E-mail"), "submitEditing");
    expect(onRequestCode).toHaveBeenCalledWith("ana@exemplo.com");

    await fireEvent.changeText(screen.getByLabelText("Código"), "123456");
    await fireEvent.changeText(screen.getByLabelText("Nova senha"), "novaSenha1");
    await fireEvent.changeText(screen.getByLabelText("Confirmar nova senha"), "novaSenha1");
    await fireEvent(screen.getByLabelText("Confirmar nova senha"), "submitEditing");
    expect(onReset).toHaveBeenCalledWith("ana@exemplo.com", "123456", "novaSenha1");
  });

  it("voltar para o login", async () => {
    const { onBack } = await setup();
    await goToStep2();
    await fireEvent.press(screen.getByRole("button", { name: "Voltar para o login" }));
    expect(onBack).toHaveBeenCalled();
  });

  it("erro do código (incorreto ou expirado) aparece no campo do código", async () => {
    const props = { onRequestCode: jest.fn(async () => true), onReset: jest.fn(), onBack: jest.fn() };
    const view = await render(<ForgotPasswordForm {...props} />);
    await goToStep2();
    await view.rerender(<ForgotPasswordForm {...props} serverError="Código incorreto" />);
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByText("Código incorreto")).toBeOnTheScreen();
    expect(screen.getByTestId("field-Código")).toHaveStyle({ borderColor: "#EF4444" });
  });

  it("mostra o erro do servidor", async () => {
    await render(<ForgotPasswordForm onRequestCode={jest.fn()} onReset={jest.fn()} onBack={jest.fn()} serverError="Código incorreto" />);
    expect(screen.getByText("Código incorreto")).toBeOnTheScreen();
  });
});

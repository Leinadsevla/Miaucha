import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { LoginForm } from "../LoginForm";
import { VerifyEmailForm } from "../VerifyEmailForm";

describe("Enter envia o formulário", () => {
  it("login: Enter na senha entra", async () => {
    const onLogin = jest.fn();
    await render(<LoginForm onLogin={onLogin} onSignUp={jest.fn()} onGoogle={jest.fn()} />);
    await fireEvent.changeText(screen.getByLabelText("E-mail"), "ana@exemplo.com");
    await fireEvent.changeText(screen.getByLabelText("Senha"), "segura123");
    await fireEvent(screen.getByLabelText("Senha"), "submitEditing");
    expect(onLogin).toHaveBeenCalledWith({ email: "ana@exemplo.com", password: "segura123" });
  });

  it("cadastro: Enter na confirmação cria a conta", async () => {
    const onSignUp = jest.fn();
    await render(<LoginForm onLogin={jest.fn()} onSignUp={onSignUp} onGoogle={jest.fn()} />);
    await fireEvent.press(screen.getByRole("tab", { name: "Cadastrar" }));
    await fireEvent.changeText(screen.getByLabelText("Nome completo"), "Ana Souza");
    await fireEvent.changeText(screen.getByLabelText("E-mail"), "ana@exemplo.com");
    await fireEvent.changeText(screen.getByLabelText("Senha"), "segura123");
    await fireEvent.changeText(screen.getByLabelText("Confirmar senha"), "segura123");
    await fireEvent(screen.getByLabelText("Confirmar senha"), "submitEditing");
    expect(onSignUp).toHaveBeenCalledWith({ name: "Ana Souza", email: "ana@exemplo.com", password: "segura123" });
  });

  it("código do e-mail: Enter confirma quando tem 6 dígitos", async () => {
    const onSubmit = jest.fn();
    await render(<VerifyEmailForm email="ana@exemplo.com" onSubmit={onSubmit} onResend={jest.fn()} />);
    await fireEvent.changeText(screen.getByLabelText("Código de 6 dígitos"), "12");
    await fireEvent(screen.getByLabelText("Código de 6 dígitos"), "submitEditing");
    expect(onSubmit).not.toHaveBeenCalled();
    await fireEvent.changeText(screen.getByLabelText("Código de 6 dígitos"), "123456");
    await fireEvent(screen.getByLabelText("Código de 6 dígitos"), "submitEditing");
    expect(onSubmit).toHaveBeenCalledWith("123456");
  });
});

describe("Esqueci minha senha no login", () => {
  it("tem alvo de toque de 44 px", async () => {
    await render(<LoginForm onLogin={jest.fn()} onSignUp={jest.fn()} onGoogle={jest.fn()} onForgotPassword={jest.fn()} />);
    expect(screen.getByRole("button", { name: "Esqueci minha senha" })).toHaveStyle({ minHeight: 44 });
  });
});

describe("VerifyEmailForm: reenviar código", () => {
  it("o código acabou de ser enviado: reenviar só depois de 60 s, e avisa quando reenviou", async () => {
    jest.useFakeTimers();
    try {
      const onResend = jest.fn(async () => {});
      await render(<VerifyEmailForm email="ana@exemplo.com" onSubmit={jest.fn()} onResend={onResend} />);
      expect(screen.getByRole("button", { name: "Reenviar código em 60 s" })).toBeDisabled();
      await act(async () => jest.advanceTimersByTime(60_000));
      await fireEvent.press(screen.getByRole("button", { name: "Reenviar código" }));
      expect(onResend).toHaveBeenCalledTimes(1);
      expect(screen.getByText(/Enviamos um novo código/)).toBeOnTheScreen();
      expect(screen.getByRole("button", { name: "Reenviar código em 60 s" })).toBeDisabled();
    } finally {
      jest.useRealTimers();
    }
  });
});

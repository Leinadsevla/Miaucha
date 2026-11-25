import { render, screen, fireEvent, act } from "@testing-library/react-native";
import { Text } from "react-native";
import { AuthScreenLayout } from "../AuthScreenLayout";
import { LoginForm } from "../LoginForm";
import { VerifyEmailForm } from "../VerifyEmailForm";
import { ConsentForm } from "../ConsentForm";
import { SplashView } from "../SplashView";

describe("AuthScreenLayout (login, cadastro, verificação, senha, consentimento)", () => {
  it("cabeçalho com a logo do Miaucha (não mais a pata)", async () => {
    await render(
      <AuthScreenLayout title="Entrar" subtitle="Bem-vindo">
        <Text>conteúdo</Text>
      </AuthScreenLayout>,
    );
    expect(screen.getByLabelText("Logo do Miaucha")).toBeOnTheScreen();
    expect(screen.queryByText("🐾")).toBeNull();
  });
});

describe("LoginForm (NF-02)", () => {
  const setup = async () => {
    const onLogin = jest.fn();
    const onSignUp = jest.fn();
    const onGoogle = jest.fn();
    await render(<LoginForm onLogin={onLogin} onSignUp={onSignUp} onGoogle={onGoogle} />);
    return { onLogin, onSignUp, onGoogle };
  };

  it("começa na aba Entrar, sem campo de nome", async () => {
    await setup();
    expect(screen.getByRole("tab", { name: "Entrar" })).toBeSelected();
    expect(screen.queryByLabelText("Nome completo")).toBeNull();
  });

  it("entra com e-mail e senha válidos", async () => {
    const { onLogin } = await setup();
    await fireEvent.changeText(screen.getByLabelText("E-mail"), " ana@exemplo.com ");
    await fireEvent.changeText(screen.getByLabelText("Senha"), "segredo1");
    await fireEvent.press(screen.getByRole("button", { name: "Entrar" }));
    expect(onLogin).toHaveBeenCalledWith({ email: "ana@exemplo.com", password: "segredo1" });
  });

  it("mostra erros e não envia quando inválido", async () => {
    const { onLogin } = await setup();
    await fireEvent.changeText(screen.getByLabelText("E-mail"), "ana@");
    await fireEvent.press(screen.getByRole("button", { name: "Entrar" }));
    expect(screen.getByText("E-mail inválido")).toBeOnTheScreen();
    expect(screen.getByText("Informe a senha")).toBeOnTheScreen();
    expect(onLogin).not.toHaveBeenCalled();
  });

  it("aba Cadastrar pede nome e valida a senha", async () => {
    const { onSignUp } = await setup();
    await fireEvent.press(screen.getByRole("tab", { name: "Cadastrar" }));
    await fireEvent.changeText(screen.getByLabelText("Nome completo"), "Ana Souza");
    await fireEvent.changeText(screen.getByLabelText("E-mail"), "ana@exemplo.com");
    await fireEvent.changeText(screen.getByLabelText("Senha"), "curta");
    await fireEvent.press(screen.getByRole("button", { name: "Criar conta" }));
    expect(onSignUp).not.toHaveBeenCalled();

    await fireEvent.changeText(screen.getByLabelText("Senha"), "segura123");
    await fireEvent.changeText(screen.getByLabelText("Confirmar senha"), "segura123");
    await fireEvent.press(screen.getByRole("button", { name: "Criar conta" }));
    expect(onSignUp).toHaveBeenCalledWith({
      name: "Ana Souza",
      email: "ana@exemplo.com",
      password: "segura123",
    });
  });

  it("cadastro exige confirmar a senha igual", async () => {
    const { onSignUp } = await setup();
    await fireEvent.press(screen.getByRole("tab", { name: "Cadastrar" }));
    await fireEvent.changeText(screen.getByLabelText("Nome completo"), "Ana Souza");
    await fireEvent.changeText(screen.getByLabelText("E-mail"), "ana@exemplo.com");
    await fireEvent.changeText(screen.getByLabelText("Senha"), "segura123");
    await fireEvent.changeText(screen.getByLabelText("Confirmar senha"), "segura124");
    await fireEvent.press(screen.getByRole("button", { name: "Criar conta" }));

    expect(screen.getByText("As senhas não conferem")).toBeOnTheScreen();
    expect(onSignUp).not.toHaveBeenCalled();
  });

  it("aba Entrar não pede confirmação de senha", async () => {
    await setup();
    expect(screen.queryByLabelText("Confirmar senha")).toBeNull();
  });

  it("Esqueci minha senha aparece na aba Entrar e chama a ação", async () => {
    const onForgotPassword = jest.fn();
    await render(<LoginForm onLogin={jest.fn()} onSignUp={jest.fn()} onGoogle={jest.fn()} onForgotPassword={onForgotPassword} />);
    await fireEvent.press(screen.getByRole("button", { name: "Esqueci minha senha" }));
    expect(onForgotPassword).toHaveBeenCalled();
  });

  it("botão do Google", async () => {
    const { onGoogle } = await setup();
    await fireEvent.press(screen.getByRole("button", { name: "Continuar com Google" }));
    expect(onGoogle).toHaveBeenCalled();
  });

  it("mostra erro vindo do servidor", async () => {
    await render(
      <LoginForm onLogin={jest.fn()} onSignUp={jest.fn()} onGoogle={jest.fn()} serverError="E-mail ou senha incorretos" />,
    );
    expect(screen.getByText("E-mail ou senha incorretos")).toBeOnTheScreen();
  });
});

describe("VerifyEmailForm", () => {
  it("mostra o e-mail e só libera com 6 dígitos", async () => {
    const onSubmit = jest.fn();
    await render(<VerifyEmailForm email="ana@exemplo.com" onSubmit={onSubmit} onResend={jest.fn()} />);
    expect(screen.getByText(/ana@exemplo.com/)).toBeOnTheScreen();

    const button = screen.getByRole("button", { name: "Confirmar" });
    await fireEvent.changeText(screen.getByLabelText("Código de 6 dígitos"), "123");
    expect(button).toBeDisabled();

    await fireEvent.changeText(screen.getByLabelText("Código de 6 dígitos"), "12a3456");
    await fireEvent.press(button);
    expect(onSubmit).toHaveBeenCalledWith("123456");
  });

  it("reenviar código", async () => {
    const onResend = jest.fn();
    await render(<VerifyEmailForm email="a@b.com" onSubmit={jest.fn()} onResend={onResend} />);
    await fireEvent.press(screen.getByRole("button", { name: "Reenviar código" }));
    expect(onResend).toHaveBeenCalled();
  });
});

describe("ConsentForm (NF-01)", () => {
  it("só continua depois de aceitar a política e a localização", async () => {
    const onAccept = jest.fn();
    await render(<ConsentForm onAccept={onAccept} onOpenPolicy={jest.fn()} />);
    const continuar = screen.getByRole("button", { name: "Continuar" });
    expect(continuar).toBeDisabled();

    await fireEvent.press(screen.getByRole("checkbox", { name: /política de privacidade/i }));
    expect(continuar).toBeDisabled();

    await fireEvent.press(screen.getByRole("checkbox", { name: /localização aproximada/i }));
    expect(continuar).toBeEnabled();

    await fireEvent.press(continuar);
    expect(onAccept).toHaveBeenCalledWith({ privacyPolicy: true, approximateLocation: true });
  });

  it("abre a política", async () => {
    const onOpenPolicy = jest.fn();
    await render(<ConsentForm onAccept={jest.fn()} onOpenPolicy={onOpenPolicy} />);
    await fireEvent.press(screen.getByRole("link", { name: "Ler a política de privacidade" }));
    expect(onOpenPolicy).toHaveBeenCalled();
  });
});

describe("SplashView", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it("mostra a marca e termina depois de 2,6 s", async () => {
    const onFinish = jest.fn();
    await render(<SplashView onFinish={onFinish} />);
    expect(screen.getByText("Miaucha")).toBeOnTheScreen();
    expect(screen.getByLabelText("Logo do Miaucha")).toBeOnTheScreen();
    expect(screen.queryByText("🐾")).toBeNull();
    expect(screen.getByText("Conectando pets aos seus lares")).toBeOnTheScreen();
    await act(() => jest.advanceTimersByTime(2500));
    expect(onFinish).not.toHaveBeenCalled();
    await act(() => jest.advanceTimersByTime(200));
    expect(onFinish).toHaveBeenCalledTimes(1);
  });
});

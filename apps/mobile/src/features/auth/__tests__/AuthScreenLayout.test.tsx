import { Text } from "react-native";
import { render, screen } from "@testing-library/react-native";
import { colors } from "@miaucha/shared";
import { AuthScreenLayout } from "../AuthScreenLayout";

describe("AuthScreenLayout", () => {
  it("celular: cabeçalho laranja da marca com a logo (visual original), título em branco e o formulário embaixo", async () => {
    await render(
      <AuthScreenLayout title="Bem-vindo ao Miaucha" subtitle="Juntos encontramos quem se perdeu" wide={false}>
        <Text>formulário</Text>
      </AuthScreenLayout>,
    );
    expect(screen.getByTestId("auth-header")).toHaveStyle({ backgroundColor: colors.brand });
    expect(screen.getByRole("header", { name: "Bem-vindo ao Miaucha" })).toHaveStyle({ color: colors.white });
    expect(screen.getByText("Juntos encontramos quem se perdeu")).toBeOnTheScreen();
    expect(screen.getByLabelText("Logo do Miaucha")).toBeOnTheScreen();
    expect(screen.getByText("formulário")).toBeOnTheScreen();
    expect(screen.queryByTestId("auth-brand-panel")).toBeNull();
  });

  it("tela larga: painel creme (não laranja) com a prévia do app ao lado do formulário", async () => {
    await render(
      <AuthScreenLayout title="Bem-vindo ao Miaucha" subtitle="Juntos encontramos quem se perdeu" wide>
        <Text>formulário</Text>
      </AuthScreenLayout>,
    );
    expect(screen.getByTestId("auth-brand-panel")).toHaveStyle({ backgroundColor: colors.cream });
    expect(screen.getByLabelText("Prévia do aplicativo: um pet perdido, um alerta de proximidade e uma conversa")).toBeOnTheScreen();
    expect(screen.getByText("Mapa com os casos perto de você")).toBeOnTheScreen();
    expect(screen.getByText("Alertas quando um pet some na sua região")).toBeOnTheScreen();
    expect(screen.getByText("Conversa segura, só pelo seu nome público")).toBeOnTheScreen();
    expect(screen.getByRole("header", { name: "Bem-vindo ao Miaucha" })).toBeOnTheScreen();
    expect(screen.getByText("formulário")).toBeOnTheScreen();
  });
});

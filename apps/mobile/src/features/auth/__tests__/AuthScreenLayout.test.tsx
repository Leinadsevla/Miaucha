import { Text } from "react-native";
import { render, screen } from "@testing-library/react-native";
import { AuthScreenLayout } from "../AuthScreenLayout";

describe("AuthScreenLayout", () => {
  it("celular: logo, título como cabeçalho e o formulário", async () => {
    await render(
      <AuthScreenLayout title="Bem-vindo ao Miaucha" subtitle="Juntos encontramos quem se perdeu" wide={false}>
        <Text>formulário</Text>
      </AuthScreenLayout>,
    );
    expect(screen.getByRole("header", { name: "Bem-vindo ao Miaucha" })).toBeOnTheScreen();
    expect(screen.getByLabelText("Logo do Miaucha")).toBeOnTheScreen();
    expect(screen.getByText("formulário")).toBeOnTheScreen();
    expect(screen.queryByTestId("auth-brand-panel")).toBeNull();
  });

  it("tela larga: painel da marca com os três motivos ao lado do formulário", async () => {
    await render(
      <AuthScreenLayout title="Bem-vindo ao Miaucha" subtitle="Juntos encontramos quem se perdeu" wide>
        <Text>formulário</Text>
      </AuthScreenLayout>,
    );
    expect(screen.getByTestId("auth-brand-panel")).toBeOnTheScreen();
    expect(screen.getByText("Mapa com os casos perto de você")).toBeOnTheScreen();
    expect(screen.getByText("Alertas quando um pet some na sua região")).toBeOnTheScreen();
    expect(screen.getByText("Conversa segura, só pelo seu nome público")).toBeOnTheScreen();
    expect(screen.getByRole("header", { name: "Bem-vindo ao Miaucha" })).toBeOnTheScreen();
    expect(screen.getByText("formulário")).toBeOnTheScreen();
  });
});

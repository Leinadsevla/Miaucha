import { Text } from "react-native";
import { render, screen } from "@testing-library/react-native";
import { KEYBOARD_AVOIDING_BEHAVIOR, KeyboardScreen } from "../KeyboardScreen";

describe("KeyboardScreen", () => {
  it("usa padding nas duas plataformas (Android é edge-to-edge: sem behavior o teclado cobre os campos)", () => {
    expect(KEYBOARD_AVOIDING_BEHAVIOR).toBe("padding");
  });

  it("rola o conteúdo e não engole toques nos botões com o teclado aberto", async () => {
    await render(
      <KeyboardScreen>
        <Text>campo</Text>
      </KeyboardScreen>,
    );
    expect(screen.getByTestId("keyboard-screen-scroll").props.keyboardShouldPersistTaps).toBe("handled");
    expect(screen.getByText("campo")).toBeOnTheScreen();
  });
});

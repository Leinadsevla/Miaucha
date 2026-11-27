import { fireEvent, render, screen } from "@testing-library/react-native";
import { PhotoCarousel } from "../PhotoCarousel";

const urls = ["https://x/1.jpg", "https://x/2.jpg", "https://x/3.jpg"];

describe("PhotoCarousel", () => {
  it("cada foto tem descrição com a posição", async () => {
    await render(<PhotoCarousel urls={urls} label="Thor" height={288} />);
    expect(screen.getByLabelText("Foto 1 de 3 de Thor")).toBeOnTheScreen();
    expect(screen.getByLabelText("Foto 3 de 3 de Thor")).toBeOnTheScreen();
  });

  it("com setas (navegador): avança e volta, e o contador acompanha", async () => {
    await render(<PhotoCarousel urls={urls} label="Thor" height={288} arrows />);
    expect(screen.getByText("1/3")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Foto anterior" })).toBeDisabled();
    await fireEvent.press(screen.getByRole("button", { name: "Próxima foto" }));
    await fireEvent.press(screen.getByRole("button", { name: "Próxima foto" }));
    expect(screen.getByText("3/3")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Próxima foto" })).toBeDisabled();
    await fireEvent.press(screen.getByRole("button", { name: "Foto anterior" }));
    expect(screen.getByText("2/3")).toBeOnTheScreen();
  });

  it("sem setas no aparelho (desliza com o dedo)", async () => {
    await render(<PhotoCarousel urls={urls} label="Thor" height={288} arrows={false} />);
    expect(screen.queryByRole("button", { name: "Próxima foto" })).toBeNull();
    expect(screen.getByText("1/3")).toBeOnTheScreen();
  });

  it("uma foto só: sem contador nem setas", async () => {
    await render(<PhotoCarousel urls={[urls[0]]} label="Thor" height={288} arrows />);
    expect(screen.queryByText("1/1")).toBeNull();
    expect(screen.queryByRole("button", { name: "Próxima foto" })).toBeNull();
  });
});

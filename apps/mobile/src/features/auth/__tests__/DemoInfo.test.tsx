import { render, screen } from "@testing-library/react-native";
import { DemoBadge, DemoInfoProvider } from "../DemoInfo";

describe("DemoBadge", () => {
  it("aparece só quando o app está com dados de exemplo", async () => {
    const view = await render(
      <DemoInfoProvider value={{ demo: true, googleIsDemo: false }}>
        <DemoBadge />
      </DemoInfoProvider>,
    );
    expect(screen.getByText("Modo demonstração · dados de exemplo")).toBeOnTheScreen();
    await view.rerender(
      <DemoInfoProvider value={{ demo: false, googleIsDemo: true }}>
        <DemoBadge />
      </DemoInfoProvider>,
    );
    expect(screen.queryByText("Modo demonstração · dados de exemplo")).toBeNull();
  });
});

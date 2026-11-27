import { Text } from "react-native";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { colors, occurrenceStyle, withAlpha } from "@miaucha/shared";
import { StatusBadge } from "../StatusBadge";
import { PrimaryButton } from "../PrimaryButton";
import { TextField } from "../TextField";
import { PetCard } from "../PetCard";
import { BottomNav } from "../BottomNav";
import { AppLogo } from "../AppLogo";
import { EmptyState } from "../EmptyState";
import { IconButton } from "../IconButton";
import { SkeletonList } from "../Skeleton";
import { TabHeader } from "../TabHeader";
import { SideNav } from "../SideNav";
import { Centered } from "../Centered";
import { FilterChips } from "../FilterChips";

describe("StatusBadge (MP-01)", () => {
  it.each([
    ["lost", "Perdido"],
    ["seen", "Avistado"],
    ["found", "Encontrado"],
  ] as const)("%s mostra '%s' no selo sólido na cor do tipo, com texto legível (visual original)", async (type, label) => {
    await render(<StatusBadge type={type} />);
    const { color, textOn } = occurrenceStyle(type);
    expect(screen.getByText(label)).toHaveStyle({ color: textOn });
    expect(screen.getByTestId("status-badge")).toHaveStyle({ backgroundColor: color });
  });
});

describe("PrimaryButton", () => {
  it("chama onPress", async () => {
    const onPress = jest.fn();
    await render(<PrimaryButton title="Entrar" onPress={onPress} />);
    await fireEvent.press(screen.getByRole("button", { name: "Entrar" }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("não chama onPress quando desabilitado", async () => {
    const onPress = jest.fn();
    await render(<PrimaryButton title="Entrar" onPress={onPress} disabled />);
    await fireEvent.press(screen.getByRole("button", { name: "Entrar" }));
    expect(onPress).not.toHaveBeenCalled();
  });

  it("mostra carregando e bloqueia o toque", async () => {
    const onPress = jest.fn();
    await render(<PrimaryButton title="Entrar" onPress={onPress} loading />);
    expect(screen.getByTestId("button-loading")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button"));
    expect(onPress).not.toHaveBeenCalled();
  });
});

describe("TextField", () => {
  it("liga o rótulo ao campo e repassa o texto", async () => {
    const onChangeText = jest.fn();
    await render(<TextField label="E-mail" value="" onChangeText={onChangeText} />);
    await fireEvent.changeText(screen.getByLabelText("E-mail"), "ana@exemplo.com");
    expect(onChangeText).toHaveBeenCalledWith("ana@exemplo.com");
  });

  it("mostra a mensagem de erro", async () => {
    await render(<TextField label="E-mail" value="" onChangeText={() => {}} error="E-mail inválido" />);
    expect(screen.getByText("E-mail inválido")).toBeOnTheScreen();
  });
});

describe("PetCard (MP-04)", () => {
  const now = new Date("2026-11-17T15:00:00Z");
  const occurrence = {
    id: "1",
    type: "lost" as const,
    species: "dog" as const,
    petName: "Thor",
    breed: "Golden Retriever",
    color: "Dourado",
    description: null,
    photoUrls: ["https://exemplo.com/thor.jpg"],
    publicLocation: { lat: -23.56, lng: -46.65 },
    approxAddress: "Bela Vista",
    authorPseudonym: "Tutor Laranja 42",
    status: "open" as const,
    isMine: false,
    createdAt: "2026-11-17T13:00:00Z",
  };

  it("mostra nome, raça, distância, região e tempo", async () => {
    await render(<PetCard occurrence={occurrence} distanceMeters={300} now={now} onPress={() => {}} />);
    expect(screen.getByText("Thor")).toBeOnTheScreen();
    expect(screen.getByText("Golden Retriever")).toBeOnTheScreen();
    expect(screen.getByText("300 m")).toBeOnTheScreen();
    expect(screen.getByText("Bela Vista")).toBeOnTheScreen();
    expect(screen.getByText("2h atrás")).toBeOnTheScreen();
    expect(screen.getByText("Perdido")).toBeOnTheScreen();
  });

  it("sem a prop, usa a distância que veio da busca por raio", async () => {
    await render(<PetCard occurrence={{ ...occurrence, distanceMeters: 1250 }} now={now} onPress={() => {}} />);
    expect(screen.getByText("1,3 km")).toBeOnTheScreen();
  });

  it("pet sem nome aparece como 'Sem nome'", async () => {
    await render(<PetCard occurrence={{ ...occurrence, petName: null }} now={now} onPress={() => {}} />);
    expect(screen.getByText("Sem nome")).toBeOnTheScreen();
  });

  it("altura padrão: sem raça nem região, as linhas continuam lá (espécie e aviso) e cada uma ocupa uma linha só", async () => {
    await render(<PetCard occurrence={{ ...occurrence, breed: null, approxAddress: null }} now={now} onPress={() => {}} />);
    expect(screen.getByText("Cão")).toBeOnTheScreen();
    expect(screen.getByText("Região não informada")).toBeOnTheScreen();
    for (const id of ["pet-card-name", "pet-card-breed", "pet-card-address"]) {
      expect(screen.getByTestId(id).props.numberOfLines).toBe(1);
    }
  });

  it("toque chama onPress", async () => {
    const onPress = jest.fn();
    await render(<PetCard occurrence={occurrence} now={now} onPress={onPress} />);
    await fireEvent.press(screen.getByRole("button", { name: /Thor/ }));
    expect(onPress).toHaveBeenCalled();
  });
});

describe("BottomNav", () => {
  it("mostra as 5 abas do design", async () => {
    await render(<BottomNav active="index" onNavigate={() => {}} />);
    for (const label of ["Início", "Mapa", "Alertas", "Chat", "Perfil"]) {
      expect(screen.getByRole("tab", { name: label })).toBeOnTheScreen();
    }
  });

  it("as 5 abas dividem a largura da barra igualmente", async () => {
    await render(<BottomNav active="profile" onNavigate={() => {}} />);
    expect(screen.getByTestId("bottom-nav")).toHaveStyle({ width: "100%", alignSelf: "stretch" });
    for (const tab of screen.getAllByRole("tab")) expect(tab).toHaveStyle({ flex: 1 });
  });

  it("marca a aba ativa", async () => {
    await render(<BottomNav active="map" onNavigate={() => {}} />);
    expect(screen.getByRole("tab", { name: "Mapa" })).toBeSelected();
    expect(screen.getByRole("tab", { name: "Início" })).not.toBeSelected();
  });

  it("navega ao tocar", async () => {
    const onNavigate = jest.fn();
    await render(<BottomNav active="index" onNavigate={onNavigate} />);
    await fireEvent.press(screen.getByRole("tab", { name: "Alertas" }));
    expect(onNavigate).toHaveBeenCalledWith("alerts");
  });
});

describe("PetCard (visual)", () => {
  const base = {
    id: "1",
    species: "dog" as const,
    petName: "Thor",
    breed: null,
    color: null,
    description: null,
    photoUrls: [],
    publicLocation: { lat: 0, lng: 0 },
    approxAddress: null,
    authorPseudonym: "Tutor Azul 10",
    status: "open" as const,
    isMine: false,
    createdAt: "2026-11-17T13:00:00Z",
  };

  it("o tipo vai num selo por cima da foto, sem faixa colorida no topo", async () => {
    await render(<PetCard occurrence={{ ...base, type: "seen", photoUrls: ["https://exemplo.com/a.jpg"] }} onPress={() => {}} />);
    expect(screen.queryByTestId("pet-card-band")).toBeNull();
    expect(screen.getByTestId("status-badge")).toBeOnTheScreen();
    expect(screen.getByTestId("pet-card-photo")).toBeOnTheScreen();
  });

  it.each([
    ["lost", colors.lostSoft],
    ["seen", colors.seenSoft],
    ["found", colors.foundSoft],
  ] as const)("sem foto (%s): fundo claro na cor do tipo com o ícone da espécie", async (type, soft) => {
    await render(<PetCard occurrence={{ ...base, type }} onPress={() => {}} />);
    expect(screen.getByTestId("pet-card-cover")).toHaveStyle({ backgroundColor: soft });
    expect(screen.queryByTestId("pet-card-photo")).toBeNull();
  });
});

describe("AppLogo", () => {
  it("símbolo por padrão, no tamanho pedido, com nome acessível", async () => {
    await render(<AppLogo size={40} />);
    const logo = screen.getByLabelText("Logo do Miaucha");
    expect(logo).toHaveStyle({ width: 40, height: 40 });
  });
});

describe("PrimaryButton (acabamento)", () => {
  it("o padrão é azul com texto branco (visual original); o suave usa o fundo claro da marca", async () => {
    await render(
      <>
        <PrimaryButton title="Principal" onPress={() => {}} />
        <PrimaryButton title="Apoio" variant="soft" onPress={() => {}} />
        <PrimaryButton title="Neutro" variant="outline" onPress={() => {}} />
      </>,
    );
    expect(screen.getByRole("button", { name: "Principal" })).toHaveStyle({ backgroundColor: colors.accent });
    expect(screen.getByText("Principal")).toHaveStyle({ color: colors.white });
    expect(screen.getByRole("button", { name: "Apoio" })).toHaveStyle({ backgroundColor: colors.brandSoft });
    expect(screen.getByText("Apoio")).toHaveStyle({ color: colors.brandDeep });
    expect(screen.getByRole("button", { name: "Neutro" })).toHaveStyle({ backgroundColor: colors.white, borderColor: colors.border });
  });

  it("tem 52 px de altura mínima (acima dos 44 px de alvo de toque)", async () => {
    await render(<PrimaryButton title="Entrar" onPress={() => {}} />);
    expect(screen.getByRole("button", { name: "Entrar" })).toHaveStyle({ minHeight: 52 });
  });

  it("mostra o ícone antes e a seta depois do texto", async () => {
    await render(<PrimaryButton title="Entrar" onPress={() => {}} icon={<Text>ícone</Text>} arrow />);
    expect(screen.getByText("ícone")).toBeOnTheScreen();
    expect(screen.getByTestId("button-arrow")).toBeOnTheScreen();
  });

  it("tamanho pequeno (40 px) para ações dentro de cartões", async () => {
    await render(<PrimaryButton title="Ver" size="sm" onPress={() => {}} />);
    expect(screen.getByRole("button", { name: "Ver" })).toHaveStyle({ minHeight: 40 });
  });
});

describe("TextField (acabamento)", () => {
  it("campo de senha tem botão para mostrar e ocultar o que foi digitado", async () => {
    await render(<TextField label="Senha" value="segredo" onChangeText={() => {}} secureTextEntry />);
    const input = screen.getByLabelText("Senha");
    expect(input.props.secureTextEntry).toBe(true);
    await fireEvent.press(screen.getByRole("button", { name: "Mostrar senha" }));
    expect(screen.getByLabelText("Senha").props.secureTextEntry).toBe(false);
    await fireEvent.press(screen.getByRole("button", { name: "Ocultar senha" }));
    expect(screen.getByLabelText("Senha").props.secureTextEntry).toBe(true);
  });

  it("campo comum não tem esse botão; aceita um ícone à esquerda", async () => {
    await render(<TextField label="E-mail" value="" onChangeText={() => {}} icon={<Text>@</Text>} />);
    expect(screen.queryByRole("button", { name: "Mostrar senha" })).toBeNull();
    expect(screen.getByText("@")).toBeOnTheScreen();
  });

  it("mostra a dica embaixo do campo; com erro, o erro toma o lugar da dica", async () => {
    const { rerender } = await render(<TextField label="Senha" value="" onChangeText={() => {}} hint="Pelo menos 8 caracteres" />);
    expect(screen.getByText("Pelo menos 8 caracteres")).toBeOnTheScreen();
    await rerender(<TextField label="Senha" value="" onChangeText={() => {}} hint="Pelo menos 8 caracteres" error="Senha fraca" />);
    expect(screen.queryByText("Pelo menos 8 caracteres")).toBeNull();
    expect(screen.getByText("Senha fraca")).toBeOnTheScreen();
  });
});

describe("IconButton", () => {
  it("é um botão com nome acessível, alvo de 44 px e chama onPress", async () => {
    const onPress = jest.fn();
    await render(<IconButton label="Voltar" icon={<></>} onPress={onPress} />);
    const button = screen.getByRole("button", { name: "Voltar" });
    expect(button).toHaveStyle({ width: 44, height: 44 });
    await fireEvent.press(button);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("desabilitado não chama onPress e avisa o leitor de tela", async () => {
    const onPress = jest.fn();
    await render(<IconButton label="Enviar foto" icon={<></>} onPress={onPress} disabled />);
    const button = screen.getByRole("button", { name: "Enviar foto" });
    expect(button).toBeDisabled();
    await fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });
});

describe("EmptyState", () => {
  it("mostra título, texto e a ação", async () => {
    const onAction = jest.fn();
    await render(<EmptyState icon={<></>} title="Nenhum alerta" message="Quando um pet sumir perto de você, ele aparece aqui." actionLabel="Ajustar alertas" onAction={onAction} />);
    expect(screen.getByRole("header", { name: "Nenhum alerta" })).toBeOnTheScreen();
    expect(screen.getByText("Quando um pet sumir perto de você, ele aparece aqui.")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Ajustar alertas" }));
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it("sem ação, não mostra botão", async () => {
    await render(<EmptyState icon={<></>} title="Sem conversas" message="..." />);
    expect(screen.queryByRole("button")).toBeNull();
  });
});

describe("Skeleton", () => {
  it("lista de carregamento avisa o leitor de tela uma vez só", async () => {
    await render(<SkeletonList count={3} />);
    expect(screen.getByLabelText("Carregando")).toBeOnTheScreen();
    expect(screen.getAllByTestId("skeleton-row")).toHaveLength(3);
  });
});

describe("TabHeader", () => {
  it("faixa laranja da marca (visual original): título como cabeçalho, linha de cima, subtítulo e conteúdo extra", async () => {
    await render(
      <TabHeader eyebrow="Olá, Ana" title="Pets perto de você" subtitle="Raio de 5 km">
        <Text>chips</Text>
      </TabHeader>,
    );
    expect(screen.getByTestId("tab-header")).toHaveStyle({ backgroundColor: colors.brand });
    expect(screen.getByRole("header", { name: "Pets perto de você" })).toHaveStyle({ color: colors.white });
    expect(screen.getByText("Olá, Ana")).toBeOnTheScreen();
    expect(screen.getByText("Raio de 5 km")).toBeOnTheScreen();
    expect(screen.getByText("chips")).toBeOnTheScreen();
  });
});

describe("BottomNav (acabamento)", () => {
  it("rótulos com pelo menos 12 px; a aba ativa fica na cor da marca", async () => {
    await render(<BottomNav active="map" onNavigate={() => {}} />);
    expect(screen.getByText("Mapa")).toHaveStyle({ fontSize: 12, color: colors.brand });
    expect(screen.getByText("Início")).toHaveStyle({ color: colors.mutedForeground });
    expect(screen.getByRole("tab", { name: "Mapa", selected: true })).toBeOnTheScreen();
  });
});

describe("SideNav (telas largas)", () => {
  it("as mesmas abas, com a ativa marcada, e navega ao tocar", async () => {
    const onNavigate = jest.fn();
    await render(<SideNav active="alerts" onNavigate={onNavigate} />);
    expect(screen.getByRole("tab", { name: "Alertas", selected: true })).toBeOnTheScreen();
    expect(screen.getAllByRole("tab")).toHaveLength(5);
    await fireEvent.press(screen.getByRole("tab", { name: "Mapa" }));
    expect(onNavigate).toHaveBeenCalledWith("map");
    expect(screen.getByLabelText("Logo do Miaucha")).toBeOnTheScreen();
  });
});

describe("Centered", () => {
  it("limita a largura e centraliza", async () => {
    await render(
      <Centered maxWidth={720} testID="c">
        <Text>conteúdo</Text>
      </Centered>,
    );
    expect(screen.getByTestId("c")).toHaveStyle({ maxWidth: 720, width: "100%", alignSelf: "center" });
  });
});


describe("FilterChips (sobre a faixa laranja do cabeçalho)", () => {
  it("selecionado em branco com texto laranja legível; os outros em branco translúcido com texto branco", async () => {
    const onChange = jest.fn();
    const options = [{ key: "1", label: "1 km" }, { key: "5", label: "5 km" }];
    await render(<FilterChips options={options} value="5" onChange={onChange} />);
    expect(screen.getByRole("button", { name: "5 km" })).toHaveStyle({ backgroundColor: colors.white });
    expect(screen.getByText("5 km")).toHaveStyle({ color: colors.brandDeep });
    expect(screen.getByRole("button", { name: "1 km" })).toHaveStyle({ backgroundColor: withAlpha(colors.white, 0.2) });
    expect(screen.getByText("1 km")).toHaveStyle({ color: colors.white });
    await fireEvent.press(screen.getByRole("button", { name: "1 km" }));
    expect(onChange).toHaveBeenCalledWith("1");
  });
});

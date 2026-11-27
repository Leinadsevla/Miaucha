import { useWindowDimensions } from "react-native";

/** A partir desta largura (notebook, monitor, tablet deitado) as abas viram um menu lateral. */
export const WIDE_BREAKPOINT = 900;
export const SIDE_NAV_WIDTH = 240;
/** Largura máxima do conteúdo de leitura (detalhes, formulários, listas de uma coluna). */
export const READING_MAX_WIDTH = 720;
/** Largura máxima de grades e telas de lista em monitores grandes. */
export const PAGE_MAX_WIDTH = 1200;

/** Card de pet: largura mínima confortável, para decidir quantas colunas cabem. */
const MIN_CARD_WIDTH = 230;

export type Layout = { wide: boolean; petColumns: number; contentWidth: number };

export function layoutFor(width: number): Layout {
  const wide = width >= WIDE_BREAKPOINT;
  const contentWidth = wide ? width - SIDE_NAV_WIDTH : width;
  const usable = Math.min(contentWidth, PAGE_MAX_WIDTH) - 40;
  const petColumns = Math.max(2, Math.min(4, Math.floor(usable / MIN_CARD_WIDTH)));
  return { wide, petColumns, contentWidth };
}

export function useLayout(): Layout {
  return layoutFor(useWindowDimensions().width);
}

/** Para `contentContainerStyle` e blocos: largura total até `maxWidth`, centralizado. */
export function centered(maxWidth: number) {
  return { width: "100%" as const, maxWidth, alignSelf: "center" as const };
}

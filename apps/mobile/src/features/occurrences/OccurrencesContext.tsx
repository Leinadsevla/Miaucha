import { createContext, useContext, type ReactNode } from "react";
import type { OccurrencesClient } from "./occurrencesClient";

const OccurrencesContext = createContext<OccurrencesClient | null>(null);

export function OccurrencesClientProvider({ client, children }: { client: OccurrencesClient; children: ReactNode }) {
  return <OccurrencesContext.Provider value={client}>{children}</OccurrencesContext.Provider>;
}

export function useOccurrencesClient(): OccurrencesClient {
  const client = useContext(OccurrencesContext);
  if (!client) throw new Error("useOccurrencesClient precisa estar dentro de <OccurrencesClientProvider>");
  return client;
}

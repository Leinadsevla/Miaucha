import { createContext, useContext, type ReactNode } from "react";
import type { PetsClient } from "./petsClient";

const PetsContext = createContext<PetsClient | null>(null);

export function PetsClientProvider({ client, children }: { client: PetsClient; children: ReactNode }) {
  return <PetsContext.Provider value={client}>{children}</PetsContext.Provider>;
}

export function usePetsClient(): PetsClient {
  const client = useContext(PetsContext);
  if (!client) throw new Error("usePetsClient precisa estar dentro de <PetsClientProvider>");
  return client;
}

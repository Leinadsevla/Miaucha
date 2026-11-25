import { createContext, useContext, type ReactNode } from "react";
import type { ProfileClient } from "./profileClient";

const ProfileContext = createContext<ProfileClient | null>(null);

export function ProfileClientProvider({ client, children }: { client: ProfileClient; children: ReactNode }) {
  return <ProfileContext.Provider value={client}>{children}</ProfileContext.Provider>;
}

export function useProfileClient(): ProfileClient {
  const client = useContext(ProfileContext);
  if (!client) throw new Error("useProfileClient precisa estar dentro de <ProfileClientProvider>");
  return client;
}

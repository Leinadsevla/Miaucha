import { Tabs } from "expo-router";
import { BottomNav, SideNav, type TabName } from "@/components";
import { useLayout } from "@/lib/layout";

export default function TabsLayout() {
  // Telas largas (computador, tablet deitado): menu lateral; celular: barra de abas embaixo.
  const { wide } = useLayout();
  return (
    <Tabs
      screenOptions={{ headerShown: false, tabBarPosition: wide ? "left" : "bottom" }}
      tabBar={({ state, navigateToTab }) => {
        const active = state.routes[state.index].name as TabName;
        const onNavigate = (tab: TabName) => {
          const route = state.routes.find((r) => r.name === tab);
          if (route) navigateToTab(route.key);
        };
        return wide ? <SideNav active={active} onNavigate={onNavigate} /> : <BottomNav active={active} onNavigate={onNavigate} />;
      }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="map" />
      <Tabs.Screen name="alerts" />
      <Tabs.Screen name="chat" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}

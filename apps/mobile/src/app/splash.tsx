import { useCallback } from "react";
import { SplashView, useAuth } from "@/features/auth";

export default function Splash() {
  const { restore } = useAuth();
  const onFinish = useCallback(() => void restore(), [restore]);
  return <SplashView onFinish={onFinish} />;
}

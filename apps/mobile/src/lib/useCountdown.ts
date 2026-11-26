import { useEffect, useState } from "react";

/** Contagem regressiva em segundos, calculada pela hora de término (não atrasa se o app travar). */
export function useCountdown(total: number) {
  const [endsAt, setEndsAt] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (endsAt <= Date.now()) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [endsAt]);
  const left = Math.max(0, Math.ceil((endsAt - now) / 1000));
  return {
    left,
    start: () => {
      const t = Date.now();
      setNow(t);
      setEndsAt(t + total * 1000);
    },
  };
}


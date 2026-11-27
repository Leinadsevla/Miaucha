import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Easing, Platform } from "react-native";

/** Se o sistema pede menos movimento (acessibilidade): animações decorativas ficam paradas. */
export function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let alive = true;
    void AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => alive && setReduce(value))
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduce);
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);
  return reduce;
}

/** Valor que vai de 1 a `min` e volta, sem parar (pulsar, "respirar"). Parado em 1 com menos movimento. */
export function usePulse(min: number, durationMs: number): Animated.Value {
  const reduce = useReduceMotion();
  const value = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (reduce) {
      value.setValue(1);
      return;
    }
    const easing = Easing.inOut(Easing.ease);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(value, { toValue: min, duration: durationMs, easing, useNativeDriver: Platform.OS !== "web" }),
        Animated.timing(value, { toValue: 1, duration: durationMs, easing, useNativeDriver: Platform.OS !== "web" }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [reduce, value, min, durationMs]);
  return value;
}

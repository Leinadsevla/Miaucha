import { clsx, type ClassValue } from "clsx";

/** Mesmo papel do cn() do design.tsx. */
export function cn(...classes: ClassValue[]) {
  return clsx(classes);
}

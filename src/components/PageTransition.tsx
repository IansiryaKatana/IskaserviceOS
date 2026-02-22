import { ReactNode } from "react";

/**
 * Wraps route content so it enters with a smooth 2026-style animation.
 * Used when View Transitions API is not run (e.g. initial load or unsupported browser).
 */
export function PageTransition({ children }: { children: ReactNode }) {
  return <div className="page-transition-enter min-h-full">{children}</div>;
}

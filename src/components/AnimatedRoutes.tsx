import { useState, useEffect, ReactNode } from "react";
import { useLocation, Routes } from "react-router-dom";

declare global {
  interface Document {
    startViewTransition?(callback: () => void | Promise<void>): { finished: Promise<void> };
  }
}

/**
 * Wraps Routes and drives smooth 2026-style transitions:
 * - Uses View Transitions API when available (crossfade/slide between routes).
 * - Otherwise route changes render immediately; PageTransition on each route handles enter animation.
 */
export function AnimatedRoutes({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [displayLocation, setDisplayLocation] = useState(location);

  useEffect(() => {
    if (location.key === displayLocation.key) return;
    const update = () => setDisplayLocation(location);
    if (typeof document !== "undefined" && document.startViewTransition) {
      document.startViewTransition(update);
    } else {
      update();
    }
  }, [location, displayLocation.key]);

  return <Routes location={displayLocation}>{children}</Routes>;
}

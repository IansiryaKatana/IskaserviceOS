import { useThemeEngine } from "@/hooks/use-theme-engine";

/**
 * Component that activates the theme engine.
 * Place inside TenantProvider to dynamically inject CSS variables.
 */
export function ThemeInjector() {
  useThemeEngine();
  return null;
}

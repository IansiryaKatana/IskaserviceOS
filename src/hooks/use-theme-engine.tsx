import { useEffect } from "react";
import { useTenant, type TenantThemeConfig } from "./use-tenant";

function hexToHsl(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

/** Convert hex or hsl() string to HSL "H S% L%" for CSS variables. */
function toHslString(color: string): string | null {
  const c = color.trim();
  if (c.startsWith("#") && c.length >= 7) {
    return hexToHsl(c.slice(0, 7));
  }
  const hslMatch = c.match(/hsla?\(\s*(\d+)\s*,\s*(\d+(?:\.\d+)?)%\s*,\s*(\d+(?:\.\d+)?)%/i);
  if (hslMatch) {
    return `${hslMatch[1]} ${hslMatch[2]}% ${hslMatch[3]}%`;
  }
  return null;
}

/** Luminance (0–1) from HSL string "H S% L%". Used to pick white vs black text. */
function luminanceFromHsl(hsl: string): number {
  const parts = hsl.match(/(\d+)\s+(\d+)%\s+(\d+)%/);
  if (!parts) return 0.5;
  const l = Number(parts[3]) / 100;
  return l;
}

/**
 * Injects tenant theme_config as CSS variables on :root.
 * Runs reactively whenever tenant changes.
 */
export function useThemeEngine() {
  const { tenant } = useTenant();

  useEffect(() => {
    // Always set default platform title first
    document.title = "Iska Service OS";
    
    // Set default title for platform pages (no tenant)
    if (!tenant) {
      return;
    }

    if (!tenant?.theme_config) {
      // If tenant exists but no theme config, still use tenant name for tenant pages
      if (tenant.name) {
        document.title = tenant.name;
      }
      return;
    }
    
    const tc = tenant.theme_config;
    const root = document.documentElement;

    // Always inject primary from tenant branding (merged with defaults so primary_color is always set)
    const primaryHsl = (tc.primary_color && toHslString(tc.primary_color)) || hexToHsl("#000000");
    {
      root.style.setProperty("--primary", primaryHsl);
      root.style.setProperty("--ring", primaryHsl);
      root.style.setProperty("--accent", primaryHsl);
      root.style.setProperty("--sidebar-primary", primaryHsl);
      root.style.setProperty("--sidebar-ring", primaryHsl);
      // Selected-state text: use tenant primary_foreground if set, else derive from primary luminance
      const foregroundHsl = (tc.primary_foreground && toHslString(tc.primary_foreground))
        ?? (luminanceFromHsl(primaryHsl) < 0.5 ? "0 0% 100%" : "0 0% 0%");
      root.style.setProperty("--primary-foreground", foregroundHsl);
    }

    // Inject accent as olive-light equivalent
    if (tc.accent_color) {
      const accentHsl = toHslString(tc.accent_color) || hexToHsl("#C9A227");
      root.style.setProperty("--olive-light", accentHsl);
    }

    // Tag colors
    if (tc.tag_color_a) {
      root.style.setProperty("--tag-color-a", tc.tag_color_a);
    }
    if (tc.tag_color_b) {
      root.style.setProperty("--tag-color-b", tc.tag_color_b);
    }

    // Fonts
    if (tc.font_primary) {
      root.style.setProperty("--font-body", `'${tc.font_primary}', sans-serif`);
    }
    if (tc.font_secondary) {
      root.style.setProperty("--font-display", `'${tc.font_secondary}', serif`);
    }

    // Border radius
    if (tc.border_radius) {
      root.style.setProperty("--radius", tc.border_radius);
    }

    // Favicon
    if (tenant.favicon_url) {
      const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
      if (link) link.href = tenant.favicon_url;
    }

    // Document title - use tenant name if available, otherwise use platform name
    if (tenant.name) {
      document.title = tenant.name;
    } else {
      document.title = "Iska Service OS";
    }

    return () => {
      // Cleanup: remove inline styles when unmounting so platform defaults restore
      const props = [
        "--primary", "--primary-foreground", "--ring", "--accent", "--sidebar-primary", "--sidebar-ring",
        "--olive-light", "--tag-color-a", "--tag-color-b",
        "--font-body", "--font-display", "--radius",
      ];
      props.forEach((p) => root.style.removeProperty(p));
    };
  }, [tenant]);
}

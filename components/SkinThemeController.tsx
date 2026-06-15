"use client";

import { useSkinTheme } from "@/src/theme/useSkinTheme";

export function SkinThemeController() {
  const { theme } = useSkinTheme();

  return (
    <div className="skin-theme-label" aria-live="polite">
      Inspired by {theme.name}
    </div>
  );
}

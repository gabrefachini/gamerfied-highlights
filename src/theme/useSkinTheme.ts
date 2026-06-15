"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { getRandomSkinTheme, getThemeById, SKIN_THEMES, type SkinTheme } from "./skinThemes";

const SESSION_STORAGE_KEY = "gamerfied-highlights-skin-theme";

const fallbackTheme = SKIN_THEMES[0];

const textureClasses = SKIN_THEMES.map((theme) => theme.subtleTextureClass).filter(Boolean) as string[];

function getCssVars(theme: SkinTheme) {
  return {
    "--skin-bg": theme.background,
    "--skin-fg": theme.foreground,
    "--skin-accent": theme.accent,
    "--skin-muted-accent": theme.mutedAccent,
    "--skin-border-accent": theme.borderAccent
  } as const;
}

export function useSkinTheme() {
  const searchParams = useSearchParams();
  const queryThemeId = searchParams.get("theme");
  const [theme, setTheme] = useState<SkinTheme>(fallbackTheme);

  useEffect(() => {
    const queryTheme = getThemeById(queryThemeId);
    const storedTheme = getThemeById(window.sessionStorage.getItem(SESSION_STORAGE_KEY));
    const resolvedTheme = queryTheme || storedTheme || getRandomSkinTheme();

    window.sessionStorage.setItem(SESSION_STORAGE_KEY, resolvedTheme.id);
    setTheme(resolvedTheme);
  }, [queryThemeId]);

  const cssVars = useMemo(() => getCssVars(theme), [theme]);

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;

    root.dataset.skinMode = theme.baseMode;
    root.dataset.skinTheme = theme.id;
    root.style.colorScheme = theme.baseMode;

    Object.entries(cssVars).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });

    body.classList.remove(...textureClasses);
    if (theme.subtleTextureClass) {
      body.classList.add(theme.subtleTextureClass);
    }
  }, [cssVars, theme]);

  return { theme, cssVars };
}

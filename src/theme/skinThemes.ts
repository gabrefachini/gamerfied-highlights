export type SkinTheme = {
  id: string;
  name: string;
  baseMode: "light" | "dark";
  accent: string;
  mutedAccent: string;
  borderAccent: string;
  background: string;
  foreground: string;
  subtleTextureClass?: string;
};

export const SKIN_THEMES: SkinTheme[] = [
  {
    id: "printstream",
    name: "Printstream",
    baseMode: "light",
    accent: "#dde4ea",
    mutedAccent: "#eef3f6",
    borderAccent: "#c9d5de",
    background: "#f7f6f2",
    foreground: "#121212",
    subtleTextureClass: "skin-texture-printstream"
  },
  {
    id: "redline",
    name: "Redline",
    baseMode: "dark",
    accent: "#b43434",
    mutedAccent: "#462425",
    borderAccent: "#8e2628",
    background: "#111111",
    foreground: "#f2f2f2",
    subtleTextureClass: "skin-texture-redline"
  },
  {
    id: "medusa",
    name: "Medusa",
    baseMode: "dark",
    accent: "#4f7f7d",
    mutedAccent: "#203c3e",
    borderAccent: "#3d6a69",
    background: "#0d0f10",
    foreground: "#edf0ef",
    subtleTextureClass: "skin-texture-medusa"
  },
  {
    id: "dragon-lore",
    name: "Dragon Lore",
    baseMode: "light",
    accent: "#b78b3f",
    mutedAccent: "#efe5cf",
    borderAccent: "#a67b30",
    background: "#f6f4ee",
    foreground: "#171411",
    subtleTextureClass: "skin-texture-dragon-lore"
  },
  {
    id: "asiimov",
    name: "Asiimov",
    baseMode: "light",
    accent: "#d87a2f",
    mutedAccent: "#f7eadf",
    borderAccent: "#c46925",
    background: "#fbfaf6",
    foreground: "#111111",
    subtleTextureClass: "skin-texture-asiimov"
  },
  {
    id: "fire-serpent",
    name: "Fire Serpent",
    baseMode: "dark",
    accent: "#6d8661",
    mutedAccent: "#42372d",
    borderAccent: "#8a5d38",
    background: "#0f0f0d",
    foreground: "#ece9e1",
    subtleTextureClass: "skin-texture-fire-serpent"
  },
  {
    id: "vulcan",
    name: "Vulcan",
    baseMode: "dark",
    accent: "#3d71b7",
    mutedAccent: "#1b2940",
    borderAccent: "#4f87d5",
    background: "#101215",
    foreground: "#f2f5f8",
    subtleTextureClass: "skin-texture-vulcan"
  },
  {
    id: "fade",
    name: "Fade",
    baseMode: "dark",
    accent: "#c38ebb",
    mutedAccent: "#302235",
    borderAccent: "#a974bb",
    background: "#0f0d12",
    foreground: "#f4f0f6",
    subtleTextureClass: "skin-texture-fade"
  },
  {
    id: "hyper-beast",
    name: "Hyper Beast",
    baseMode: "dark",
    accent: "#cf4ca2",
    mutedAccent: "#285460",
    borderAccent: "#4fa7ba",
    background: "#0d1012",
    foreground: "#f3f5f6",
    subtleTextureClass: "skin-texture-hyper-beast"
  },
  {
    id: "howl",
    name: "Howl",
    baseMode: "dark",
    accent: "#a73f30",
    mutedAccent: "#4d231d",
    borderAccent: "#cb6938",
    background: "#110f0f",
    foreground: "#f4efec",
    subtleTextureClass: "skin-texture-howl"
  }
];

export function getRandomSkinTheme() {
  return SKIN_THEMES[Math.floor(Math.random() * SKIN_THEMES.length)];
}

export function getThemeById(id: string | null | undefined) {
  if (!id) return null;
  return SKIN_THEMES.find((theme) => theme.id === id.toLowerCase()) || null;
}

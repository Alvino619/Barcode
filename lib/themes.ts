import { pageThemeSchema, type PageTheme } from "./schemas/page";

export const themePresets: { name: string; theme: PageTheme }[] = [
  { name: "Bersih", theme: pageThemeSchema.parse({ font: "inter" }) },
  { name: "Daun", theme: pageThemeSchema.parse({ backgroundColor: "#ecfdf5", gradientColor: "#a7f3d0", textColor: "#064e3b", backgroundStyle: "gradient", font: "nunito", defaultRadius: 24 }) },
  { name: "Editorial", theme: pageThemeSchema.parse({ backgroundColor: "#fff7ed", textColor: "#431407", font: "lora", defaultRadius: 4, cardGap: 24 }) },
  { name: "Malam", theme: pageThemeSchema.parse({ backgroundColor: "#0f172a", gradientColor: "#312e81", textColor: "#f8fafc", backgroundStyle: "gradient", font: "poppins" }) },
];
export const fontFamilies: Record<PageTheme["font"], string> = {
  sans: "var(--font-inter), sans-serif", serif: "var(--font-lora), serif", mono: "var(--font-roboto-mono), monospace",
  inter: "var(--font-inter), sans-serif", lora: "var(--font-lora), serif", "roboto-mono": "var(--font-roboto-mono), monospace",
  poppins: "var(--font-poppins), sans-serif", nunito: "var(--font-nunito), sans-serif", playfair: "var(--font-playfair), serif",
};

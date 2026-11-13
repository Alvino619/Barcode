import type { CSSProperties } from "react";
import type { PageTheme } from "./schemas/page";
import type { ValidatedCard } from "./schemas/card";
import { fontFamilies } from "./themes";

type Variables = CSSProperties & Record<`--${string}`, string | number>;
export function themeVariables(theme: PageTheme): Variables {
  return {
    "--page-bg": theme.backgroundColor, "--page-text": theme.textColor,
    "--page-font": fontFamilies[theme.font], "--page-width": `${theme.contentWidth}px`,
    "--page-gap": `${theme.cardGap}px`, "--page-radius": `${theme.defaultRadius}px`,
    "--page-gradient": theme.backgroundStyle === "gradient" ? `linear-gradient(145deg, ${theme.backgroundColor}, ${theme.gradientColor})` : "none",
    "--page-dots": theme.backgroundStyle === "dots" ? `radial-gradient(${theme.textColor}22 1px, transparent 1px)` : "none",
  };
}
export function cardVariables(card: ValidatedCard): Variables {
  const style = card.style;
  const variables: Variables = {
    "--card-bg": style.backgroundColor, "--card-text": style.textColor,
    "--card-radius": `${style.radius}px`, "--card-padding": `${style.padding}px`,
    "--card-align": style.alignment,
    "--card-justify": style.alignment === "left" ? "flex-start" : style.alignment === "right" ? "flex-end" : "center",
  };
  if (card.type === "TEXT") {
    variables["--text-size"] = `${card.style.fontSize}px`;
    variables["--text-weight"] = { normal: 400, medium: 500, bold: 700 }[card.style.fontWeight];
  }
  if (card.type === "IMAGE") {
    variables["--media-fit"] = card.style.objectFit;
    variables["--media-ratio"] = card.style.aspectRatio === "auto" ? "4 / 3" : card.style.aspectRatio.replace(":", " / ");
  }
  if (card.type === "VIDEO_EMBED") variables["--video-ratio"] = card.style.aspectRatio.replace(":", " / ");
  if (card.type === "MAP") variables["--map-height"] = `${card.style.height}px`;
  if (card.type === "DIVIDER") {
    variables["--divider-style"] = card.style.lineStyle;
    variables["--divider-width"] = `${card.style.thickness}px`;
  }
  if (card.type === "GALLERY") {
    variables["--gallery-columns"] = card.style.columns;
    variables["--gallery-gap"] = `${card.style.gap}px`;
  }
  return variables;
}

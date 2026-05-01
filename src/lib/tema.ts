import { useEffect } from "react";
import { fetchTema, TEMA_PADRAO, type Tema } from "@/lib/github";

// Converte CSS color (#hex / rgb) para "H S% L%" usado pelos tokens.
function toHslTriplet(input: string): string | null {
  const m = input.trim().match(/^(\d{1,3})\s+(\d{1,3})%\s+(\d{1,3})%$/);
  if (m) return input.trim();
  // hex #rgb / #rrggbb
  let hex = input.trim();
  const hexMatch = hex.match(/^#([\da-f]{3}|[\da-f]{6})$/i);
  if (!hexMatch) return null;
  if (hex.length === 4) hex = "#" + hex.slice(1).split("").map((c) => c + c).join("");
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0; const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export function applyTema(tema: Tema) {
  const root = document.documentElement;
  const p = toHslTriplet(tema.primary);
  const a = toHslTriplet(tema.accent);
  if (p) root.style.setProperty("--primary", p);
  if (a) {
    root.style.setProperty("--accent", a);
    root.style.setProperty("--ring", p || a);
  }
  // Recalcula gradiente do hero para acompanhar o primary
  if (p) {
    root.style.setProperty(
      "--gradient-hero",
      `linear-gradient(135deg, hsl(${p}) 0%, hsl(${a || p}) 100%)`
    );
  }
  // Background do site
  document.body.style.background = tema.background || "";
  document.body.style.backgroundAttachment = tema.background?.includes("url(") ? "fixed" : "";
  document.body.style.backgroundSize = tema.background?.includes("url(") ? "cover" : "";
}

export function useTema() {
  useEffect(() => {
    fetchTema().then(({ tema }) => applyTema(tema)).catch(() => applyTema(TEMA_PADRAO));
  }, []);
}

"use client";

import { useEffect } from "react";
import { usePlayer } from "@/store/player";
import { extractDominantColor, adjustColor } from "@/lib/color-extract";
import { largeArtwork } from "@/lib/soundcloud-utils";

/**
 * useDynamicTheme — watches the currently-playing track and extracts its
 * dominant color, then applies it as CSS variables on :root so the entire
 * app can theme itself based on the cover art.
 *
 * CSS variables set:
 *   --accent: the primary theme color (e.g. "#ff5500")
 *   --accent-hover: a slightly lighter version for hover states
 *   --accent-foreground: readable text color on top of --accent (black or white)
 *
 * When dynamic theming is disabled or no track is playing, these fall back
 * to the default orange (#ff5500) theme.
 */
export function useDynamicTheme() {
  const queue = usePlayer((s) => s.queue);
  const currentIndex = usePlayer((s) => s.currentIndex);
  const dynamicTheme = usePlayer((s) => s.dynamicTheme);
  const setThemeColor = usePlayer((s) => s.setThemeColor);

  const track = currentIndex >= 0 ? queue[currentIndex] : null;
  const artworkUrl = track ? largeArtwork(track.artwork_url) : null;

  useEffect(() => {
    if (!dynamicTheme || !artworkUrl) {
      applyThemeColor(null);
      setThemeColor(null);
      return;
    }

    let cancelled = false;
    extractDominantColor(artworkUrl).then((color) => {
      if (cancelled) return;
      if (color) {
        applyThemeColor(color.hex);
        setThemeColor(color.hex);
      } else {
        applyThemeColor(null);
        setThemeColor(null);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [artworkUrl, dynamicTheme, setThemeColor]);
}

/**
 * Apply the theme color as CSS variables on :root.
 * Pass null to reset to the default orange theme.
 */
function applyThemeColor(hex: string | null) {
  const root = document.documentElement;
  if (!hex) {
    // Reset to default orange
    root.style.setProperty("--theme-accent", "#ff5500");
    root.style.setProperty("--theme-accent-hover", "#ff6b1a");
    root.style.setProperty("--theme-accent-foreground", "#ffffff");
    root.style.setProperty("--theme-accent-muted", "rgba(255, 85, 0, 0.15)");
  } else {
    root.style.setProperty("--theme-accent", hex);
    root.style.setProperty("--theme-accent-hover", adjustColor(hex, 8));
    root.style.setProperty("--theme-accent-foreground", "#ffffff");
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    root.style.setProperty("--theme-accent-muted", `rgba(${r}, ${g}, ${b}, 0.15)`);
  }
}

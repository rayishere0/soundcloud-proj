"use client";

/**
 * Color extraction utilities for dynamic UI theming.
 *
 * Extracts the dominant color from an image URL using a canvas, then returns
 * a palette (primary + foreground) suitable for theming the app.
 */

export interface ThemeColor {
  /** Primary color as a hex string, e.g. "#ff5500" */
  hex: string;
  /** RGB object */
  rgb: { r: number; g: number; b: number };
  /** HSL object */
  hsl: { h: number; s: number; l: number };
  /** A readable foreground color (white or black) for the primary */
  foreground: string;
}

// In-memory cache so we don't re-extract the same image every render.
const cache = new Map<string, ThemeColor | null>();

/**
 * Extract the dominant color from an image URL.
 *
 * Uses a downscaled canvas + simple color quantization (buckets by hue) to
 * find the most vibrant, representative color. Falls back to null if the
 * image can't be loaded (CORS, 404, etc).
 *
 * Results are cached per-URL.
 */
export async function extractDominantColor(
  imageUrl: string
): Promise<ThemeColor | null> {
  // Check cache first
  if (cache.has(imageUrl)) {
    return cache.get(imageUrl) ?? null;
  }

  try {
    const img = await loadImage(imageUrl);
    const color = extractColorFromImage(img);
    cache.set(imageUrl, color);
    return color;
  } catch (e) {
    // Cache the failure so we don't keep retrying broken URLs
    cache.set(imageUrl, null);
    return null;
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.referrerPolicy = "no-referrer";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = src;
  });
}

function extractColorFromImage(img: HTMLImageElement): ThemeColor | null {
  // Downscale to 50x50 for fast processing
  const size = 50;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  try {
    ctx.drawImage(img, 0, 0, size, size);
  } catch (e) {
    // tainted canvas — CORS issue
    return null;
  }

  let imageData: ImageData;
  try {
    imageData = ctx.getImageData(0, 0, size, size);
  } catch (e) {
    // tainted canvas — CORS issue
    return null;
  }

  // Bucket pixels by hue, weighted by saturation.
  // This finds the most vibrant, representative color rather than just the
  // most common (which is often a dull grey/black on dark artwork).
  const buckets = new Map<
    string,
    { r: number; g: number; b: number; count: number; weight: number }
  >();

  for (let i = 0; i < imageData.data.length; i += 4) {
    const r = imageData.data[i];
    const g = imageData.data[i + 1];
    const b = imageData.data[i + 2];
    const a = imageData.data[i + 3];

    // Skip transparent pixels
    if (a < 128) continue;

    // Skip very dark pixels (they dominate dark artwork and aren't useful as a theme color)
    const max = Math.max(r, g, b);
    if (max < 30) continue;

    // Skip near-white pixels too
    const min = Math.min(r, g, b);
    if (min > 230) continue;

    const hsl = rgbToHsl(r, g, b);

    // Skip very desaturated colors (greys) — we want a vibrant theme color
    if (hsl.s < 0.15) continue;

    // Bucket by hue (36 buckets of 10 degrees each)
    const hueBucket = Math.floor(hsl.h / 10) * 10;
    const key = `${hueBucket}`;

    // Weight: prefer saturated, mid-lightness colors
    const weight = hsl.s * (1 - Math.abs(hsl.l - 0.5) * 0.8);

    const existing = buckets.get(key);
    if (existing) {
      existing.r += r;
      existing.g += g;
      existing.b += b;
      existing.count += 1;
      existing.weight += weight;
    } else {
      buckets.set(key, { r, g, b, count: 1, weight });
    }
  }

  if (buckets.size === 0) {
    // Fallback: just average all pixels
    let totalR = 0,
      totalG = 0,
      totalB = 0,
      count = 0;
    for (let i = 0; i < imageData.data.length; i += 4) {
      const a = imageData.data[i + 3];
      if (a < 128) continue;
      totalR += imageData.data[i];
      totalG += imageData.data[i + 1];
      totalB += imageData.data[i + 2];
      count++;
    }
    if (count === 0) return null;
    const r = Math.round(totalR / count);
    const g = Math.round(totalG / count);
    const b = Math.round(totalB / count);
    return buildThemeColor(r, g, b);
  }

  // Find the bucket with the highest total weight
  let bestBucket: { r: number; g: number; b: number; count: number; weight: number } | null = null;
  for (const bucket of buckets.values()) {
    if (!bestBucket || bucket.weight > bestBucket.weight) {
      bestBucket = bucket;
    }
  }

  if (!bestBucket) return null;

  const r = Math.round(bestBucket.r / bestBucket.count);
  const g = Math.round(bestBucket.g / bestBucket.count);
  const b = Math.round(bestBucket.b / bestBucket.count);

  return buildThemeColor(r, g, b);
}

function buildThemeColor(r: number, g: number, b: number): ThemeColor {
  const hex = rgbToHex(r, g, b);
  const hsl = rgbToHsl(r, g, b);
  const foreground = hsl.l > 0.55 ? "#000000" : "#ffffff";
  return { hex, rgb: { r, g, b }, hsl, foreground };
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => n.toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return { h: h * 360, s, l };
}

/**
 * Generate a color with adjusted lightness from a hex color.
 * Useful for creating hover states, borders, etc. from the primary color.
 */
export function adjustColor(hex: string, lightnessDelta: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const hsl = rgbToHsl(r, g, b);
  const newL = Math.max(0, Math.min(1, hsl.l + lightnessDelta / 100));
  return hslToHex(hsl.h, hsl.s, newL);
}

function hslToHex(h: number, s: number, l: number): string {
  const hslToRgb = (h: number, s: number, l: number) => {
    h /= 360;
    let r: number, g: number, b: number;
    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
  };
  const [r, g, b] = hslToRgb(h, s, l);
  return rgbToHex(r, g, b);
}

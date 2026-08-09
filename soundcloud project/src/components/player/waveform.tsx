"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";

interface WaveformProps {
  progress: number; // 0..1
  duration: number; // seconds
  onSeek?: (ratio: number) => void;
  height?: number;
  barCount?: number;
  className?: string;
  /** Color of the played portion. Defaults to the dynamic theme accent color. */
  playedColor?: string;
  unplayedColor?: string;
  seed?: number;
}

/**
 * Static pseudo-random waveform (since the SC waveform endpoint returns
 * a PNG we don't render). Looks like SoundCloud's orange waveform.
 *
 * The played portion uses the dynamic theme accent color (var(--theme-accent))
 * by default, so the waveform recolors itself based on the current track's
 * cover art.
 */
export function Waveform({
  progress,
  duration: _duration,
  onSeek,
  height = 48,
  barCount = 180,
  className,
  playedColor = "var(--theme-accent)",
  unplayedColor = "#3a3a3a",
  seed = 0,
}: WaveformProps) {
  const bars = useMemo(() => {
    // Deterministic pseudo-random heights using a mulberry32 PRNG
    const s = (seed || 1) >>> 0;
    let x = s;
    const rng = () => {
      x |= 0;
      x = (x + 0x6d2b79f5) | 0;
      let t = Math.imul(x ^ (x >>> 15), 1 | x);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const arr: number[] = [];
    for (let i = 0; i < barCount; i++) {
      // Taper toward the edges so it looks more like a real waveform
      const edge = 1 - Math.abs((i / (barCount - 1)) * 2 - 1) * 0.35;
      const h = Math.max(0.18, Math.min(1, rng() * 1.4 * edge));
      arr.push(h);
    }
    return arr;
  }, [barCount, seed]);

  const playedIndex = Math.floor(progress * barCount);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!onSeek) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    onSeek(Math.max(0, Math.min(1, ratio)));
  };

  return (
    <div
      className={cn("flex items-end gap-[1px] w-full cursor-pointer select-none", className)}
      style={{ height }}
      onClick={handleClick}
      role="slider"
      aria-valuenow={Math.round(progress * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
      tabIndex={0}
    >
      {bars.map((h, i) => {
        const isPlayed = i <= playedIndex;
        return (
          <div
            key={i}
            className="waveform-bar flex-1 rounded-full"
            style={{
              height: `${h * 100}%`,
              backgroundColor: isPlayed ? playedColor : unplayedColor,
              minHeight: "2px",
              transform: "translateZ(0)",
            }}
          />
        );
      })}
    </div>
  );
}

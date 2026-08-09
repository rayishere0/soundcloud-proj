"use client";

import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  X,
  Maximize2,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { usePlayer } from "@/store/player";
import { cn } from "@/lib/utils";
import { largeArtwork, formatDuration } from "@/lib/soundcloud-utils";

interface MiniPlayerProps {
  className?: string;
}

export function MiniPlayer({ className }: MiniPlayerProps) {
  const queue = usePlayer((s) => s.queue);
  const currentIndex = usePlayer((s) => s.currentIndex);
  const isPlaying = usePlayer((s) => s.isPlaying);
  const currentTime = usePlayer((s) => s.currentTime);
  const duration = usePlayer((s) => s.duration);

  const togglePlay = usePlayer((s) => s.togglePlay);
  const next = usePlayer((s) => s.next);
  const prev = usePlayer((s) => s.prev);
  const setMiniPlayer = usePlayer((s) => s.setMiniPlayer);
  const setView = usePlayer((s) => s.setView);
  const showQueue = usePlayer((s) => s.showQueue);

  const track = currentIndex >= 0 ? queue[currentIndex] : null;
  if (!track) return null;

  const artwork = largeArtwork(track.artwork_url);
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      className={cn(
        "fixed bottom-4 z-50 w-80 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg shadow-2xl overflow-hidden",
        "animate-in slide-in-from-bottom-4 duration-300",
        // Shift left when the queue panel is open so they don't overlap
        showQueue ? "right-96" : "right-4",
        className
      )}
    >
      {/* Artwork */}
      <div className="relative aspect-square bg-[#0a0a0a]">
        {artwork ? (
          <img src={artwork} alt={track.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[var(--theme-accent)]/30 to-[#1a1a1a]" />
        )}

        {/* Top-right controls */}
        <div className="absolute top-2 right-2 flex gap-1">
          <button
            onClick={() => setMiniPlayer(false)}
            className="size-7 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur"
            title="Expand to large player"
          >
            <Maximize2 className="size-3.5" />
          </button>
          <button
            onClick={() => setMiniPlayer(false)}
            className="size-7 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur"
            title="Close"
          >
            <X className="size-3.5" />
          </button>
        </div>

        {/* Top-left tag */}
        <div className="absolute top-2 left-2">
          <span className="text-[10px] uppercase tracking-wider bg-black/60 text-white px-1.5 py-0.5 rounded backdrop-blur">
            Mini
          </span>
        </div>

        {/* Bottom gradient overlay with title */}
        <div className="absolute bottom-0 inset-x-0 p-2 bg-gradient-to-t from-black/90 via-black/60 to-transparent">
          <button
            onClick={() => setView({ kind: "track", id: String(track.id), title: track.title })}
            className="block w-full text-left text-sm font-semibold text-white truncate hover:text-[var(--theme-accent-hover)]"
            title={track.title}
          >
            {track.title}
          </button>
          <button
            onClick={() => setView({ kind: "search", query: track.user.username })}
            className="block w-full text-left text-xs text-white/70 truncate hover:text-white"
            title={track.user.username}
          >
            {track.user.username}
          </button>
        </div>
      </div>

      {/* Progress bar (thin, just visual) */}
      <div className="h-1 bg-[#2a2a2a] relative">
        <div
          className="absolute inset-y-0 left-0 bg-[var(--theme-accent)]"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Transport controls */}
      <div className="flex items-center justify-between px-4 py-3">
        <button
          onClick={prev}
          className="text-white/70 hover:text-white p-1"
          title="Previous"
        >
          <SkipBack className="size-4 fill-current" />
        </button>
        <button
          onClick={togglePlay}
          className="size-10 rounded-full border-2 border-white text-white hover:bg-white hover:text-black flex items-center justify-center transition-colors"
          title={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? (
            <Pause className="size-4 fill-current" />
          ) : (
            <Play className="size-4 fill-current ml-0.5" />
          )}
        </button>
        <button
          onClick={next}
          className="text-white/70 hover:text-white p-1"
          title="Next"
        >
          <SkipForward className="size-4 fill-current" />
        </button>
      </div>

      {/* Time display */}
      <div className="px-4 pb-2 flex items-center justify-between text-[10px] tabular-nums text-white/50">
        <span>{formatDuration(currentTime * 1000)}</span>
        <span>{formatDuration(duration * 1000)}</span>
      </div>
    </div>
  );
}

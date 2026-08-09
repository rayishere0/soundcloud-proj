"use client";

import {
  Play,
  Pause,
  SkipForward,
} from "lucide-react";
import { usePlayer } from "@/store/player";
import { cn } from "@/lib/utils";
import { largeArtwork } from "@/lib/soundcloud-utils";
import { ExpandedPlayer } from "./expanded-player";

interface MobilePlayerProps {
  className?: string;
}

/**
 * MobilePlayer — Android-optimized player for touch devices.
 *
 * Two states:
 *  - Collapsed (default): compact bar showing thumbnail + title/artist only.
 *    NO transport controls visible except play/pause + skip. Tapping the
 *    thumbnail expands to the large player with ALL controls.
 *  - Expanded: full-screen overlay (delegates to the shared ExpandedPlayer
 *    component with variant="mobile").
 */
export function MobilePlayer({ className }: MobilePlayerProps) {
  const queue = usePlayer((s) => s.queue);
  const currentIndex = usePlayer((s) => s.currentIndex);
  const expanded = usePlayer((s) => s.mobilePlayerExpanded);
  const setMobilePlayerExpanded = usePlayer((s) => s.setMobilePlayerExpanded);

  const track = currentIndex >= 0 ? queue[currentIndex] : null;

  if (!track) {
    return (
      <div
        className={cn(
          "h-14 flex items-center justify-center bg-[#0a0a0a] border-t border-[#1f1f1f] text-muted-foreground text-xs",
          className
        )}
      >
        Select a track to start playing
      </div>
    );
  }

  if (expanded) {
    return (
      <ExpandedPlayer
        variant="mobile"
        onClose={() => setMobilePlayerExpanded(false)}
      />
    );
  }
  return <CollapsedMobilePlayer />;
}

function CollapsedMobilePlayer() {
  const queue = usePlayer((s) => s.queue);
  const currentIndex = usePlayer((s) => s.currentIndex);
  const isPlaying = usePlayer((s) => s.isPlaying);
  const currentTime = usePlayer((s) => s.currentTime);
  const duration = usePlayer((s) => s.duration);
  const setMobilePlayerExpanded = usePlayer((s) => s.setMobilePlayerExpanded);
  const togglePlay = usePlayer((s) => s.togglePlay);
  const next = usePlayer((s) => s.next);

  const track = queue[currentIndex];
  const artwork = largeArtwork(track.artwork_url);
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="relative bg-[#0a0a0a] border-t border-[#1f1f1f] select-none">
      {/* Tappable area — clicking anywhere except the play/pause/skip buttons
          expands to the full-screen large player. */}
      <button
        onClick={() => setMobilePlayerExpanded(true)}
        className="w-full flex items-center gap-3 px-3 py-2.5 min-h-14"
        aria-label="Expand player"
      >
        {/* Thumbnail (left) — clicking here (or anywhere on the bar) expands */}
        <div className="size-10 rounded overflow-hidden bg-[#1a1a1a] shrink-0">
          {artwork ? (
            <img src={artwork} alt={track.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[var(--theme-accent)]/30 to-[#1a1a1a]" />
          )}
        </div>
        {/* Title + artist */}
        <div className="flex-1 min-w-0 text-left">
          <div className="text-sm font-medium text-white truncate" title={track.title}>
            {track.title}
          </div>
          <div className="text-xs text-muted-foreground truncate" title={track.user.username}>
            {track.user.username}
          </div>
        </div>
        {/* Play/pause button — stops propagation so it doesn't expand */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            togglePlay();
          }}
          className="size-9 rounded-full text-white flex items-center justify-center active:scale-95 transition-transform"
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? (
            <Pause className="size-6 fill-current" />
          ) : (
            <Play className="size-6 fill-current" />
          )}
        </button>
        {/* Skip button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            next();
          }}
          className="size-9 flex items-center justify-center text-white active:scale-95 transition-transform"
          aria-label="Next"
        >
          <SkipForward className="size-5 fill-current" />
        </button>
      </button>
      {/* Thin progress bar at the very bottom */}
      <div className="absolute bottom-0 inset-x-0 h-0.5 bg-[#1f1f1f]">
        <div className="h-full bg-[var(--theme-accent)]" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}

"use client";

import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ChevronDown,
  Shuffle,
  Repeat,
  Repeat1,
  Volume2,
  Volume1,
  VolumeX,
  Infinity as InfinityIcon,
  ListMusic,
} from "lucide-react";
import { usePlayer } from "@/store/player";
import { cn } from "@/lib/utils";
import { largeArtwork, formatDuration } from "@/lib/soundcloud-utils";
import { Waveform } from "./waveform";
import { ArtworkImage } from "@/components/soundcloud/artwork-image";
import { LikeButton } from "@/components/soundcloud/like-button";
import { AddToPlaylistButton } from "@/components/soundcloud/add-to-playlist";

interface ExpandedPlayerProps {
  /** "mobile" = full-screen overlay, "desktop" = centered modal panel */
  variant: "mobile" | "desktop";
  onClose: () => void;
}

/**
 * ExpandedPlayer — a full-featured "now playing" view with large artwork,
 * waveform seek bar, and ALL transport controls (play/pause, skip, shuffle,
 * repeat, volume, autoplay toggle, like, add-to-playlist, queue toggle).
 *
 * Used in two variants:
 *  - "mobile": full-screen overlay (covers entire viewport), triggered by
 *    tapping the thumbnail in the collapsed mobile player bar.
 *  - "desktop": centered modal panel that floats over the app, triggered by
 *    clicking the artwork in the desktop LargePlayer bottom bar.
 */
export function ExpandedPlayer({ variant, onClose }: ExpandedPlayerProps) {
  const queue = usePlayer((s) => s.queue);
  const currentIndex = usePlayer((s) => s.currentIndex);
  const isPlaying = usePlayer((s) => s.isPlaying);
  const currentTime = usePlayer((s) => s.currentTime);
  const duration = usePlayer((s) => s.duration);
  const volume = usePlayer((s) => s.volume);
  const muted = usePlayer((s) => s.muted);
  const repeat = usePlayer((s) => s.repeat);
  const shuffle = usePlayer((s) => s.shuffle);
  const autoplay = usePlayer((s) => s.autoplay);
  const showQueue = usePlayer((s) => s.showQueue);

  const togglePlay = usePlayer((s) => s.togglePlay);
  const next = usePlayer((s) => s.next);
  const prev = usePlayer((s) => s.prev);
  const seek = usePlayer((s) => s.seek);
  const setVolume = usePlayer((s) => s.setVolume);
  const toggleMute = usePlayer((s) => s.toggleMute);
  const cycleRepeat = usePlayer((s) => s.cycleRepeat);
  const toggleShuffle = usePlayer((s) => s.toggleShuffle);
  const toggleAutoplay = usePlayer((s) => s.toggleAutoplay);
  const setShowQueue = usePlayer((s) => s.setShowQueue);
  const setView = usePlayer((s) => s.setView);

  const track = currentIndex >= 0 ? queue[currentIndex] : null;

  // If there's no track, don't render — the caller should have guarded already.
  if (!track) {
    onClose();
    return null;
  }

  const artwork = largeArtwork(track.artwork_url);
  const progress = duration > 0 ? currentTime / duration : 0;
  const VolumeIcon =
    muted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  const isMobile = variant === "mobile";

  return (
    <div
      className={cn(
        "z-50 bg-[#0a0a0a] flex flex-col animate-in slide-in-from-bottom duration-300",
        isMobile
          ? "fixed inset-0 safe-area"
          : "fixed inset-0 bg-black/70 backdrop-blur-sm items-center justify-center p-4"
      )}
      onClick={isMobile ? undefined : (e) => {
        // Click on backdrop closes (desktop modal only)
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={cn(
          "flex flex-col",
          isMobile
            ? "w-full h-full"
            : "w-full max-w-2xl max-h-[90vh] bg-[#0f0f0f] border border-[#2a2a2a] rounded-2xl shadow-2xl overflow-hidden"
        )}
      >
        {/* Top bar: collapse/close button */}
        <div
          className={cn(
            "flex items-center justify-between px-4 py-3 shrink-0",
            isMobile && "pt-[max(0.75rem,env(safe-area-inset-top))]"
          )}
        >
          <button
            onClick={onClose}
            className="size-9 rounded-full flex items-center justify-center text-white hover:bg-[#1f1f1f] active:scale-95 transition-all"
            aria-label="Collapse"
          >
            <ChevronDown className="size-6" />
          </button>
          <span className="text-xs uppercase tracking-wider text-muted-foreground">
            Now Playing
          </span>
          <button
            onClick={() => {
              onClose();
              setShowQueue(!showQueue);
            }}
            className={cn(
              "size-9 rounded-full flex items-center justify-center hover:bg-[#1f1f1f] active:scale-95 transition-all",
              showQueue ? "text-[var(--theme-accent)]" : "text-white"
            )}
            aria-label="Toggle queue"
          >
            <ListMusic className="size-5" />
          </button>
        </div>

        {/* Artwork (centered, takes most of the available space) */}
        <div className="flex-1 flex items-center justify-center px-6 py-4 min-h-0 overflow-hidden">
          <div
            className={cn(
              "rounded-lg overflow-hidden bg-[#1a1a1a] shadow-2xl",
              isMobile
                ? "w-full max-w-sm aspect-square"
                : "w-full max-w-md aspect-square"
            )}
          >
            <ArtworkImage
              src={track.artwork_url}
              alt={track.title}
              size="large"
              showSkeleton={false}
            />
          </div>
        </div>

        {/* Title + actions */}
        <div className="px-6 pb-2 shrink-0">
          <div className="flex items-end justify-between gap-3 mb-3">
            <div className="min-w-0 flex-1">
              <button
                onClick={() => {
                  onClose();
                  setView({
                    kind: "track",
                    id: String(track.id),
                    title: track.title,
                  });
                }}
                className="block text-left text-lg font-bold text-white truncate hover:text-[var(--theme-accent)] transition-colors"
                title={track.title}
              >
                {track.title}
              </button>
              <button
                onClick={() => {
                  onClose();
                  setView({ kind: "search", query: track.user.username });
                }}
                className="block text-left text-sm text-muted-foreground hover:text-white truncate"
                title={track.user.username}
              >
                {track.user.username}
              </button>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <LikeButton track={track} size={20} />
              <AddToPlaylistButton track={track} />
            </div>
          </div>

          {/* Waveform seek bar */}
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs tabular-nums text-muted-foreground w-10 text-right">
              {formatDuration(currentTime * 1000)}
            </span>
            <Waveform
              progress={progress}
              duration={duration}
              onSeek={(r) => seek(r * duration)}
              height={isMobile ? 40 : 56}
              barCount={isMobile ? 120 : 180}
              seed={track.id}
              className="flex-1"
            />
            <span className="text-xs tabular-nums text-muted-foreground w-10">
              {formatDuration(duration * 1000)}
            </span>
          </div>
        </div>

        {/* Transport controls */}
        <div
          className={cn(
            "px-6 pt-2 shrink-0",
            isMobile ? "pb-[max(1rem,env(safe-area-inset-bottom))]" : "pb-6"
          )}
        >
          <div className="flex items-center justify-between gap-4 mb-4">
            <button
              onClick={toggleShuffle}
              className={cn(
                "p-2 rounded-full hover:bg-[#1f1f1f] active:scale-90 transition-all",
                shuffle ? "text-[var(--theme-accent)]" : "text-muted-foreground"
              )}
              aria-label="Shuffle"
            >
              <Shuffle className={isMobile ? "size-5" : "size-4"} />
            </button>
            <button
              onClick={prev}
              className="p-3 text-white hover:bg-[#1f1f1f] rounded-full active:scale-90 transition-all"
              aria-label="Previous"
            >
              <SkipBack className={isMobile ? "size-7 fill-current" : "size-6 fill-current"} />
            </button>
            <button
              onClick={togglePlay}
              className={cn(
                "rounded-full border-2 border-white text-white hover:bg-white hover:text-black flex items-center justify-center active:scale-95 transition-all",
                isMobile ? "size-16" : "size-14"
              )}
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? (
                <Pause className={isMobile ? "size-7 fill-current" : "size-6 fill-current"} />
              ) : (
                <Play className={isMobile ? "size-7 fill-current ml-0.5" : "size-6 fill-current ml-0.5"} />
              )}
            </button>
            <button
              onClick={next}
              className="p-3 text-white hover:bg-[#1f1f1f] rounded-full active:scale-90 transition-all"
              aria-label="Next"
            >
              <SkipForward className={isMobile ? "size-7 fill-current" : "size-6 fill-current"} />
            </button>
            <button
              onClick={cycleRepeat}
              className={cn(
                "p-2 rounded-full hover:bg-[#1f1f1f] active:scale-90 transition-all",
                repeat !== "off" ? "text-[var(--theme-accent)]" : "text-muted-foreground"
              )}
              aria-label={`Repeat: ${repeat}`}
            >
              {repeat === "one" ? (
                <Repeat1 className={isMobile ? "size-5" : "size-4"} />
              ) : (
                <Repeat className={isMobile ? "size-5" : "size-4"} />
              )}
            </button>
          </div>

          {/* Bottom row: volume (desktop only) + autoplay toggle */}
          <div className="flex items-center justify-between gap-4">
            {/* Volume slider — only show on desktop variant (mobile uses device volume) */}
            {!isMobile && (
              <div className="flex items-center gap-2 flex-1 max-w-48">
                <button
                  onClick={toggleMute}
                  className="p-1.5 rounded-full text-muted-foreground hover:text-white hover:bg-[#1f1f1f] transition-colors"
                  aria-label="Mute"
                >
                  <VolumeIcon className="size-4" />
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={muted ? 0 : volume}
                  onChange={(e) => setVolume(Number(e.target.value))}
                  className="flex-1 accent-[var(--theme-accent)] cursor-pointer"
                  aria-label="Volume"
                />
              </div>
            )}

            <div className={cn("flex items-center", isMobile && "w-full justify-center")}>
              <button
                onClick={toggleAutoplay}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                  autoplay
                    ? "bg-[var(--theme-accent)]/10 text-[var(--theme-accent)] border border-[var(--theme-accent)]/30"
                    : "text-muted-foreground border border-[#2a2a2a]"
                )}
              >
                <InfinityIcon className="size-3.5" />
                Autoplay {autoplay ? "on" : "off"}
              </button>
            </div>

            {/* Spacer to balance the row on desktop */}
            {!isMobile && <div className="flex-1 max-w-48" />}
          </div>
        </div>
      </div>
    </div>
  );
}

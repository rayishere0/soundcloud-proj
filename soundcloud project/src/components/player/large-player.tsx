"use client";

import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Volume2,
  Volume1,
  VolumeX,
  ListMusic,
  Minimize2,
  Maximize2,
  Infinity as InfinityIcon,
  Settings as SettingsIcon,
} from "lucide-react";
import { usePlayer } from "@/store/player";
import { Waveform } from "./waveform";
import { ExpandedPlayer } from "./expanded-player";
import { SettingsDialog } from "@/components/soundcloud/settings-dialog";
import { cn } from "@/lib/utils";
import { largeArtwork, formatDuration } from "@/lib/soundcloud-utils";
import { ArtworkImage } from "@/components/soundcloud/artwork-image";
import { LikeButton } from "@/components/soundcloud/like-button";
import { AddToPlaylistButton } from "@/components/soundcloud/add-to-playlist";

interface LargePlayerProps {
  className?: string;
}

export function LargePlayer({ className }: LargePlayerProps) {
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
  const desktopPlayerExpanded = usePlayer((s) => s.desktopPlayerExpanded);
  const backgroundBlur = usePlayer((s) => s.backgroundBlur);
  const backgroundOverlay = usePlayer((s) => s.backgroundOverlay);
  const settingsOpen = usePlayer((s) => s.settingsOpen);

  const togglePlay = usePlayer((s) => s.togglePlay);
  const next = usePlayer((s) => s.next);
  const prev = usePlayer((s) => s.prev);
  const seek = usePlayer((s) => s.seek);
  const setVolume = usePlayer((s) => s.setVolume);
  const toggleMute = usePlayer((s) => s.toggleMute);
  const cycleRepeat = usePlayer((s) => s.cycleRepeat);
  const toggleShuffle = usePlayer((s) => s.toggleShuffle);
  const toggleAutoplay = usePlayer((s) => s.toggleAutoplay);
  const setMiniPlayer = usePlayer((s) => s.setMiniPlayer);
  const setDesktopPlayerExpanded = usePlayer((s) => s.setDesktopPlayerExpanded);
  const setShowQueue = usePlayer((s) => s.setShowQueue);
  const setSettingsOpen = usePlayer((s) => s.setSettingsOpen);
  const showQueue = usePlayer((s) => s.showQueue);
  const setView = usePlayer((s) => s.setView);

  const track = currentIndex >= 0 ? queue[currentIndex] : null;

  if (!track) {
    return (
      <div className={cn("h-full flex items-center justify-center bg-[#0a0a0a] text-muted-foreground text-sm", className)}>
        Select a track to start playing
      </div>
    );
  }

  // When the desktop expanded player is open, render it as a full overlay
  // on top of everything. The bottom bar stays mounted underneath so state
  // isn't lost when closing the expanded view.
  if (desktopPlayerExpanded) {
    return (
      <>
        <BottomBar
          className={className}
          track={track}
          queue={queue}
          isPlaying={isPlaying}
          currentTime={currentTime}
          duration={duration}
          volume={volume}
          muted={muted}
          repeat={repeat}
          shuffle={shuffle}
          autoplay={autoplay}
          showQueue={showQueue}
          backgroundBlur={backgroundBlur}
          backgroundOverlay={backgroundOverlay}
          togglePlay={togglePlay}
          next={next}
          prev={prev}
          seek={seek}
          setVolume={setVolume}
          toggleMute={toggleMute}
          cycleRepeat={cycleRepeat}
          toggleShuffle={toggleShuffle}
          toggleAutoplay={toggleAutoplay}
          setMiniPlayer={setMiniPlayer}
          setDesktopPlayerExpanded={setDesktopPlayerExpanded}
          setShowQueue={setShowQueue}
          setSettingsOpen={setSettingsOpen}
          setView={setView}
        />
        <ExpandedPlayer
          variant="desktop"
          onClose={() => setDesktopPlayerExpanded(false)}
        />
        <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      </>
    );
  }

  return (
    <>
      <BottomBar
        className={className}
        track={track}
        queue={queue}
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={duration}
        volume={volume}
        muted={muted}
        repeat={repeat}
        shuffle={shuffle}
        autoplay={autoplay}
        showQueue={showQueue}
        backgroundBlur={backgroundBlur}
        backgroundOverlay={backgroundOverlay}
        togglePlay={togglePlay}
        next={next}
        prev={prev}
        seek={seek}
        setVolume={setVolume}
        toggleMute={toggleMute}
        cycleRepeat={cycleRepeat}
        toggleShuffle={toggleShuffle}
        toggleAutoplay={toggleAutoplay}
        setMiniPlayer={setMiniPlayer}
        setDesktopPlayerExpanded={setDesktopPlayerExpanded}
        setShowQueue={setShowQueue}
        setSettingsOpen={setSettingsOpen}
        setView={setView}
      />
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </>
  );
}

// ---- Bottom bar (the always-visible compact player) ----
interface BottomBarProps {
  className?: string;
  track: NonNullable<ReturnType<typeof usePlayer.getState>["queue"][number]>;
  queue: ReturnType<typeof usePlayer.getState>["queue"];
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  muted: boolean;
  repeat: "off" | "all" | "one";
  shuffle: boolean;
  autoplay: boolean;
  showQueue: boolean;
  backgroundBlur: number;
  backgroundOverlay: number;
  togglePlay: () => void;
  next: () => void;
  prev: () => void;
  seek: (s: number) => void;
  setVolume: (v: number) => void;
  toggleMute: () => void;
  cycleRepeat: () => void;
  toggleShuffle: () => void;
  toggleAutoplay: () => void;
  setMiniPlayer: (v: boolean) => void;
  setDesktopPlayerExpanded: (v: boolean) => void;
  setShowQueue: (v: boolean) => void;
  setSettingsOpen: (v: boolean) => void;
  setView: (v: any) => void;
}

function BottomBar({
  className,
  track,
  queue,
  isPlaying,
  currentTime,
  duration,
  volume,
  muted,
  repeat,
  shuffle,
  autoplay,
  showQueue,
  backgroundBlur,
  backgroundOverlay,
  togglePlay,
  next,
  prev,
  seek,
  setVolume,
  toggleMute,
  cycleRepeat,
  toggleShuffle,
  toggleAutoplay,
  setMiniPlayer,
  setDesktopPlayerExpanded,
  setShowQueue,
  setSettingsOpen,
  setView,
}: BottomBarProps) {
  const progress = duration > 0 ? currentTime / duration : 0;
  const artwork = largeArtwork(track.artwork_url);
  const VolumeIcon = muted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;
  const hasBlur = backgroundBlur > 0 && artwork;

  return (
    <div
      className={cn(
        "relative h-full flex flex-col border-t border-[#1f1f1f] overflow-hidden",
        hasBlur ? "" : "bg-[#0a0a0a]",
        className
      )}
    >
      {/* Blurred artwork background — covers the entire player area */}
      {hasBlur && (
        <>
          <div
            className="absolute inset-0 bg-cover bg-center scale-125"
            style={{
              backgroundImage: `url(${artwork})`,
              filter: `blur(${backgroundBlur}px)`,
            }}
            aria-hidden="true"
          />
          {/* Dark overlay on top of the blurred background for readability */}
          <div
            className="absolute inset-0 bg-[#0a0a0a]"
            style={{ opacity: backgroundOverlay }}
            aria-hidden="true"
          />
        </>
      )}

      {/* Content layer (above the background) */}
      <div className="relative z-10 flex flex-col h-full">
        {/* Top section: artwork + info + waveform */}
        <div className="flex-1 flex items-center gap-4 sm:gap-6 px-4 sm:px-6 py-2 sm:py-3 min-h-0 overflow-hidden">
          {/* Artwork — CLICKABLE to open the expanded full-screen player.
              Sized to fit within the player bar height (h-full max-h-full)
              so it never overflows or gets clipped. */}
          <button
            onClick={() => setDesktopPlayerExpanded(true)}
            className="relative shrink-0 group/btn cursor-pointer rounded-md overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-accent)] h-full"
            title="Open full player"
            aria-label="Open full player"
          >
            <div className="h-full aspect-square rounded-md overflow-hidden bg-[#1a1a1a] shadow-lg transition-all group-hover/btn:scale-[1.02]">
              <ArtworkImage
                src={track.artwork_url}
                alt={track.title}
                size="large"
                showSkeleton={false}
              />
            </div>
            {/* Hover overlay with expand icon */}
            <div className="absolute inset-0 rounded-md bg-black/40 opacity-0 group-hover/btn:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
              <Maximize2 className="size-6 text-white" />
            </div>
          </button>

          {/* Title / artist / waveform */}
        <div className="flex-1 min-w-0 flex flex-col gap-2">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <button
                onClick={() => setView({ kind: "track", id: String(track.id), title: track.title })}
                className="block text-left font-bold text-sm sm:text-base hover:text-[var(--theme-accent)] truncate max-w-full"
                title={track.title}
              >
                {track.title}
              </button>
              <button
                onClick={() => setView({ kind: "search", query: track.user.username })}
                className="block text-left text-xs sm:text-sm text-muted-foreground hover:text-white truncate max-w-full"
                title={track.user.username}
              >
                {track.user.username}
              </button>
            </div>

            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
              <LikeButton track={track} size={18} />
              <AddToPlaylistButton track={track} />
            </div>
          </div>

          {/* Waveform seek bar */}
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="text-xs tabular-nums text-muted-foreground w-10 text-right">
              {formatDuration(currentTime * 1000)}
            </span>
            <Waveform
              progress={progress}
              duration={duration}
              onSeek={(r) => seek(r * duration)}
              height={48}
              barCount={200}
              seed={track.id}
              className="flex-1"
            />
            <span className="text-xs tabular-nums text-muted-foreground w-10">
              {formatDuration(duration * 1000)}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom section: transport controls */}
      <div className="border-t border-[#1f1f1f] px-3 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-2 sm:gap-4">
        {/* Left: queue toggle */}
        <div className="flex items-center gap-2 w-auto sm:w-1/4">
          <button
            onClick={() => setShowQueue(!showQueue)}
            className={cn(
              "flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 rounded text-xs font-medium hover:bg-[#1f1f1f] transition-colors",
              showQueue ? "text-[var(--theme-accent)] bg-[#1f1f1f]" : "text-muted-foreground"
            )}
            title="Toggle queue"
          >
            <ListMusic className="size-4" />
            <span className="hidden sm:inline">Queue</span>
            <span className="bg-[#2a2a2a] px-1.5 rounded text-[10px]">
              {queue.length}
            </span>
          </button>
        </div>

        {/* Center: transport */}
        <div className="flex items-center gap-1 sm:gap-2 justify-center">
          <button
            onClick={toggleShuffle}
            className={cn(
              "p-2 rounded-full hover:bg-[#1f1f1f] transition-colors",
              shuffle ? "text-[var(--theme-accent)]" : "text-muted-foreground hover:text-white"
            )}
            title="Shuffle"
          >
            <Shuffle className="size-4" />
          </button>
          <button
            onClick={prev}
            className="p-2 rounded-full text-white hover:bg-[#1f1f1f] transition-colors"
            title="Previous"
          >
            <SkipBack className="size-5 fill-current" />
          </button>
          <button
            onClick={togglePlay}
            className="size-11 rounded-full border-2 border-white text-white hover:bg-white hover:text-black flex items-center justify-center transition-colors"
            title={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <Pause className="size-5 fill-current" />
            ) : (
              <Play className="size-5 fill-current ml-0.5" />
            )}
          </button>
          <button
            onClick={next}
            className="p-2 rounded-full text-white hover:bg-[#1f1f1f] transition-colors"
            title="Next"
          >
            <SkipForward className="size-5 fill-current" />
          </button>
          <button
            onClick={cycleRepeat}
            className={cn(
              "p-2 rounded-full hover:bg-[#1f1f1f] transition-colors",
              repeat !== "off" ? "text-[var(--theme-accent)]" : "text-muted-foreground hover:text-white"
            )}
            title={`Repeat: ${repeat}`}
          >
            {repeat === "one" ? <Repeat1 className="size-4" /> : <Repeat className="size-4" />}
          </button>
        </div>

        {/* Right: expand + autoplay + volume + settings + mini player toggle */}
        <div className="flex items-center gap-1 sm:gap-2 w-auto sm:w-1/4 justify-end">
          {/* Expand to full-screen player */}
          <button
            onClick={() => setDesktopPlayerExpanded(true)}
            className="p-2 rounded-full text-muted-foreground hover:text-[var(--theme-accent)] hover:bg-[#1f1f1f] transition-colors"
            title="Open full player"
            aria-label="Open full player"
          >
            <Maximize2 className="size-4" />
          </button>
          <button
            onClick={toggleAutoplay}
            className={cn(
              "p-2 rounded-full hover:bg-[#1f1f1f] transition-colors",
              autoplay ? "text-[var(--theme-accent)]" : "text-muted-foreground hover:text-white"
            )}
            title={`Autoplay: ${autoplay ? "on" : "off"}`}
            aria-label="Toggle autoplay"
          >
            <InfinityIcon className="size-4" />
          </button>
          <div className="hidden sm:flex items-center gap-1.5">
            <button
              onClick={toggleMute}
              className="p-2 rounded-full text-muted-foreground hover:text-white hover:bg-[#1f1f1f] transition-colors"
              title="Mute"
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
              className="w-24 accent-[var(--theme-accent)] cursor-pointer"
              aria-label="Volume"
            />
          </div>
          {/* Settings */}
          <button
            onClick={() => setSettingsOpen(true)}
            className="p-2 rounded-full text-muted-foreground hover:text-white hover:bg-[#1f1f1f] transition-colors"
            title="Settings"
            aria-label="Settings"
          >
            <SettingsIcon className="size-4" />
          </button>
          <button
            onClick={() => setMiniPlayer(true)}
            className="p-2 rounded-full text-muted-foreground hover:text-white hover:bg-[#1f1f1f] transition-colors"
            title="Switch to mini player"
          >
            <Minimize2 className="size-4" />
          </button>
        </div>
      </div>
      </div>
    </div>
  );
}

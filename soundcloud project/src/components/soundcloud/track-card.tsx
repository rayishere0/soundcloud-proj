"use client";

import { Play, Pause } from "lucide-react";
import { usePlayer } from "@/store/player";
import type { ScTrack } from "@/lib/soundcloud-utils";
import { largeArtwork, formatCount, formatDuration } from "@/lib/soundcloud-utils";
import { cn } from "@/lib/utils";
import { LikeButton } from "./like-button";
import { AddToPlaylistButton } from "./add-to-playlist";
import { ArtworkImage } from "./artwork-image";

interface TrackCardProps {
  track: ScTrack;
  queueContext?: ScTrack[]; // sibling tracks for queue
  className?: string;
}

export function TrackCard({ track, queueContext, className }: TrackCardProps) {
  const currentIndex = usePlayer((s) => s.currentIndex);
  const queue = usePlayer((s) => s.queue);
  const isPlaying = usePlayer((s) => s.isPlaying);
  const playTrack = usePlayer((s) => s.playTrack);
  const togglePlay = usePlayer((s) => s.togglePlay);
  const setView = usePlayer((s) => s.setView);

  const currentTrack = currentIndex >= 0 ? queue[currentIndex] : null;
  const isCurrent = currentTrack?.id === track.id;
  const isCurrentPlaying = isCurrent && isPlaying;

  const handlePlay = () => {
    if (isCurrent) {
      togglePlay();
      return;
    }
    const ctx = queueContext && queueContext.length > 0 ? queueContext : [track];
    playTrack(track, ctx);
  };

  return (
    <div
      className={cn(
        "group relative flex flex-col gap-2 p-3 rounded-lg hover:bg-[#1a1a1a] transition-colors cursor-pointer",
        className
      )}
      onClick={handlePlay}
    >
      {/* Artwork */}
      <div className="relative aspect-square w-full rounded-md overflow-hidden bg-[#0a0a0a]">
        <ArtworkImage
          src={track.artwork_url}
          alt={track.title}
          size="large"
          className={cn(
            "transition-transform group-hover:scale-105",
            isCurrent && !isPlaying && "opacity-80"
          )}
        />

        {/* Play button overlay */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handlePlay();
          }}
          className={cn(
            "absolute bottom-2 right-2 size-10 rounded-full bg-black/70 backdrop-blur border border-white/20 text-white hover:bg-white hover:text-black flex items-center justify-center transition-all",
            isCurrentPlaying
              ? "opacity-100 scale-100"
              : "opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100"
          )}
          aria-label={isCurrentPlaying ? "Pause" : "Play"}
        >
          {isCurrentPlaying ? (
            <Pause className="size-4 fill-current" />
          ) : (
            <Play className="size-4 fill-current ml-0.5" />
          )}
        </button>

        {/* Now-playing indicator (top-left) */}
        {isCurrent && (
          <div className="absolute top-2 left-2 flex items-end gap-0.5 h-4 bg-black/50 px-1.5 rounded backdrop-blur">
            <div className="eq-bar w-0.5 bg-[var(--theme-accent)]" style={{ height: "60%" }} />
            <div className="eq-bar w-0.5 bg-[var(--theme-accent)]" style={{ height: "100%" }} />
            <div className="eq-bar w-0.5 bg-[var(--theme-accent)]" style={{ height: "40%" }} />
            <div className="eq-bar w-0.5 bg-[var(--theme-accent)]" style={{ height: "80%" }} />
          </div>
        )}
      </div>

      {/* Title + artist */}
      <div className="min-w-0 flex flex-col gap-0.5">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setView({ kind: "track", id: String(track.id), title: track.title });
          }}
          className={cn(
            "text-left text-sm font-medium truncate hover:text-[var(--theme-accent)] transition-colors",
            isCurrent && "text-[var(--theme-accent)]"
          )}
          title={track.title}
        >
          {track.title}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setView({ kind: "search", query: track.user.username });
          }}
          className="text-left text-xs text-muted-foreground truncate hover:text-white transition-colors"
          title={track.user.username}
        >
          {track.user.username}
        </button>
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-3">
          {track.playback_count != null && track.playback_count > 0 && (
            <span title="Plays">{formatCount(track.playback_count)} plays</span>
          )}
          <LikeButton track={track} size={14} className="p-0 hover:bg-transparent" />
        </div>
        <span>{formatDuration(track.duration ?? 0)}</span>
      </div>
    </div>
  );
}

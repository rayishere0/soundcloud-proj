"use client";

import { Play, Pause, MoreHorizontal, ListPlus, Trash2, GripVertical } from "lucide-react";
import { usePlayer } from "@/store/player";
import type { ScTrack } from "@/lib/soundcloud-utils";
import { largeArtwork, formatCount, formatDuration } from "@/lib/soundcloud-utils";
import { cn } from "@/lib/utils";
import { LikeButton } from "./like-button";
import { AddToPlaylistButton } from "./add-to-playlist";
import { ArtworkImage } from "./artwork-image";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

interface TrackRowProps {
  track: ScTrack;
  index: number;
  queueContext?: ScTrack[]; // sibling tracks
  showArtwork?: boolean;
  showIndex?: boolean;
  showPlays?: boolean;
  showAddedAt?: boolean;
  onRemove?: () => void;
  inQueue?: boolean;
  className?: string;
}

export function TrackRow({
  track,
  index,
  queueContext,
  showArtwork = true,
  showIndex = false,
  showPlays = true,
  onRemove,
  inQueue = false,
  className,
}: TrackRowProps) {
  const currentIndex = usePlayer((s) => s.currentIndex);
  const queue = usePlayer((s) => s.queue);
  const isPlaying = usePlayer((s) => s.isPlaying);
  const playTrack = usePlayer((s) => s.playTrack);
  const togglePlay = usePlayer((s) => s.togglePlay);
  const addToQueue = usePlayer((s) => s.addToQueue);
  const setView = usePlayer((s) => s.setView);

  const currentTrack = currentIndex >= 0 ? queue[currentIndex] : null;
  const isCurrent = currentTrack?.id === track.id;
  const isCurrentPlaying = isCurrent && isPlaying;

  // Defensive: some tracks (e.g. from imported playlists) may have stub-only
  // data. Guard against missing user/title so the UI doesn't crash.
  const username = track?.user?.username ?? "Unknown artist";
  const artwork = largeArtwork(track?.artwork_url);

  const handlePlay = () => {
    if (isCurrent) {
      togglePlay();
      return;
    }
    if (inQueue) {
      // Jump to this position in queue
      const i = queue.findIndex((t) => t.id === track.id);
      if (i >= 0) {
        usePlayer.setState({ currentIndex: i, isPlaying: true, currentTime: 0 });
        return;
      }
    }
    const ctx = queueContext && queueContext.length > 0 ? queueContext : [track];
    playTrack(track, ctx);
  };

  return (
    <div
      className={cn(
        "group grid grid-cols-[auto_1fr_auto] gap-3 items-center px-3 py-2 rounded-md hover:bg-[#1a1a1a] transition-colors cursor-pointer",
        isCurrent && "bg-[#1a1a1a]",
        className
      )}
      onClick={handlePlay}
    >
      {/* Left: index / play button / artwork / title */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {/* Index or play button */}
        <div className="w-6 flex items-center justify-center shrink-0">
          {showIndex && (
            <>
              {isCurrentPlaying ? (
                <div className="flex items-end gap-0.5 h-4">
                  <div className="eq-bar w-0.5 bg-[var(--theme-accent)]" style={{ height: "60%" }} />
                  <div className="eq-bar w-0.5 bg-[var(--theme-accent)]" style={{ height: "100%" }} />
                  <div className="eq-bar w-0.5 bg-[var(--theme-accent)]" style={{ height: "40%" }} />
                </div>
              ) : (
                <>
                  <span
                    className={cn(
                      "text-sm tabular-nums group-hover:hidden",
                      isCurrent ? "text-[var(--theme-accent)]" : "text-muted-foreground"
                    )}
                  >
                    {index + 1}
                  </span>
                  <Play
                    className="hidden group-hover:block size-4 fill-current text-white"
                  />
                </>
              )}
            </>
          )}
          {!showIndex && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handlePlay();
              }}
              className="text-white/70 hover:text-white"
              aria-label="Play"
            >
              {isCurrentPlaying ? (
                <Pause className="size-4 fill-current" />
              ) : (
                <Play className="size-4 fill-current" />
              )}
            </button>
          )}
        </div>

        {/* Artwork */}
        {showArtwork && (
          <div className="size-10 rounded overflow-hidden bg-[#0a0a0a] shrink-0">
            <ArtworkImage
              src={track.artwork_url}
              alt={track?.title ?? "track"}
              size="medium"
              showSkeleton={false}
            />
          </div>
        )}

        {/* Title + artist */}
        <div className="min-w-0 flex-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setView({ kind: "track", id: String(track.id), title: track.title });
            }}
            className={cn(
              "block text-left text-sm font-medium truncate hover:text-[var(--theme-accent)] transition-colors",
              isCurrent ? "text-[var(--theme-accent)]" : "text-white"
            )}
            title={track?.title ?? "Untitled"}
          >
            {track?.title ?? "Untitled"}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setView({ kind: "search", query: username });
            }}
            className="block text-left text-xs text-muted-foreground truncate hover:text-white transition-colors"
            title={username}
          >
            {username}
          </button>
        </div>
      </div>

      {/* Middle: stats (hidden on small screens) */}
      <div className="hidden md:flex items-center gap-4 text-xs text-muted-foreground justify-end">
        {showPlays && track.playback_count != null && (
          <span title="Plays" className="tabular-nums w-20 text-right">
            {formatCount(track.playback_count)}
          </span>
        )}
        <span className="tabular-nums w-12 text-right">
          {formatDuration(track.duration ?? 0)}
        </span>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-1 shrink-0">
        <LikeButton track={track} size={14} className="p-1.5 opacity-0 group-hover:opacity-100" />
        <AddToPlaylistButton track={track} className="p-1.5 opacity-0 group-hover:opacity-100" />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              onClick={(e) => e.stopPropagation()}
              className="p-1.5 rounded-full text-muted-foreground hover:text-white hover:bg-[#2a2a2a] opacity-0 group-hover:opacity-100 transition-all"
              aria-label="More options"
            >
              <MoreHorizontal className="size-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-[#1a1a1a] border-[#2a2a2a]">
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                addToQueue(track);
                toast.success(`Added "${track?.title ?? "track"}" to queue`);
              }}
              className="cursor-pointer focus:bg-[#2a2a2a] focus:text-white"
            >
              <ListPlus className="size-4 mr-2" />
              Add to queue
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                setView({ kind: "track", id: String(track.id), title: track?.title });
              }}
              className="cursor-pointer focus:bg-[#2a2a2a] focus:text-white"
            >
              Go to track
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-[#2a2a2a]" />
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                window.open(track.permalink_url, "_blank");
              }}
              className="cursor-pointer focus:bg-[#2a2a2a] focus:text-white"
            >
              Open source
            </DropdownMenuItem>
            {onRemove && (
              <>
                <DropdownMenuSeparator className="bg-[#2a2a2a]" />
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove();
                  }}
                  className="cursor-pointer focus:bg-[#2a2a2a] focus:text-white text-red-400"
                >
                  <Trash2 className="size-4 mr-2" />
                  Remove
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

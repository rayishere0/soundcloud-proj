"use client";

import { useQuery } from "@tanstack/react-query";
import { usePlayer } from "@/store/player";
import { useLibrary } from "@/store/library";
import { TrackCard } from "./track-card";
import { TrackRow } from "./track-row";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { LikeButton } from "./like-button";
import { AddToPlaylistButton } from "./add-to-playlist";
import { Play, Pause, Share2, ExternalLink, MessageSquare } from "lucide-react";
import type { ScTrack, ScComment } from "@/lib/soundcloud-utils";
import { largeArtwork, formatDuration, formatCount } from "@/lib/soundcloud-utils";
import { toast } from "sonner";

async function fetchTrack(id: string): Promise<ScTrack> {
  const res = await fetch(`/api/track/${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error("Failed to load track");
  const data = await res.json();
  return data.track as ScTrack;
}

async function fetchRelated(id: string): Promise<ScTrack[]> {
  const res = await fetch(`/api/related/${encodeURIComponent(id)}?limit=12`);
  if (!res.ok) throw new Error("Failed to load related");
  const data = await res.json();
  return data.tracks as ScTrack[];
}

async function fetchComments(id: string): Promise<ScComment[]> {
  const res = await fetch(`/api/comments/${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error("Failed to load comments");
  const data = await res.json();
  return (data.comments as ScComment[]) ?? [];
}

export function TrackView({ id, title: fallbackTitle }: { id: string; title?: string }) {
  const { data: track, isLoading, error } = useQuery({
    queryKey: ["track", id],
    queryFn: () => fetchTrack(id),
    staleTime: 1000 * 60 * 10,
  });

  const { data: related } = useQuery({
    queryKey: ["related", id],
    queryFn: () => fetchRelated(id),
    enabled: !!track,
    staleTime: 1000 * 60 * 10,
  });

  const { data: comments } = useQuery({
    queryKey: ["comments", id],
    queryFn: () => fetchComments(id),
    enabled: !!track,
    staleTime: 1000 * 60 * 5,
  });

  const currentIndex = usePlayer((s) => s.currentIndex);
  const queue = usePlayer((s) => s.queue);
  const isPlaying = usePlayer((s) => s.isPlaying);
  const playTrack = usePlayer((s) => s.playTrack);
  const togglePlay = usePlayer((s) => s.togglePlay);

  const currentTrack = currentIndex >= 0 ? queue[currentIndex] : null;
  const isCurrent = currentTrack?.id === Number(id) || currentTrack?.id === id;
  const isCurrentPlaying = isCurrent && isPlaying;

  if (isLoading) {
    return (
      <div className="px-6 py-6 max-w-[1400px] mx-auto">
        <div className="flex flex-col md:flex-row gap-6 mb-8">
          <Skeleton className="size-64 rounded-md bg-[#1a1a1a]" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-4 w-20 bg-[#1a1a1a]" />
            <Skeleton className="h-10 w-80 bg-[#1a1a1a]" />
            <Skeleton className="h-4 w-40 bg-[#1a1a1a]" />
            <div className="flex gap-2 mt-4">
              <Skeleton className="h-10 w-32 bg-[#1a1a1a]" />
              <Skeleton className="h-10 w-32 bg-[#1a1a1a]" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !track) {
    return (
      <div className="px-6 py-12 text-center text-muted-foreground">
        Failed to load this track. It may have been removed.
      </div>
    );
  }

  const artwork = largeArtwork(track.artwork_url);
  const relatedTracks = (related ?? []).filter((t) => t.id !== track.id);

  const handlePlay = () => {
    if (isCurrent) {
      togglePlay();
      return;
    }
    playTrack(track, [track, ...relatedTracks]);
  };

  return (
    <div className="px-6 py-6 max-w-[1400px] mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row gap-6">
        <div className="size-48 md:size-64 rounded-md overflow-hidden bg-[#0a0a0a] shrink-0 mx-auto md:mx-0">
          {artwork ? (
            <img src={artwork} alt={track.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[var(--theme-accent)]/20 to-[#1a1a1a] flex items-center justify-center">
              <span className="text-6xl font-bold text-[var(--theme-accent)]/40">
                {track.user.username.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0 flex flex-col">
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Song</div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 break-words">{track.title}</h1>
          <button
            onClick={() => usePlayer.getState().setView({ kind: "search", query: track.user.username })}
            className="text-left text-base text-white hover:text-[var(--theme-accent)] transition-colors"
          >
            {track.user.username}
          </button>

          {/* Stats row */}
          <div className="flex flex-wrap gap-4 mt-3 text-xs text-muted-foreground">
            <span>{formatCount(track.playback_count)} plays</span>
            <span className="flex items-center gap-1">
              <LikeButton track={track} size={12} className="p-0 hover:bg-transparent" />
              {formatCount(track.likes_count)}
            </span>
            <span className="flex items-center gap-1">
              <MessageSquare className="size-3" />
              {formatCount(track.comment_count)}
            </span>
            <span>{formatDuration(track.duration)}</span>
            {track.genre && <span className="text-[var(--theme-accent)]">#{track.genre}</span>}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-2 mt-5">
            <Button
              onClick={handlePlay}
              className="bg-[var(--theme-accent)] hover:bg-[var(--theme-accent-hover)] text-white"
            >
              {isCurrentPlaying ? (
                <>
                  <Pause className="size-4 fill-current mr-2" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="size-4 fill-current mr-2" />
                  {isCurrent ? "Resume" : "Play"}
                </>
              )}
            </Button>
            <LikeButton
              track={track}
              size={18}
              className="border border-[#2a2a2a] hover:border-[var(--theme-accent)]"
            />
            <AddToPlaylistButton
              track={track}
              className="border border-[#2a2a2a] hover:border-[var(--theme-accent)]"
            />
            <Button
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(track.permalink_url);
                toast.success("Link copied to clipboard");
              }}
              className="border-[#2a2a2a] text-white hover:bg-[#1a1a1a] hover:text-white"
            >
              <Share2 className="size-4 mr-2" />
              Share
            </Button>
            <Button
              variant="outline"
              onClick={() => window.open(track.permalink_url, "_blank")}
              className="border-[#2a2a2a] text-white hover:bg-[#1a1a1a] hover:text-white"
            >
              <ExternalLink className="size-4 mr-2" />
              Open source
            </Button>
          </div>

          {/* Description */}
          {track.description && (
            <div className="mt-5 text-sm text-muted-foreground whitespace-pre-wrap line-clamp-6">
              {track.description}
            </div>
          )}

          {/* Tags */}
          {track.tag_list && (
            <div className="flex flex-wrap gap-2 mt-4">
              {track.tag_list
                .split(/\s+/)
                .filter(Boolean)
                .slice(0, 8)
                .map((tag) => (
                  <span
                    key={tag}
                    className="text-xs px-2 py-1 rounded-full bg-[#1a1a1a] text-[var(--theme-accent-hover)] hover:bg-[#2a2a2a] cursor-pointer"
                    onClick={() =>
                      usePlayer.getState().setView({ kind: "search", query: tag.replace(/^["']/, "").replace(/["']$/, "") })
                    }
                  >
                    #{tag.replace(/^["']/, "").replace(/["']$/, "")}
                  </span>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Comments */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-3">
          Comments {comments && `(${comments.length})`}
        </h2>
        {!comments ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full bg-[#1a1a1a]" />
            ))}
          </div>
        ) : comments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No comments yet.</p>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
            {comments.slice(0, 30).map((c) => (
              <CommentRow key={c.id} comment={c} />
            ))}
          </div>
        )}
      </section>

      {/* Related */}
      {relatedTracks.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-white mb-3">Related tracks</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {relatedTracks.slice(0, 12).map((t) => (
              <TrackCard key={t.id} track={t} queueContext={relatedTracks} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function CommentRow({ comment }: { comment: ScComment }) {
  const avatar = largeArtwork(comment.user.avatar_url);
  const time = comment.timestamp > 0 ? formatDuration(comment.timestamp) : null;
  return (
    <div className="flex gap-3 p-2 rounded hover:bg-[#1a1a1a]">
      <div className="size-8 rounded-full overflow-hidden bg-[#1a1a1a] shrink-0">
        {avatar && <img src={avatar} alt="" className="w-full h-full object-cover" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-medium text-white">{comment.user.username}</span>
          {time && (
            <span className="text-xs text-[var(--theme-accent)] tabular-nums">at {time}</span>
          )}
          <span className="text-xs text-muted-foreground">
            {new Date(comment.created_at).toLocaleDateString()}
          </span>
        </div>
        <p className="text-sm text-muted-foreground mt-0.5 break-words">{comment.body}</p>
      </div>
    </div>
  );
}

"use client";

import { useQuery } from "@tanstack/react-query";
import { usePlayer } from "@/store/player";
import { useLibrary } from "@/store/library";
import { TrackRow } from "./track-row";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Play, Heart, Music2, Trash2, Pencil } from "lucide-react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { largeArtwork, formatDuration } from "@/lib/soundcloud-utils";
import type { ScTrack, ScPlaylist } from "@/lib/soundcloud-utils";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface PlaylistViewProps {
  id: string;
  source: "local" | "remote";
  title?: string;
}

export function PlaylistView({ id, source, title }: PlaylistViewProps) {
  if (source === "local") {
    return <LocalPlaylistView id={id} title={title} />;
  }
  return <RemotePlaylistView id={id} title={title} />;
}

// --------- LOCAL PLAYLIST ----------
function LocalPlaylistView({ id, title: initialTitle }: { id: string; title?: string }) {
  const playlist = useLibrary((s) => s.playlists.find((p) => p.id === id));
  const deletePlaylist = useLibrary((s) => s.deletePlaylist);
  const removeTrackFromPlaylist = useLibrary((s) => s.removeTrackFromPlaylist);
  const renamePlaylist = useLibrary((s) => s.renamePlaylist);
  const playQueue = usePlayer((s) => s.playQueue);
  const setView = usePlayer((s) => s.setView);

  const [renameOpen, setRenameOpen] = useState(false);
  const [newTitle, setNewTitle] = useState(playlist?.title ?? "");

  if (!playlist) {
    return (
      <div className="px-6 py-12 text-center text-muted-foreground">
        Playlist not found.
        <div className="mt-4">
          <Button onClick={() => setView({ kind: "library", tab: "playlists" })} variant="outline">
            Back to library
          </Button>
        </div>
      </div>
    );
  }

  const tracks = playlist.trackIds
    .map((tid) => playlist.tracks[tid])
    .filter((t) => t && t.id != null && t.user && t.title) as ScTrack[];
  const totalDuration = tracks.reduce((sum, t) => sum + (t.duration ?? 0), 0);
  const artwork = largeArtwork(playlist.artworkUrl);

  const handleRename = () => {
    renamePlaylist(id, newTitle);
    setRenameOpen(false);
    toast.success("Playlist renamed");
  };

  return (
    <div className="px-4 sm:px-6 py-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-end gap-4 sm:gap-6 mb-6 sm:mb-8">
        <div className="relative size-32 sm:size-44 rounded-md overflow-hidden bg-[#0a0a0a] shrink-0">
          {artwork ? (
            <img src={artwork} alt={playlist.title} className="w-full h-full object-cover" />
          ) : playlist.isLiked ? (
            <div className="w-full h-full bg-gradient-to-br from-[var(--theme-accent)] to-[var(--theme-accent-hover)] flex items-center justify-center">
              <Heart className="size-12 sm:size-16 text-white fill-white" />
            </div>
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#2a2a2a] to-[#1a1a1a] flex items-center justify-center">
              <Music2 className="size-12 sm:size-16 text-muted-foreground" />
            </div>
          )}
          {playlist.sourceUrl && (
            <div className="absolute top-1.5 left-1.5 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded backdrop-blur">
              Imported
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
            {playlist.isLiked ? "Auto-generated" : playlist.sourceUrl ? "Imported Playlist" : "Playlist"}
          </div>
          <h1 className="text-2xl sm:text-4xl font-bold text-white mb-2 truncate">{playlist.title}</h1>
          {playlist.description && (
            <p className="text-sm text-muted-foreground mb-2">{playlist.description}</p>
          )}
          <div className="text-sm text-muted-foreground">
            {tracks.length} {tracks.length === 1 ? "song" : "songs"} · {formatDuration(totalDuration)}
          </div>

          <div className="flex items-center gap-2 mt-4">
            {tracks.length > 0 && (
              <Button
                onClick={() => playQueue(tracks, 0)}
                className="bg-[var(--theme-accent)] hover:bg-[var(--theme-accent-hover)] text-white"
              >
                <Play className="size-4 fill-current mr-2" />
                Play All
              </Button>
            )}
            {!playlist.isLiked && (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setNewTitle(playlist.title);
                    setRenameOpen(true);
                  }}
                  className="border-[#2a2a2a] text-white hover:bg-[#1a1a1a] hover:text-white"
                >
                  <Pencil className="size-4 mr-2" />
                  Rename
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    if (confirm(`Delete playlist "${playlist.title}"? This cannot be undone.`)) {
                      deletePlaylist(id);
                      toast.success(`Deleted "${playlist.title}"`);
                      setView({ kind: "library", tab: "playlists" });
                    }
                  }}
                  className="border-[#2a2a2a] text-red-400 hover:bg-[#1a1a1a] hover:text-red-300"
                >
                  <Trash2 className="size-4 mr-2" />
                  Delete
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Track list */}
      {tracks.length === 0 ? (
        <div className="text-center py-16">
          <Music2 className="size-12 mx-auto mb-3 text-muted-foreground opacity-50" />
          <h3 className="text-base font-semibold text-white mb-1">This playlist is empty</h3>
          <p className="text-sm text-muted-foreground">
            Search for songs and use the <span className="text-[var(--theme-accent)]">+</span> button to add them here.
          </p>
        </div>
      ) : (
        <div className="space-y-0.5">
          {/* Column headers */}
          <div className="hidden md:grid grid-cols-[auto_1fr_auto] gap-3 px-3 py-2 text-xs uppercase tracking-wider text-muted-foreground border-b border-[#1f1f1f]">
            <span className="w-6 text-center">#</span>
            <span>Title</span>
            <span>Length</span>
          </div>
          {tracks.map((t, i) => (
            <TrackRow
              key={`${t.id}-${i}`}
              track={t}
              index={i}
              queueContext={tracks}
              showIndex
              showPlays={false}
              onRemove={
                playlist.isLiked
                  ? undefined
                  : () => {
                      removeTrackFromPlaylist(id, t.id);
                      toast.success(`Removed "${t.title}" from playlist`);
                    }
              }
            />
          ))}
        </div>
      )}

      {/* Rename dialog */}
      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="bg-[#1a1a1a] border-[#2a2a2a] text-white">
          <DialogHeader>
            <DialogTitle>Rename playlist</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5 py-2">
            <Label htmlFor="rename-title">New name</Label>
            <Input
              id="rename-title"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="bg-[#0a0a0a] border-[#2a2a2a]"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleRename();
              }}
            />
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setRenameOpen(false)}
              className="hover:bg-[#2a2a2a]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleRename}
              className="bg-[var(--theme-accent)] hover:bg-[var(--theme-accent-hover)] text-white"
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// --------- REMOTE PLAYLIST ----------
async function fetchRemotePlaylist(id: string): Promise<ScPlaylist> {
  const res = await fetch(`/api/playlist/${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error("Failed to load playlist");
  const data = await res.json();
  return data.playlist as ScPlaylist;
}

function RemotePlaylistView({ id, title: fallbackTitle }: { id: string; title?: string }) {
  const playQueue = usePlayer((s) => s.playQueue);
  const addToQueue = usePlayer((s) => s.addManyToQueue);
  const { data: playlist, isLoading, error } = useQuery({
    queryKey: ["playlist", id],
    queryFn: () => fetchRemotePlaylist(id),
    staleTime: 1000 * 60 * 5,
  });

  if (isLoading) {
    return (
      <div className="px-6 py-6 max-w-[1600px] mx-auto">
        <div className="flex items-end gap-6 mb-8">
          <Skeleton className="size-44 rounded-md bg-[#1a1a1a]" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-20 bg-[#1a1a1a]" />
            <Skeleton className="h-10 w-80 bg-[#1a1a1a]" />
            <Skeleton className="h-4 w-40 bg-[#1a1a1a]" />
          </div>
        </div>
        <div className="space-y-2 mt-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full bg-[#1a1a1a]" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !playlist) {
    return (
      <div className="px-6 py-12 text-center text-muted-foreground">
        Failed to load this playlist. It may have been removed or is private.
      </div>
    );
  }

  const tracks = (playlist.tracks ?? []).filter((t) => t && t.id);
  const artwork = largeArtwork(playlist.artwork_url);
  const totalDuration = tracks.reduce((sum, t) => sum + (t.duration ?? 0), 0);

  return (
    <div className="px-6 py-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-end gap-6 mb-8">
        <div className="size-44 rounded-md overflow-hidden bg-[#0a0a0a] shrink-0">
          {artwork ? (
            <img src={artwork} alt={playlist.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[var(--theme-accent)]/20 to-[#1a1a1a] flex items-center justify-center">
              <Music2 className="size-16 text-muted-foreground" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
            {playlist.is_album ? "Album" : "Playlist"}
          </div>
          <h1 className="text-4xl font-bold text-white mb-2 truncate">{playlist.title}</h1>
          {playlist.description && (
            <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{playlist.description}</p>
          )}
          <div className="text-sm text-muted-foreground">
            by <span className="text-white hover:text-[var(--theme-accent)] cursor-pointer">{playlist.user?.username}</span> · {tracks.length} tracks · {formatDuration(totalDuration)}
          </div>

          <div className="flex items-center gap-2 mt-4">
            {tracks.length > 0 && (
              <>
                <Button
                  onClick={() => playQueue(tracks, 0)}
                  className="bg-[var(--theme-accent)] hover:bg-[var(--theme-accent-hover)] text-white"
                >
                  <Play className="size-4 fill-current mr-2" />
                  Play All
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    addToQueue(tracks);
                    toast.success(`Added ${tracks.length} tracks to queue`);
                  }}
                  className="border-[#2a2a2a] text-white hover:bg-[#1a1a1a] hover:text-white"
                >
                  Add to queue
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Track list */}
      <div className="space-y-0.5">
        <div className="hidden md:grid grid-cols-[auto_1fr_auto] gap-3 px-3 py-2 text-xs uppercase tracking-wider text-muted-foreground border-b border-[#1f1f1f]">
          <span className="w-6 text-center">#</span>
          <span>Title</span>
          <span>Length</span>
        </div>
        {tracks.map((t, i) => (
          <TrackRow key={t.id} track={t} index={i} queueContext={tracks} showIndex />
        ))}
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { Heart, ListMusic, Plus, Music2, Play, Clock, Trash2, X, Download } from "lucide-react";
import { usePlayer } from "@/store/player";
import { useLibrary, LIKED_PLAYLIST_ID } from "@/store/library";
import { TrackRow } from "./track-row";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { QueueView } from "./queue-view";
import { ImportPlaylistDialog } from "./import-playlist-dialog";
import { largeArtwork, formatDuration } from "@/lib/soundcloud-utils";
import type { ScTrack } from "@/lib/soundcloud-utils";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface LibraryViewProps {
  initialTab?: "playlists" | "liked" | "queue";
}

export function LibraryView({ initialTab = "playlists" }: LibraryViewProps) {
  const [tab, setTab] = useState<"playlists" | "liked" | "queue">(initialTab);
  const [importOpen, setImportOpen] = useState(false);

  const setView = usePlayer((s) => s.setView);
  const showQueue = usePlayer((s) => s.showQueue);
  const queueLength = usePlayer((s) => s.queue.length);

  return (
    <div className="px-4 sm:px-6 py-6 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between mb-6 gap-2 flex-wrap">
        <h1 className="text-2xl font-bold text-white">Your Library</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setImportOpen(true)}
            className="border-[#2a2a2a] text-white hover:bg-[#1a1a1a] hover:text-white"
          >
            <Download className="size-4 mr-2" />
            Import from URL
          </Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList className="bg-[#1a1a1a] border border-[#2a2a2a] mb-4">
          <TabsTrigger className="data-[state=active]:bg-[var(--theme-accent)] data-[state=active]:text-white" value="playlists">
            <ListMusic className="size-4 mr-2" /> Playlists
          </TabsTrigger>
          <TabsTrigger className="data-[state=active]:bg-[var(--theme-accent)] data-[state=active]:text-white" value="liked">
            <Heart className="size-4 mr-2" /> Liked
          </TabsTrigger>
          <TabsTrigger className="data-[state=active]:bg-[var(--theme-accent)] data-[state=active]:text-white" value="queue">
            <Music2 className="size-4 mr-2" /> Queue
            {queueLength > 0 && (
              <span className="ml-1 text-[10px] bg-[#2a2a2a] px-1.5 rounded-sm">
                {queueLength}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="playlists">
          <PlaylistsTab onImportOpen={() => setImportOpen(true)} />
        </TabsContent>
        <TabsContent value="liked">
          <LikedTab />
        </TabsContent>
        <TabsContent value="queue">
          <QueueTab />
        </TabsContent>
      </Tabs>

      <ImportPlaylistDialog open={importOpen} onOpenChange={setImportOpen} />
    </div>
  );
}

function PlaylistsTab({ onImportOpen }: { onImportOpen: () => void }) {
  const playlists = useLibrary((s) => s.playlists);
  const setView = usePlayer((s) => s.setView);
  const createPlaylist = useLibrary((s) => s.createPlaylist);
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const handleCreate = () => {
    const t = title.trim() || "New Playlist";
    const id = createPlaylist(t, description.trim());
    setCreateOpen(false);
    setTitle("");
    setDescription("");
    toast.success(`Playlist "${t}" created`);
    setView({ kind: "playlist", id, source: "local", title: t });
  };

  return (
    <div>
      {/* Create new playlist / import tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 mb-4">
        <button
          onClick={() => setCreateOpen(true)}
          className="aspect-square rounded-md border-2 border-dashed border-[#2a2a2a] hover:border-[var(--theme-accent)] hover:bg-[#1a1a1a] transition-colors flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-[var(--theme-accent)]"
        >
          <Plus className="size-8" />
          <span className="text-xs font-medium">New Playlist</span>
        </button>
        <button
          onClick={onImportOpen}
          className="aspect-square rounded-md border-2 border-dashed border-[#2a2a2a] hover:border-[var(--theme-accent)] hover:bg-[#1a1a1a] transition-colors flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-[var(--theme-accent)]"
        >
          <Download className="size-8" />
          <span className="text-xs font-medium">Import URL</span>
        </button>

        {/* Playlist tiles */}
        {playlists.map((p) => {
          const art = largeArtwork(p.artworkUrl);
          return (
            <div
              key={p.id}
              onClick={() => setView({ kind: "playlist", id: p.id, source: "local", title: p.title })}
              className="group flex flex-col gap-2 p-3 rounded-lg hover:bg-[#1a1a1a] transition-colors cursor-pointer"
            >
              <div className="relative aspect-square w-full rounded-md overflow-hidden bg-[#0a0a0a]">
                {art ? (
                  <img src={art} alt={p.title} className="w-full h-full object-cover" />
                ) : p.isLiked ? (
                  <div className="w-full h-full bg-gradient-to-br from-[var(--theme-accent)] to-[var(--theme-accent-hover)] flex items-center justify-center">
                    <Heart className="size-10 text-white fill-white" />
                  </div>
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-[#2a2a2a] to-[#1a1a1a] flex items-center justify-center">
                    <Music2 className="size-10 text-muted-foreground" />
                  </div>
                )}
                {p.sourceUrl && (
                  <div className="absolute top-1.5 left-1.5 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded backdrop-blur">
                    Imported
                  </div>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (p.trackIds.length > 0) {
                      const tracks = p.trackIds.map((id) => p.tracks[id]).filter(Boolean);
                      if (tracks.length > 0) {
                        usePlayer.getState().playQueue(tracks, 0);
                      }
                    }
                  }}
                  disabled={p.trackIds.length === 0}
                  className="absolute bottom-2 right-2 size-10 rounded-full bg-[var(--theme-accent)] hover:bg-[var(--theme-accent-hover)] text-white flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Play all"
                >
                  <Play className="size-4 fill-current ml-0.5" />
                </button>
              </div>
              <div>
                <div className="text-sm font-medium text-white truncate group-hover:text-[var(--theme-accent)] transition-colors">
                  {p.title}
                </div>
                <div className="text-xs text-muted-foreground">
                  {p.trackIds.length} {p.trackIds.length === 1 ? "track" : "tracks"}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-[#1a1a1a] border-[#2a2a2a] text-white">
          <DialogHeader>
            <DialogTitle>Create a new playlist</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="lib-pl-title">Playlist name</Label>
              <Input
                id="lib-pl-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="My Awesome Playlist"
                className="bg-[#0a0a0a] border-[#2a2a2a]"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreate();
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lib-pl-desc">Description (optional)</Label>
              <Textarea
                id="lib-pl-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What's this playlist about?"
                className="bg-[#0a0a0a] border-[#2a2a2a] resize-none"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setCreateOpen(false)}
              className="hover:bg-[#2a2a2a]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              className="bg-[var(--theme-accent)] hover:bg-[var(--theme-accent-hover)] text-white"
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function LikedTab() {
  // Use useShallow so the selector returns a stable reference when the
  // underlying array contents haven't changed — this avoids the
  // "getSnapshot should be cached" infinite loop error from React.
  const likedTracks = useLibrary<ScTrack[]>(
    useShallow((s) => s.likedTrackIds.map((id) => s.likedTracksCache[id]).filter(Boolean) as ScTrack[])
  );
  const playQueue = usePlayer((s) => s.playQueue);

  if (likedTracks.length === 0) {
    return (
      <div className="text-center py-16">
        <Heart className="size-12 mx-auto mb-3 text-muted-foreground opacity-50" />
        <h3 className="text-base font-semibold text-white mb-1">No liked songs yet</h3>
        <p className="text-sm text-muted-foreground">
          Tap the heart icon on any track to save it here.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-end gap-4 sm:gap-6 mb-6">
        <div className="size-32 sm:size-44 rounded-md bg-gradient-to-br from-[var(--theme-accent)] to-[var(--theme-accent-hover)] flex items-center justify-center shrink-0">
          <Heart className="size-12 sm:size-16 text-white fill-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Playlist</div>
          <h1 className="text-2xl sm:text-4xl font-bold text-white mb-2">Liked Songs</h1>
          <div className="text-sm text-muted-foreground">
            {likedTracks.length} {likedTracks.length === 1 ? "song" : "songs"}
          </div>
          <Button
            onClick={() => playQueue(likedTracks, 0)}
            className="mt-4 bg-[var(--theme-accent)] hover:bg-[var(--theme-accent-hover)] text-white"
          >
            <Play className="size-4 fill-current mr-2" />
            Play All
          </Button>
        </div>
      </div>

      <div className="space-y-0.5">
        {likedTracks.map((t, i) => (
          <TrackRow key={t.id} track={t} index={i} queueContext={likedTracks} showIndex showPlays={false} />
        ))}
      </div>
    </div>
  );
}

function QueueTab() {
  return <QueueView />;
}

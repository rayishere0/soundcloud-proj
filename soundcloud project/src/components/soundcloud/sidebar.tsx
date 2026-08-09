"use client";

import {
  Home,
  Search,
  Library,
  Plus,
  Heart,
  ListMusic,
  Clock,
  Trash2,
  Music2,
} from "lucide-react";
import { usePlayer } from "@/store/player";
import { useLibrary } from "@/store/library";
import { cn } from "@/lib/utils";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { largeArtwork } from "@/lib/soundcloud-utils";

export function Sidebar() {
  const view = usePlayer((s) => s.view);
  const setView = usePlayer((s) => s.setView);
  const playlists = useLibrary((s) => s.playlists);
  const createPlaylist = useLibrary((s) => s.createPlaylist);
  const deletePlaylist = useLibrary((s) => s.deletePlaylist);
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const isActive = (kind: string) => view.kind === kind;

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
    <aside className="hidden md:flex w-64 shrink-0 bg-[#0a0a0a] border-r border-[#1f1f1f] flex-col h-full">
      {/* Logo */}
      <div className="h-14 px-5 flex items-center gap-2 border-b border-[#1f1f1f]">
        <div className="flex items-center gap-2">
          {/* NotSoundcloud logo */}
          <img
            src="/notsoundcloud-logo.png"
            alt="NotSoundcloud"
            className="size-7 rounded object-cover"
          />
          <span className="text-base font-bold text-white tracking-tight">NotSoundcloud</span>
        </div>
      </div>

      {/* Primary nav */}
      <nav className="px-2 py-3 space-y-0.5">
        <button
          onClick={() => setView({ kind: "home" })}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2 rounded text-sm font-medium transition-colors",
            isActive("home")
              ? "bg-[#1f1f1f] text-white"
              : "text-muted-foreground hover:text-white hover:bg-[#1a1a1a]"
          )}
        >
          <Home className="size-4" />
          Home
        </button>
        <button
          onClick={() => setView({ kind: "search" })}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2 rounded text-sm font-medium transition-colors",
            isActive("search")
              ? "bg-[#1f1f1f] text-white"
              : "text-muted-foreground hover:text-white hover:bg-[#1a1a1a]"
          )}
        >
          <Search className="size-4" />
          Search
        </button>
        <button
          onClick={() => setView({ kind: "library", tab: "playlists" })}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2 rounded text-sm font-medium transition-colors",
            isActive("library")
              ? "bg-[#1f1f1f] text-white"
              : "text-muted-foreground hover:text-white hover:bg-[#1a1a1a]"
          )}
        >
          <Library className="size-4" />
          Library
        </button>
      </nav>

      {/* Playlists section */}
      <div className="px-2 mt-2 flex-1 min-h-0 flex flex-col">
        <div className="px-3 py-2 flex items-center justify-between">
          <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
            Playlists
          </span>
          <button
            onClick={() => setCreateOpen(true)}
            className="p-1 rounded text-muted-foreground hover:text-white hover:bg-[#1f1f1f]"
            title="Create new playlist"
            aria-label="Create new playlist"
          >
            <Plus className="size-4" />
          </button>
        </div>

        {/* Liked Songs shortcut (always at top) */}
        <div className="flex-1 overflow-y-auto no-scrollbar space-y-0.5">
          {playlists.map((p) => (
            <PlaylistRow
              key={p.id}
              id={p.id}
              title={p.title}
              count={p.trackIds.length}
              artworkUrl={p.artworkUrl}
              isLiked={p.isLiked}
              isActive={view.kind === "playlist" && view.id === p.id}
              onClick={() =>
                setView({ kind: "playlist", id: p.id, source: "local", title: p.title })
              }
              onDelete={
                p.isLiked
                  ? undefined
                  : () => {
                      deletePlaylist(p.id);
                      toast.success(`Deleted "${p.title}"`);
                      setView({ kind: "library", tab: "playlists" });
                    }
              }
            />
          ))}
        </div>
      </div>

      {/* Create playlist dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-[#1a1a1a] border-[#2a2a2a] text-white">
          <DialogHeader>
            <DialogTitle>Create a new playlist</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="pl-title">Playlist name</Label>
              <Input
                id="pl-title"
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
              <Label htmlFor="pl-desc">Description (optional)</Label>
              <Textarea
                id="pl-desc"
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
    </aside>
  );
}

interface PlaylistRowProps {
  id: string;
  title: string;
  count: number;
  artworkUrl?: string | null;
  isLiked?: boolean;
  isActive: boolean;
  onClick: () => void;
  onDelete?: () => void;
}

function PlaylistRow({
  title,
  count,
  artworkUrl,
  isLiked,
  isActive,
  onClick,
  onDelete,
}: PlaylistRowProps) {
  const art = largeArtwork(artworkUrl);
  return (
    <div
      onClick={onClick}
      className={cn(
        "group flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors",
        isActive ? "bg-[#1f1f1f]" : "hover:bg-[#1a1a1a]"
      )}
    >
      {/* Artwork tile */}
      <div className="size-9 rounded shrink-0 overflow-hidden bg-[#1a1a1a] flex items-center justify-center">
        {art ? (
          <img src={art} alt="" className="w-full h-full object-cover" />
        ) : isLiked ? (
          <div className="w-full h-full bg-gradient-to-br from-[var(--theme-accent)] to-[var(--theme-accent-hover)] flex items-center justify-center">
            <Heart className="size-4 text-white fill-white" />
          </div>
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#2a2a2a] to-[#1a1a1a] flex items-center justify-center">
            <Music2 className="size-4 text-muted-foreground" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div
          className={cn(
            "text-sm truncate",
            isActive ? "text-[var(--theme-accent)]" : "text-white"
          )}
        >
          {title}
        </div>
        <div className="text-xs text-muted-foreground">
          {isLiked ? "Liked Songs" : "Playlist"} · {count} {count === 1 ? "song" : "songs"}
        </div>
      </div>

      {onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="opacity-0 group-hover:opacity-100 p-1 rounded text-muted-foreground hover:text-red-400 hover:bg-[#2a2a2a]"
          title="Delete playlist"
          aria-label="Delete playlist"
        >
          <Trash2 className="size-3.5" />
        </button>
      )}
    </div>
  );
}

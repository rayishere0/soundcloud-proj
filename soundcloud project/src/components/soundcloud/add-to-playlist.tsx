"use client";

import { useState } from "react";
import { Plus, Check, ListPlus } from "lucide-react";
import { useLibrary } from "@/store/library";
import type { ScTrack } from "@/lib/soundcloud-utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
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
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface AddToPlaylistButtonProps {
  track: ScTrack;
  className?: string;
}

export function AddToPlaylistButton({ track, className }: AddToPlaylistButtonProps) {
  const playlists = useLibrary((s) => s.playlists);
  const addTrackToPlaylist = useLibrary((s) => s.addTrackToPlaylist);
  const createPlaylist = useLibrary((s) => s.createPlaylist);
  const [newPlaylistOpen, setNewPlaylistOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  const handleAdd = (playlistId: string, title: string) => {
    addTrackToPlaylist(playlistId, track);
    toast.success(`Added to "${title}"`);
  };

  const handleCreate = () => {
    const title = newTitle.trim() || "New Playlist";
    const id = createPlaylist(title);
    addTrackToPlaylist(id, track);
    toast.success(`Created "${title}" and added track`);
    setNewPlaylistOpen(false);
    setNewTitle("");
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className={cn(
              "p-2 rounded-full transition-colors hover:bg-[#1f1f1f] text-muted-foreground hover:text-white",
              className
            )}
            title="Add to playlist"
            aria-label="Add to playlist"
            onClick={(e) => e.stopPropagation()}
          >
            <Plus className="size-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 bg-[#1a1a1a] border-[#2a2a2a]">
          <DropdownMenuLabel className="text-xs text-muted-foreground">
            Add to playlist
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-[#2a2a2a]" />
          {playlists.length === 0 && (
            <div className="px-2 py-3 text-xs text-muted-foreground text-center">
              No playlists yet
            </div>
          )}
          {playlists.map((p) => {
            const inPlaylist = p.trackIds.includes(track.id);
            return (
              <DropdownMenuItem
                key={p.id}
                onClick={() => handleAdd(p.id, p.title)}
                className="cursor-pointer text-sm focus:bg-[#2a2a2a] focus:text-white"
              >
                <span className="flex-1 truncate">{p.title}</span>
                {inPlaylist && <Check className="size-3.5 text-[var(--theme-accent)]" />}
                <span className="text-xs text-muted-foreground">{p.trackIds.length}</span>
              </DropdownMenuItem>
            );
          })}
          <DropdownMenuSeparator className="bg-[#2a2a2a]" />
          <DropdownMenuItem
            onClick={() => setNewPlaylistOpen(true)}
            className="cursor-pointer text-sm focus:bg-[#2a2a2a] focus:text-white text-[var(--theme-accent)]"
          >
            <ListPlus className="size-4 mr-2" />
            Create new playlist
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={newPlaylistOpen} onOpenChange={setNewPlaylistOpen}>
        <DialogContent className="bg-[#1a1a1a] border-[#2a2a2a] text-white">
          <DialogHeader>
            <DialogTitle>Create a new playlist</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="playlist-title">Playlist name</Label>
              <Input
                id="playlist-title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="My Awesome Playlist"
                className="bg-[#0a0a0a] border-[#2a2a2a]"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreate();
                }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              The track <span className="text-white font-medium">"{track.title}"</span> will be added to this playlist.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setNewPlaylistOpen(false)}
              className="hover:bg-[#2a2a2a]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              className="bg-[var(--theme-accent)] hover:bg-[var(--theme-accent-hover)] text-white"
            >
              Create & Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

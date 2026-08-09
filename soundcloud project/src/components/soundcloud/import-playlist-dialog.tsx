"use client";

import { useState } from "react";
import { Download, Loader2, Link as LinkIcon } from "lucide-react";
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
import { useLibrary } from "@/store/library";
import { usePlayer } from "@/store/player";
import type { ScPlaylist } from "@/lib/soundcloud-utils";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ImportPlaylistDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  className?: string;
}

export function ImportPlaylistDialog({
  open,
  onOpenChange,
  className,
}: ImportPlaylistDialogProps) {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);

  const importRemotePlaylist = useLibrary((s) => s.importRemotePlaylist);
  const setView = usePlayer((s) => s.setView);

  const handleImport = async () => {
    const u = url.trim();
    if (!u) {
      toast.error("Please paste a SoundCloud playlist URL");
      return;
    }
    if (!/soundcloud\.com\/.+\/sets\//.test(u)) {
      toast.error(
        "That doesn't look like a SoundCloud playlist URL. It should contain /sets/ in the path."
      );
      return;
    }

    setLoading(true);
    try {
      // First resolve the URL → resource object (gives us the playlist id)
      const resolveRes = await fetch(
        `/api/resolve?url=${encodeURIComponent(u)}`
      );
      if (!resolveRes.ok) {
        const err = await resolveRes.json().catch(() => ({}));
        throw new Error(err.error || "Failed to resolve URL");
      }
      const { resource } = (await resolveRes.json()) as { resource: any };

      if (resource.kind !== "playlist") {
        throw new Error(
          `This URL is a ${resource.kind}, not a playlist. Paste a SoundCloud playlist URL (with /sets/ in the path).`
        );
      }

      // The resolve endpoint typically returns stub-only tracks (just IDs,
      // no `user` / `media` / etc.). Always fetch the full playlist via
      // /api/playlist/[id] which uses soundcloud.ts's playlists.get() —
      // that method backfills all track stubs with full metadata.
      let playlist: ScPlaylist = resource as ScPlaylist;
      const fullRes = await fetch(
        `/api/playlist/${encodeURIComponent(String(playlist.id))}`
      );
      if (fullRes.ok) {
        const data = await fullRes.json();
        if (data.playlist) playlist = data.playlist as ScPlaylist;
      }

      // Final safety: filter out any tracks that still don't have full metadata
      // (no user / no title) so the UI doesn't crash rendering them.
      const validTracks = (playlist.tracks ?? []).filter(
        (t) => t && t.id != null && t.user && t.title
      );
      playlist = { ...playlist, tracks: validTracks };

      const newId = importRemotePlaylist(playlist, title.trim() || undefined);
      toast.success(
        `Imported "${playlist.title}" with ${validTracks.length} tracks`
      );
      setUrl("");
      setTitle("");
      onOpenChange(false);
      setView({ kind: "playlist", id: newId, source: "local", title: playlist.title });
    } catch (e: any) {
      console.error("[import-playlist]", e);
      toast.error(e.message || "Failed to import playlist");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("bg-[#1a1a1a] border-[#2a2a2a] text-white", className)}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="size-4 text-[var(--theme-accent)]" />
            Import from SoundCloud
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="sc-url">SoundCloud playlist URL</Label>
            <div className="relative">
              <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                id="sc-url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://soundcloud.com/user/sets/playlist-name"
                className="bg-[#0a0a0a] border-[#2a2a2a] pl-9"
                autoFocus
                inputMode="url"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !loading) handleImport();
                }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Open a playlist on soundcloud.com, copy the URL from the address bar, and paste it here.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="custom-title">Custom name (optional)</Label>
            <Input
              id="custom-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Leave blank to use the original playlist name"
              className="bg-[#0a0a0a] border-[#2a2a2a]"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="hover:bg-[#2a2a2a]"
          >
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={loading || !url.trim()}
            className="bg-[var(--theme-accent)] hover:bg-[var(--theme-accent-hover)] text-white"
          >
            {loading ? (
              <>
                <Loader2 className="size-4 mr-2 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Download className="size-4 mr-2" />
                Import playlist
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

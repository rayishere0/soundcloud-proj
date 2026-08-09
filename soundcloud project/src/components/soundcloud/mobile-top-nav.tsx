"use client";

import { Home, Search, Library, Heart, ListMusic } from "lucide-react";
import { usePlayer } from "@/store/player";
import { useLibrary } from "@/store/library";
import { cn } from "@/lib/utils";

/**
 * MobileTopNav — visible only on small screens (below md breakpoint).
 * Shows Home / Search / Library tabs at the top of the page so mobile users
 * can navigate without the desktop sidebar.
 */
export function MobileTopNav() {
  const view = usePlayer((s) => s.view);
  const setView = usePlayer((s) => s.setView);
  const queueLength = usePlayer((s) => s.queue.length);
  const likedCount = useLibrary((s) => s.likedTrackIds.length);

  const isActive = (kind: string) => view.kind === kind;

  return (
    <nav className="md:hidden flex items-center justify-around h-12 bg-[#0a0a0a] border-b border-[#1f1f1f] shrink-0">
      <button
        onClick={() => setView({ kind: "home" })}
        className={cn(
          "flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-[10px] font-medium transition-colors",
          isActive("home") ? "text-[var(--theme-accent)]" : "text-muted-foreground"
        )}
      >
        <Home className="size-4" />
        Home
      </button>
      <button
        onClick={() => setView({ kind: "search" })}
        className={cn(
          "flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-[10px] font-medium transition-colors",
          isActive("search") ? "text-[var(--theme-accent)]" : "text-muted-foreground"
        )}
      >
        <Search className="size-4" />
        Search
      </button>
      <button
        onClick={() => setView({ kind: "library", tab: "playlists" })}
        className={cn(
          "flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-[10px] font-medium transition-colors relative",
          isActive("library") ? "text-[var(--theme-accent)]" : "text-muted-foreground"
        )}
      >
        <Library className="size-4" />
        Library
        {likedCount > 0 && (
          <span className="absolute top-1.5 right-1/4 size-1.5 rounded-full bg-[var(--theme-accent)]" />
        )}
      </button>
      <button
        onClick={() => {
          setView({ kind: "library", tab: "queue" });
          usePlayer.getState().setShowQueue(true);
        }}
        className={cn(
          "flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-[10px] font-medium transition-colors relative",
          view.kind === "library" && view.tab === "queue"
            ? "text-[var(--theme-accent)]"
            : "text-muted-foreground"
        )}
      >
        <ListMusic className="size-4" />
        Queue
        {queueLength > 0 && (
          <span className="absolute top-1.5 right-1/4 size-1.5 rounded-full bg-[var(--theme-accent)]" />
        )}
      </button>
    </nav>
  );
}

"use client";

import { ArrowLeft, Search } from "lucide-react";
import { usePlayer } from "@/store/player";
import { cn } from "@/lib/utils";

export function TopBar() {
  const viewStack = usePlayer((s) => s.viewStack);
  const goBack = usePlayer((s) => s.goBack);
  const setView = usePlayer((s) => s.setView);
  const canGoBack = viewStack.length > 0;

  return (
    <header className="h-12 md:h-14 shrink-0 px-3 md:px-4 flex items-center gap-3 border-b border-[#1f1f1f] bg-[#0f0f0f]">
      {/* Back button */}
      <button
        onClick={goBack}
        disabled={!canGoBack}
        className={cn(
          "size-8 rounded-full flex items-center justify-center transition-colors shrink-0",
          canGoBack
            ? "bg-[#1f1f1f] hover:bg-[#2a2a2a] text-white active:scale-95"
            : "bg-transparent text-muted-foreground/40 cursor-not-allowed"
        )}
        title="Go back"
        aria-label="Go back"
      >
        <ArrowLeft className="size-4" />
      </button>

      {/* Quick search shortcut (desktop only — mobile uses MobileTopNav) */}
      <button
        onClick={() => setView({ kind: "search" })}
        className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#1a1a1a] hover:bg-[#2a2a2a] text-muted-foreground text-sm transition-colors min-w-64"
      >
        <Search className="size-4" />
        <span>Search</span>
      </button>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right side (could put user menu here) */}
      <div className="flex items-center gap-2">
        <span className="hidden md:inline text-xs text-muted-foreground px-2 py-1">
          NotSoundcloud
        </span>
      </div>
    </header>
  );
}

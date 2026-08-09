"use client";

import { Sidebar } from "@/components/soundcloud/sidebar";
import { TopBar } from "@/components/soundcloud/top-bar";
import { MobileTopNav } from "@/components/soundcloud/mobile-top-nav";
import { HomeView } from "@/components/soundcloud/home-view";
import { SearchView } from "@/components/soundcloud/search-view";
import { LibraryView } from "@/components/soundcloud/library-view";
import { PlaylistView } from "@/components/soundcloud/playlist-view";
import { TrackView } from "@/components/soundcloud/track-view";
import { QueuePanel } from "@/components/soundcloud/queue-panel";
import { LargePlayer } from "@/components/player/large-player";
import { MiniPlayer } from "@/components/player/mini-player";
import { MobilePlayer } from "@/components/player/mobile-player";
import { HiddenAudioElement } from "@/components/player/audio-element";
import { usePlayer } from "@/store/player";
import { Providers } from "@/components/providers";
import { useIsMobile } from "@/hooks/use-mobile";
import { useDynamicTheme } from "@/hooks/use-dynamic-theme";

export default function Page() {
  return (
    <Providers>
      <AppShell />
    </Providers>
  );
}

function AppShell() {
  const isMiniPlayer = usePlayer((s) => s.isMiniPlayer);
  const isMobile = useIsMobile();

  // Extract dominant color from current track's artwork and apply as theme
  useDynamicTheme();

  return (
    <div className="h-screen w-screen flex flex-col bg-[#0f0f0f] text-foreground overflow-hidden">
      {/* Mobile top navigation */}
      {isMobile && <MobileTopNav />}

      {/* Main 3-column layout: sidebar | content | queue */}
      <div className="flex-1 flex min-h-0">
        <Sidebar />

        <div className="flex-1 flex min-w-0">
          {/* Main content */}
          <main className="flex-1 flex flex-col min-w-0">
            <TopBar />
            <div className="flex-1 overflow-y-auto">
              <CurrentView />
            </div>
          </main>

          {/* Queue panel (sticky on lg+, slide-in on smaller) */}
          <QueuePanel />
        </div>
      </div>

      {/* Player — different rendering for mobile vs desktop */}
      {isMobile ? (
        // Mobile: use the dedicated mobile player (thumbnail-only collapsed,
        // expands to full controls on tap). Mini player is a desktop-only
        // concept on mobile.
        <MobilePlayer className="shrink-0" />
      ) : isMiniPlayer ? (
        // Desktop mini player mode: tiny bar + floating window
        <>
          <div className="h-14 border-t border-[#1f1f1f] bg-[#0a0a0a] px-4 flex items-center justify-between text-xs text-muted-foreground shrink-0">
            <span>Player minimized</span>
            <button
              onClick={() => usePlayer.getState().setMiniPlayer(false)}
              className="text-[var(--theme-accent)] hover:text-[var(--theme-accent-hover)] font-medium"
            >
              Expand player
            </button>
          </div>
          <MiniPlayer />
        </>
      ) : (
        // Desktop large player — h-36 (144px) gives enough room for artwork
        // + waveform + transport without clipping.
        <LargePlayer className="h-36 shrink-0" />
      )}

      {/* Hidden audio element — single source of truth for playback */}
      <HiddenAudioElement />
    </div>
  );
}

function CurrentView() {
  const view = usePlayer((s) => s.view);

  switch (view.kind) {
    case "home":
      return <HomeView />;
    case "search":
      return <SearchView initialQuery={view.query} />;
    case "library":
      return <LibraryView initialTab={view.tab} />;
    case "playlist":
      return <PlaylistView id={view.id} source={view.source} title={view.title} />;
    case "track":
      return <TrackView id={view.id} title={view.title} />;
    default:
      return <HomeView />;
  }
}

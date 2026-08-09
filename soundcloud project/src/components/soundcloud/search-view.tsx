"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { Search as SearchIcon, X, Loader2 } from "lucide-react";
import { TrackCard } from "./track-card";
import { TrackRow } from "./track-row";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { usePlayer } from "@/store/player";
import type { ScTrack } from "@/lib/soundcloud-utils";
import { largeArtwork, formatCount } from "@/lib/soundcloud-utils";
import { cn } from "@/lib/utils";

// ---- Fetchers ----

interface AllSearchResponse {
  tracks?: ScTrack[];
  playlists?: Array<any>;
  users?: Array<any>;
  tracksNextHref?: string | null;
}

interface TracksPage {
  tracks: ScTrack[];
  nextOffset: number | null;
  hasMore: boolean;
}

async function fetchAllSearch(q: string): Promise<AllSearchResponse> {
  const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&kind=all&limit=30`);
  if (!res.ok) throw new Error("Search failed");
  return res.json();
}

async function fetchTracksPage({
  q,
  offset,
  limit = 50,
}: {
  q: string;
  offset: number;
  limit?: number;
}): Promise<TracksPage> {
  const res = await fetch(
    `/api/search?q=${encodeURIComponent(q)}&kind=tracks&limit=${limit}&offset=${offset}`
  );
  if (!res.ok) throw new Error("Search failed");
  const data = await res.json();
  const tracks: ScTrack[] = data.tracks ?? [];
  const hasMore = tracks.length === limit; // if we got a full page, there might be more
  const nextOffset = hasMore ? offset + tracks.length : null;
  return { tracks, nextOffset, hasMore };
}

// ---- Main view ----

export function SearchView({ initialQuery }: { initialQuery?: string }) {
  const view = usePlayer((s) => s.view);
  const setView = usePlayer((s) => s.setView);
  const recordSearch = usePlayer((s) => s.recordSearch);
  const initial = initialQuery ?? (view.kind === "search" ? view.query : "") ?? "";
  const [query, setQuery] = useState(initial);
  const [debounced, setDebounced] = useState(initial);
  const [activeTab, setActiveTab] = useState<"all" | "tracks" | "playlists" | "users">("all");

  // Debounce
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 350);
    return () => clearTimeout(t);
  }, [query]);

  // Record search query to history once it's stable for >1s.
  useEffect(() => {
    if (!debounced) return;
    const t = setTimeout(() => recordSearch(debounced), 1500);
    return () => clearTimeout(t);
  }, [debounced, recordSearch]);

  // "All" tab — fetches tracks + playlists + users in parallel (small batch)
  const { data: allData, isLoading: allLoading, error: allError } = useQuery({
    queryKey: ["search", debounced, "all"],
    queryFn: () => fetchAllSearch(debounced),
    enabled: debounced.length > 0 && activeTab === "all",
    staleTime: 1000 * 60 * 2,
  });

  // "Tracks" tab — infinite query for endless scrolling
  const {
    data: tracksData,
    fetchNextPage: fetchNextTracks,
    hasNextPage: hasMoreTracks,
    isFetchingNextPage: fetchingMoreTracks,
    isLoading: tracksLoading,
    error: tracksError,
  } = useInfiniteQuery({
    queryKey: ["search", debounced, "tracks-infinite"],
    queryFn: ({ pageParam = 0 }) => fetchTracksPage({ q: debounced, offset: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextOffset ?? undefined,
    enabled: debounced.length > 0 && activeTab === "tracks",
    staleTime: 1000 * 60 * 2,
  });

  // Playlists + Users — simple paginated queries for those tabs
  const { data: playlistsData, isLoading: playlistsLoading } = useQuery({
    queryKey: ["search", debounced, "playlists"],
    queryFn: async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(debounced)}&kind=playlists&limit=50`);
      if (!res.ok) throw new Error("Search failed");
      const data = await res.json();
      return data.playlists as Array<any>;
    },
    enabled: debounced.length > 0 && activeTab === "playlists",
    staleTime: 1000 * 60 * 2,
  });

  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ["search", debounced, "users"],
    queryFn: async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(debounced)}&kind=users&limit=50`);
      if (!res.ok) throw new Error("Search failed");
      const data = await res.json();
      return data.users as Array<any>;
    },
    enabled: debounced.length > 0 && activeTab === "users",
    staleTime: 1000 * 60 * 2,
  });

  // Flatten infinite tracks pages
  const allTracks = tracksData?.pages.flatMap((p) => p.tracks) ?? [];

  const allTracksList = allData?.tracks ?? [];
  const allPlaylists = allData?.playlists ?? [];
  const allUsers = allData?.users ?? [];

  const playlists = activeTab === "playlists" ? (playlistsData ?? []) : allPlaylists;
  const users = activeTab === "users" ? (usersData ?? []) : allUsers;

  return (
    <div className="px-4 sm:px-6 py-6 max-w-[1600px] mx-auto pb-24 md:pb-6">
      {/* Search bar */}
      <div className="relative mb-6">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for songs, artists, playlists..."
          className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-md pl-10 pr-10 py-2.5 text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:border-[var(--theme-accent)] focus:ring-1 focus:ring-[var(--theme-accent)]"
          autoFocus
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-white"
            aria-label="Clear search"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {!debounced && (
        <div className="text-center py-16 text-muted-foreground">
          <SearchIcon className="size-10 mx-auto mb-3 opacity-50" />
          <p className="text-sm">Search for your favorite songs, artists, and playlists.</p>
        </div>
      )}

      {debounced && (allLoading || tracksLoading) && (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-3 py-2">
              <Skeleton className="size-10 rounded bg-[#1a1a1a]" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-3 w-1/3 bg-[#1a1a1a]" />
                <Skeleton className="h-3 w-1/4 bg-[#1a1a1a]" />
              </div>
            </div>
          ))}
        </div>
      )}

      {debounced && (allError || tracksError) && (
        <div className="bg-red-950/40 border border-red-900 text-red-200 px-4 py-3 rounded text-sm">
          Search failed. Please try again.
        </div>
      )}

      {debounced && !allLoading && !tracksLoading && !allError && !tracksError && (
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="bg-[#1a1a1a] border border-[#2a2a2a] mb-4">
            <TabsTrigger value="all" className="data-[state=active]:bg-[var(--theme-accent)] data-[state=active]:text-white">
              All
            </TabsTrigger>
            <TabsTrigger value="tracks" className="data-[state=active]:bg-[var(--theme-accent)] data-[state=active]:text-white">
              Tracks {allTracks.length > 0 && `(${allTracks.length}${hasMoreTracks ? "+" : ""})`}
            </TabsTrigger>
            <TabsTrigger value="playlists" className="data-[state=active]:bg-[var(--theme-accent)] data-[state=active]:text-white">
              Playlists ({playlists.length})
            </TabsTrigger>
            <TabsTrigger value="users" className="data-[state=active]:bg-[var(--theme-accent)] data-[state=active]:text-white">
              People ({users.length})
            </TabsTrigger>
          </TabsList>

          {/* ---- ALL TAB ---- */}
          <TabsContent value="all" className="space-y-8">
            {allTracksList.length > 0 && (
              <section>
                <div className="flex items-baseline justify-between mb-3">
                  <h2 className="text-lg font-semibold text-white">Songs</h2>
                  {allData?.tracksNextHref && (
                    <button
                      onClick={() => setActiveTab("tracks")}
                      className="text-xs text-muted-foreground hover:text-white"
                    >
                      Show all tracks →
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                  {allTracksList.slice(0, 12).map((t) => (
                    <TrackCard key={t.id} track={t} queueContext={allTracksList} />
                  ))}
                </div>
              </section>
            )}
            {allPlaylists.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold text-white mb-3">Playlists</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                  {allPlaylists.slice(0, 6).map((p: any) => (
                    <PlaylistCard key={p.id} playlist={p} />
                  ))}
                </div>
              </section>
            )}
            {allUsers.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold text-white mb-3">People</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {allUsers.slice(0, 6).map((u: any) => (
                    <UserCard key={u.id} user={u} onClick={() => setView({ kind: "search", query: u.username })} />
                  ))}
                </div>
              </section>
            )}
            {allTracksList.length === 0 && allPlaylists.length === 0 && allUsers.length === 0 && (
              <div className="text-center py-12 text-muted-foreground text-sm">
                No results found for &quot;{debounced}&quot;
              </div>
            )}
          </TabsContent>

          {/* ---- TRACKS TAB (infinite scroll) ---- */}
          <TabsContent value="tracks">
            <InfiniteTrackList
              tracks={allTracks}
              isLoading={tracksLoading}
              isFetchingMore={fetchingMoreTracks}
              hasMore={hasMoreTracks}
              onLoadMore={() => fetchNextTracks()}
            />
          </TabsContent>

          {/* ---- PLAYLISTS TAB ---- */}
          <TabsContent value="playlists">
            {playlistsLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="flex flex-col gap-2 p-3">
                    <Skeleton className="aspect-square w-full rounded-md bg-[#1a1a1a]" />
                    <Skeleton className="h-3 w-3/4 bg-[#1a1a1a]" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                {playlists.map((p: any) => (
                  <PlaylistCard key={p.id} playlist={p} />
                ))}
              </div>
            )}
            {playlists.length === 0 && !playlistsLoading && (
              <div className="text-center py-12 text-muted-foreground text-sm">No playlists found</div>
            )}
          </TabsContent>

          {/* ---- USERS TAB ---- */}
          <TabsContent value="users">
            {usersLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-lg bg-[#1a1a1a]" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {users.map((u: any) => (
                  <UserCard key={u.id} user={u} onClick={() => setView({ kind: "search", query: u.username })} />
                ))}
              </div>
            )}
            {users.length === 0 && !usersLoading && (
              <div className="text-center py-12 text-muted-foreground text-sm">No people found</div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

// ---- Infinite scroll track list ----

function InfiniteTrackList({
  tracks,
  isLoading,
  isFetchingMore,
  hasMore,
  onLoadMore,
}: {
  tracks: ScTrack[];
  isLoading: boolean;
  isFetchingMore: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
}) {
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // IntersectionObserver to trigger load-more when sentinel is visible.
  const handleIntersect = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const entry = entries[0];
      if (entry.isIntersecting && hasMore && !isFetchingMore) {
        onLoadMore();
      }
    },
    [hasMore, isFetchingMore, onLoadMore]
  );

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(handleIntersect, {
      rootMargin: "200px",
    });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [handleIntersect]);

  if (isLoading) {
    return (
      <div className="space-y-0.5">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-3 py-2">
            <Skeleton className="size-10 rounded bg-[#1a1a1a]" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-3 w-1/3 bg-[#1a1a1a]" />
              <Skeleton className="h-3 w-1/4 bg-[#1a1a1a]" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (tracks.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm">No tracks found</div>
    );
  }

  return (
    <div>
      <div className="space-y-0.5">
        {/* Column header */}
        <div className="hidden md:grid grid-cols-[auto_1fr_auto] gap-3 px-3 py-2 text-xs uppercase tracking-wider text-muted-foreground border-b border-[#1f1f1f] mb-1">
          <span className="w-6 text-center">#</span>
          <span>Title</span>
          <span>Length</span>
        </div>
        {tracks.map((t, i) => (
          <TrackRow key={`${t.id}-${i}`} track={t} index={i} queueContext={tracks} showIndex />
        ))}
      </div>

      {/* Sentinel + loading indicator */}
      <div ref={sentinelRef} className="h-12 flex items-center justify-center">
        {isFetchingMore && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading more tracks...
          </div>
        )}
        {!hasMore && tracks.length > 0 && (
          <p className="text-xs text-muted-foreground">— End of results ({tracks.length} tracks) —</p>
        )}
      </div>
    </div>
  );
}

// ---- Sub-cards ----

function PlaylistCard({ playlist }: { playlist: any }) {
  const setView = usePlayer((s) => s.setView);
  const artwork = largeArtwork(playlist.artwork_url);
  return (
    <div
      onClick={() => setView({ kind: "playlist", id: String(playlist.id), source: "remote", title: playlist.title })}
      className="group flex flex-col gap-2 p-3 rounded-lg hover:bg-[#1a1a1a] transition-colors cursor-pointer"
    >
      <div className="relative aspect-square w-full rounded-md overflow-hidden bg-[#0a0a0a]">
        {artwork ? (
          <img
            src={artwork}
            alt={playlist.title}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[var(--theme-accent)]/20 to-[#1a1a1a]" />
        )}
      </div>
      <div>
        <div className="text-sm font-medium text-white truncate group-hover:text-[var(--theme-accent)] transition-colors">
          {playlist.title}
        </div>
        <div className="text-xs text-muted-foreground truncate">
          {playlist.track_count} tracks · {playlist.user?.username}
        </div>
      </div>
    </div>
  );
}

function UserCard({ user, onClick }: { user: any; onClick: () => void }) {
  const avatar = largeArtwork(user.avatar_url);
  return (
    <div
      onClick={onClick}
      className="flex items-center gap-3 p-3 rounded-lg hover:bg-[#1a1a1a] transition-colors cursor-pointer"
    >
      <div className="size-12 rounded-full overflow-hidden bg-[#1a1a1a] shrink-0">
        {avatar && (
          <img
            src={avatar}
            alt={user.username}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
            loading="lazy"
          />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-white truncate">{user.username}</div>
        <div className="text-xs text-muted-foreground truncate">
          {formatCount(user.followers_count)} followers · {user.track_count} tracks
        </div>
      </div>
    </div>
  );
}

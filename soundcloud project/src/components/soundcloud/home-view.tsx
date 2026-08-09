"use client";

import { useQuery } from "@tanstack/react-query";
import { TrackCard } from "./track-card";
import { Skeleton } from "@/components/ui/skeleton";
import { usePlayer } from "@/store/player";
import type { ScTrack } from "@/lib/soundcloud-utils";
import { Sparkles, History as HistoryIcon, Search as SearchIcon, Flame } from "lucide-react";

async function fetchCharts(): Promise<ScTrack[]> {
  const res = await fetch("/api/charts");
  if (!res.ok) throw new Error("Failed to load charts");
  const data = await res.json();
  return data.tracks as ScTrack[];
}

async function fetchRelated(trackId: number): Promise<ScTrack[]> {
  const res = await fetch(`/api/related/${trackId}?limit=12`);
  if (!res.ok) throw new Error("Failed to load related");
  const data = await res.json();
  return data.tracks as ScTrack[];
}

async function fetchSearch(q: string): Promise<ScTrack[]> {
  const res = await fetch(
    `/api/search?q=${encodeURIComponent(q)}&kind=tracks&limit=12`
  );
  if (!res.ok) throw new Error("Failed to load search");
  const data = await res.json();
  return data.tracks as ScTrack[];
}

export function HomeView() {
  const setView = usePlayer((s) => s.setView);
  const listenHistory = usePlayer((s) => s.listenHistory);
  const searchHistory = usePlayer((s) => s.searchHistory);
  const trackCache = usePlayer((s) => s.trackCache);

  // Charts (always)
  const { data: charts, isLoading: chartsLoading } = useQuery({
    queryKey: ["charts"],
    queryFn: fetchCharts,
    staleTime: 1000 * 60 * 5,
  });

  // Personalized: related to the most recently played track
  const lastPlayedId = listenHistory[0];
  const lastPlayedTrack = lastPlayedId ? trackCache[lastPlayedId] : undefined;
  const { data: recommendedForYou } = useQuery({
    queryKey: ["recommended-from-listen", lastPlayedId],
    queryFn: () => fetchRelated(lastPlayedId!),
    enabled: !!lastPlayedId,
    staleTime: 1000 * 60 * 10,
  });

  // Personalized: tracks from the most recent search
  const lastSearch = searchHistory[0];
  const { data: fromSearch } = useQuery({
    queryKey: ["recommended-from-search", lastSearch],
    queryFn: () => fetchSearch(lastSearch!),
    enabled: !!lastSearch,
    staleTime: 1000 * 60 * 10,
  });

  const featured = charts?.slice(0, 6) ?? [];
  const trending = charts?.slice(6, 18) ?? [];
  const more = charts?.slice(18) ?? [];

  // Recommended: dedupe against already-played tracks and chart tracks
  const playedIds = new Set(listenHistory);
  const chartIds = new Set(charts?.map((t) => t.id) ?? []);
  const recommended =
    recommendedForYou?.filter(
      (t) => !playedIds.has(t.id) && !chartIds.has(t.id)
    ).slice(0, 12) ?? [];

  const fromSearchTracks =
    fromSearch?.filter(
      (t) => !playedIds.has(t.id) && !chartIds.has(t.id)
    ).slice(0, 12) ?? [];

  const hasPersonalization = recommended.length > 0 || fromSearchTracks.length > 0;

  return (
    <div className="px-4 sm:px-6 py-6 space-y-8 max-w-[1600px] mx-auto pb-24 md:pb-6">
      {/* Hero / greeting */}
      <section>
        <h1 className="text-xl sm:text-2xl font-bold text-white mb-1">
          {hasPersonalization
            ? "Welcome back — here's what we picked for you"
            : "Hear what's trending for free in the NotSoundcloud community"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {hasPersonalization
            ? "Recommendations based on your recent listening and searches."
            : "Fresh tracks, mixes, and podcasts from independent creators around the world."}
        </p>
      </section>

      {/* Personalized: Recommended for you */}
      {recommended.length > 0 && lastPlayedTrack && (
        <section>
          <div className="flex items-baseline justify-between mb-3 gap-2">
            <h2 className="flex items-center gap-2 text-base sm:text-lg font-semibold text-white">
              <Sparkles className="size-4 text-[var(--theme-accent)]" />
              Because you listened to {lastPlayedTrack.title}
            </h2>
            <button
              onClick={() =>
                setView({ kind: "track", id: String(lastPlayedTrack.id), title: lastPlayedTrack.title })
              }
              className="text-xs text-muted-foreground hover:text-white shrink-0"
            >
              View track
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {recommended.map((t) => (
              <TrackCard key={t.id} track={t} queueContext={recommended} />
            ))}
          </div>
        </section>
      )}

      {/* Personalized: From your last search */}
      {fromSearchTracks.length > 0 && lastSearch && (
        <section>
          <div className="flex items-baseline justify-between mb-3 gap-2">
            <h2 className="flex items-center gap-2 text-base sm:text-lg font-semibold text-white">
              <SearchIcon className="size-4 text-[var(--theme-accent)]" />
              More like &quot;{lastSearch}&quot;
            </h2>
            <button
              onClick={() => setView({ kind: "search", query: lastSearch })}
              className="text-xs text-muted-foreground hover:text-white shrink-0"
            >
              See all
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {fromSearchTracks.map((t) => (
              <TrackCard key={t.id} track={t} queueContext={fromSearchTracks} />
            ))}
          </div>
        </section>
      )}

      {/* Charts: Trending (always shown) */}
      <section>
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="flex items-center gap-2 text-base sm:text-lg font-semibold text-white">
            <Flame className="size-4 text-[var(--theme-accent)]" />
            Charts: Trending
          </h2>
          <button
            onClick={() => setView({ kind: "search" })}
            className="text-xs text-muted-foreground hover:text-white"
          >
            See all
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
          {chartsLoading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex flex-col gap-2 p-3">
                  <Skeleton className="aspect-square w-full rounded-md bg-[#1a1a1a]" />
                  <Skeleton className="h-3 w-3/4 bg-[#1a1a1a]" />
                  <Skeleton className="h-3 w-1/2 bg-[#1a1a1a]" />
                </div>
              ))
            : featured.map((t) => (
                <TrackCard key={t.id} track={t} queueContext={featured} />
              ))}
        </div>
      </section>

      {/* New & Hot */}
      {trending.length > 0 && (
        <section>
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-base sm:text-lg font-semibold text-white">New &amp; Hot</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {trending.map((t) => (
              <TrackCard key={t.id} track={t} queueContext={trending} />
            ))}
          </div>
        </section>
      )}

      {/* More to discover */}
      {more.length > 0 && (
        <section>
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-base sm:text-lg font-semibold text-white">Discover more</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {more.map((t) => (
              <TrackCard key={t.id} track={t} queueContext={more} />
            ))}
          </div>
        </section>
      )}

      {/* Recently played (if we have history but no recs loaded yet) */}
      {listenHistory.length > 0 && (
        <section>
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="flex items-center gap-2 text-base sm:text-lg font-semibold text-white">
              <HistoryIcon className="size-4 text-[var(--theme-accent)]" />
              Jump back in
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {listenHistory
              .map((id) => trackCache[id])
              .filter(Boolean)
              .slice(0, 6)
              .map((t) => (
                <TrackCard key={t.id} track={t} queueContext={listenHistory.map((id) => trackCache[id]).filter(Boolean) as ScTrack[]} />
              ))}
          </div>
        </section>
      )}
    </div>
  );
}

"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { ScTrack } from "@/lib/soundcloud-utils";
import { createPersistentStorage } from "@/lib/persistent-storage";

// ---- Types ----
export type QueueItem = ScTrack;

export type RepeatMode = "off" | "all" | "one";

export type View =
  | { kind: "home" }
  | { kind: "search"; query?: string }
  | { kind: "library"; tab?: "playlists" | "liked" | "queue" }
  | { kind: "playlist"; id: string; source: "local" | "remote"; title?: string }
  | { kind: "track"; id: string; title?: string };

interface PlayerState {
  // ----- Now-playing / queue -----
  queue: QueueItem[];
  currentIndex: number;
  isPlaying: boolean;
  currentTime: number; // seconds
  duration: number; // seconds
  volume: number; // 0..1
  muted: boolean;
  repeat: RepeatMode;
  shuffle: boolean;
  // Autoplay: when on, after a track ends and the queue is exhausted,
  // we automatically fetch related tracks and keep playing.
  autoplay: boolean;
  // Streaming URL cache (per track id) so we don't re-resolve on every play
  streamUrlCache: Record<number, string>;
  // Large player vs mini player
  isMiniPlayer: boolean;
  // Queue panel open (in library)
  showQueue: boolean;
  // Mobile player expanded (large) vs collapsed (thumbnail-only)
  mobilePlayerExpanded: boolean;
  // Desktop expanded player (full-screen overlay with all controls),
  // triggered by clicking the artwork in the LargePlayer bottom bar.
  desktopPlayerExpanded: boolean;

  // ----- Visual settings -----
  // Blur amount (in px) for the blurred-thumbnail background behind the
  // large player bar. 0 = off (solid dark background).
  backgroundBlur: number;
  // Opacity (0..1) of the dark overlay on top of the blurred background
  // so controls remain readable.
  backgroundOverlay: number;
  // Dynamic theming: extract primary color from current track's artwork
  // and apply it as the app's accent color. When null, uses the default orange.
  dynamicTheme: boolean;
  // The currently-extracted theme color (hex string like "#ff5500") or null.
  themeColor: string | null;

  // ----- History (for personalized recommendations) -----
  // Last N track IDs listened to (most recent first).
  listenHistory: number[];
  // Last N search queries (most recent first).
  searchHistory: string[];
  // Cache of tracks that have been played (for quick re-render of UI).
  trackCache: Record<number, ScTrack>;

  // ----- Navigation (single-page app) -----
  view: View;
  viewStack: View[]; // for back navigation

  // ----- Actions -----
  setView: (view: View) => void;
  goBack: () => void;
  canGoBack: () => boolean;

  playTrack: (track: QueueItem, queue?: QueueItem[]) => void;
  playQueue: (tracks: QueueItem[], startIndex?: number) => void;
  togglePlay: () => void;
  play: () => void;
  pause: () => void;
  next: () => void;
  prev: () => void;
  seek: (seconds: number) => void;
  setTime: (seconds: number) => void;
  setDuration: (seconds: number) => void;
  setVolume: (v: number) => void;
  toggleMute: () => void;
  cycleRepeat: () => void;
  toggleShuffle: () => void;
  toggleAutoplay: () => void;
  setMiniPlayer: (v: boolean) => void;
  setShowQueue: (v: boolean) => void;
  setMobilePlayerExpanded: (v: boolean) => void;
  setDesktopPlayerExpanded: (v: boolean) => void;
  setBackgroundBlur: (px: number) => void;
  setBackgroundOverlay: (v: number) => void;
  setSettingsOpen: (v: boolean) => void;
  setDynamicTheme: (v: boolean) => void;
  setThemeColor: (hex: string | null) => void;

  addToQueue: (track: QueueItem) => void;
  addManyToQueue: (tracks: QueueItem[]) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
  moveQueueItem: (from: number, to: number) => void;

  cacheStreamUrl: (trackId: number, url: string) => void;
  cacheTrack: (track: ScTrack) => void;
  recordListen: (track: ScTrack) => void;
  recordSearch: (query: string) => void;

  // Settings panel open state (not persisted)
  settingsOpen: boolean;
}

const HISTORY_LIMIT = 5;

export const usePlayer = create<PlayerState>()(
  persist(
    (set, get) => ({
      queue: [],
      currentIndex: -1,
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      volume: 0.8,
      muted: false,
      repeat: "off",
      shuffle: false,
      autoplay: true,
      streamUrlCache: {},
      isMiniPlayer: false,
      showQueue: false,
      mobilePlayerExpanded: false,
      desktopPlayerExpanded: false,
      backgroundBlur: 40,
      backgroundOverlay: 0.75,
      dynamicTheme: true,
      themeColor: null,
      settingsOpen: false,
      listenHistory: [],
      searchHistory: [],
      trackCache: {},
      view: { kind: "home" },
      viewStack: [],

      setView: (view) =>
        set((s) => ({
          viewStack: [...s.viewStack, s.view],
          view,
        })),

      goBack: () =>
        set((s) => {
          if (s.viewStack.length === 0) return {};
          const stack = [...s.viewStack];
          const prev = stack.pop()!;
          return { view: prev, viewStack: stack };
        }),

      canGoBack: () => get().viewStack.length > 0,

      playTrack: (track, queue) => {
        const q = queue && queue.length > 0 ? queue : [track];
        const idx = q.findIndex((t) => t.id === track.id);
        set({
          queue: q,
          currentIndex: idx >= 0 ? idx : 0,
          isPlaying: true,
          currentTime: 0,
          duration: 0,
        });
        get().recordListen(track);
      },

      playQueue: (tracks, startIndex = 0) => {
        if (tracks.length === 0) return;
        const idx = Math.max(0, Math.min(startIndex, tracks.length - 1));
        set({
          queue: tracks,
          currentIndex: idx,
          isPlaying: true,
          currentTime: 0,
          duration: 0,
        });
        get().recordListen(tracks[idx]);
      },

      togglePlay: () => set((s) => ({ isPlaying: !s.isPlaying })),
      play: () => set({ isPlaying: true }),
      pause: () => set({ isPlaying: false }),

      next: () => {
        const { queue, currentIndex, repeat, shuffle } = get();
        if (queue.length === 0) return;
        if (repeat === "one") {
          set({ currentTime: 0, isPlaying: true });
          return;
        }
        let nextIdx: number;
        if (shuffle) {
          nextIdx = Math.floor(Math.random() * queue.length);
          if (nextIdx === currentIndex && queue.length > 1) {
            nextIdx = (nextIdx + 1) % queue.length;
          }
        } else {
          nextIdx = currentIndex + 1;
          if (nextIdx >= queue.length) {
            if (repeat === "all") nextIdx = 0;
            else {
              // Queue exhausted — pause and let audio-element handle autoplay.
              set({ isPlaying: false, currentTime: 0 });
              return;
            }
          }
        }
        set({ currentIndex: nextIdx, currentTime: 0, duration: 0, isPlaying: true });
        get().recordListen(queue[nextIdx]);
      },

      prev: () => {
        const { queue, currentIndex, currentTime } = get();
        if (queue.length === 0) return;
        if (currentTime > 3) {
          set({ currentTime: 0 });
          return;
        }
        let prevIdx = currentIndex - 1;
        if (prevIdx < 0) prevIdx = 0;
        set({ currentIndex: prevIdx, currentTime: 0, duration: 0, isPlaying: true });
        get().recordListen(queue[prevIdx]);
      },

      seek: (seconds) => set({ currentTime: seconds }),
      setTime: (seconds) => set({ currentTime: seconds }),
      setDuration: (seconds) => set({ duration: seconds }),
      setVolume: (v) => set({ volume: Math.max(0, Math.min(1, v)), muted: false }),
      toggleMute: () => set((s) => ({ muted: !s.muted })),
      cycleRepeat: () =>
        set((s) => ({
          repeat:
            s.repeat === "off" ? "all" : s.repeat === "all" ? "one" : "off",
        })),
      toggleShuffle: () => set((s) => ({ shuffle: !s.shuffle })),
      toggleAutoplay: () => set((s) => ({ autoplay: !s.autoplay })),
      setMiniPlayer: (v) => set({ isMiniPlayer: v }),
      setShowQueue: (v) => set({ showQueue: v }),
      setMobilePlayerExpanded: (v) => set({ mobilePlayerExpanded: v }),
      setDesktopPlayerExpanded: (v) => set({ desktopPlayerExpanded: v }),
      setBackgroundBlur: (px) =>
        set({ backgroundBlur: Math.max(0, Math.min(120, Math.round(px))) }),
      setBackgroundOverlay: (v) =>
        set({ backgroundOverlay: Math.max(0, Math.min(1, v)) }),
      setSettingsOpen: (v) => set({ settingsOpen: v }),
      setDynamicTheme: (v) => set({ dynamicTheme: v }),
      setThemeColor: (hex) => set({ themeColor: hex }),

      addToQueue: (track) =>
        set((s) => ({
          queue: [...s.queue, track],
          trackCache: { ...s.trackCache, [track.id]: track },
        })),

      addManyToQueue: (tracks) =>
        set((s) => {
          const trackCache = { ...s.trackCache };
          for (const t of tracks) trackCache[t.id] = t;
          return { queue: [...s.queue, ...tracks], trackCache };
        }),

      removeFromQueue: (index) =>
        set((s) => {
          const queue = [...s.queue];
          queue.splice(index, 1);
          let currentIndex = s.currentIndex;
          if (index < s.currentIndex) currentIndex -= 1;
          else if (index === s.currentIndex)
            currentIndex = Math.max(0, Math.min(currentIndex, queue.length - 1));
          return { queue, currentIndex };
        }),

      clearQueue: () =>
        set({
          queue: [],
          currentIndex: -1,
          isPlaying: false,
          currentTime: 0,
          duration: 0,
        }),

      moveQueueItem: (from, to) =>
        set((s) => {
          const queue = [...s.queue];
          const [item] = queue.splice(from, 1);
          queue.splice(to, 0, item);
          let currentIndex = s.currentIndex;
          if (from === s.currentIndex) currentIndex = to;
          else if (from < s.currentIndex && to >= s.currentIndex) currentIndex -= 1;
          else if (from > s.currentIndex && to <= s.currentIndex) currentIndex += 1;
          return { queue, currentIndex };
        }),

      cacheStreamUrl: (trackId, url) =>
        set((s) => ({ streamUrlCache: { ...s.streamUrlCache, [trackId]: url } })),

      cacheTrack: (track) =>
        set((s) => ({ trackCache: { ...s.trackCache, [track.id]: track } })),

      recordListen: (track) =>
        set((s) => {
          const newHistory = [track.id, ...s.listenHistory.filter((id) => id !== track.id)].slice(
            0,
            HISTORY_LIMIT
          );
          // Slim track cache: only keep the last HISTORY_LIMIT * 2 tracks
          // to avoid unbounded growth. We store a slimmed-down version of
          // each track (only the fields needed for UI rendering).
          const slimTrack = slimTrackForStorage(track);
          const newCache = { ...s.trackCache, [track.id]: slimTrack };
          // Prune: keep only tracks that are in listenHistory or likedTrackIds
          // (the library store handles its own cache separately)
          const keepIds = new Set([...newHistory]);
          const prunedCache: Record<number, ScTrack> = {};
          for (const [id, t] of Object.entries(newCache)) {
            if (keepIds.has(Number(id)) || Number(id) === track.id) {
              prunedCache[Number(id)] = t;
            }
          }
          return {
            listenHistory: newHistory,
            trackCache: prunedCache,
          };
        }),

      recordSearch: (query) =>
        set((s) => {
          const q = query.trim();
          if (!q) return {};
          const newHistory = [q, ...s.searchHistory.filter((x) => x !== q)].slice(
            0,
            HISTORY_LIMIT
          );
          return { searchHistory: newHistory };
        }),
    }),
    {
      name: "ns-player",
      storage: createJSONStorage(() => createPersistentStorage("ns-player")),
      // Only persist essential data — not transient playback state.
      partialize: (s) => ({
        volume: s.volume,
        muted: s.muted,
        repeat: s.repeat,
        shuffle: s.shuffle,
        autoplay: s.autoplay,
        isMiniPlayer: s.isMiniPlayer,
        listenHistory: s.listenHistory,
        searchHistory: s.searchHistory,
        // Persist a slimmed trackCache (only essential fields) so the homepage
        // can render recommendations without re-fetching.
        trackCache: slimTrackCacheForStorage(s.trackCache),
        // Visual settings
        backgroundBlur: s.backgroundBlur,
        backgroundOverlay: s.backgroundOverlay,
        dynamicTheme: s.dynamicTheme,
      }),
      // Merge persisted state with current state, handling the slimmed trackCache
      onRehydrateStorage: () => (state) => {
        if (state && state.trackCache) {
          // Track cache is already slimmed — it will be hydrated as-is
        }
      },
    }
  )
);

/**
 * Slim down a track object to only the fields needed for UI rendering.
 * This dramatically reduces storage size (removes large text fields like
 * description, tag_list, etc. that aren't needed for the homepage recommendations).
 */
function slimTrackForStorage(track: ScTrack): ScTrack {
  return {
    id: track.id,
    title: track.title,
    duration: track.duration,
    artwork_url: track.artwork_url,
    permalink_url: track.permalink_url,
    genre: track.genre,
    playback_count: track.playback_count,
    likes_count: track.likes_count,
    comment_count: track.comment_count,
    reposts_count: track.reposts_count,
    user: {
      id: track.user.id,
      username: track.user.username,
      avatar_url: track.user.avatar_url,
      permalink_url: track.user.permalink_url,
      permalink: track.user.permalink,
    },
    streamable: track.streamable,
    downloadable: track.downloadable,
  };
}

/**
 * Slim every track in a cache object for storage.
 */
function slimTrackCacheForStorage(
  cache: Record<number, ScTrack>
): Record<number, ScTrack> {
  const result: Record<number, ScTrack> = {};
  for (const [id, track] of Object.entries(cache)) {
    if (track) result[Number(id)] = slimTrackForStorage(track);
  }
  return result;
}

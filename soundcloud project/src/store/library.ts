"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { ScTrack, ScPlaylist } from "@/lib/soundcloud-utils";
import { createPersistentStorage } from "@/lib/persistent-storage";

// ---- Local playlist (user-created or "Liked") ----
export interface LocalPlaylist {
  id: string;
  title: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
  trackIds: number[]; // ordered
  // Cache of full track metadata (so UI can render without re-fetching)
  tracks: Record<number, ScTrack>;
  isLiked?: boolean; // for the special "Liked Songs" playlist
  artworkUrl?: string | null;
  // Original SoundCloud permalink if this playlist was imported
  sourceUrl?: string;
}

interface LibraryState {
  playlists: LocalPlaylist[];
  likedTrackIds: number[];
  likedTracksCache: Record<number, ScTrack>;

  // ----- Playlist actions -----
  createPlaylist: (title: string, description?: string) => string;
  renamePlaylist: (id: string, title: string) => void;
  deletePlaylist: (id: string) => void;
  addTrackToPlaylist: (playlistId: string, track: ScTrack) => void;
  removeTrackFromPlaylist: (playlistId: string, trackId: number) => void;
  reorderPlaylistTrack: (playlistId: string, from: number, to: number) => void;
  getPlaylist: (id: string) => LocalPlaylist | undefined;
  // Import a remote SoundCloud playlist into the user's local library.
  // Returns the new local playlist id.
  importRemotePlaylist: (playlist: ScPlaylist, title?: string) => string;

  // ----- Like actions -----
  toggleLike: (track: ScTrack) => void;
  isLiked: (trackId: number) => boolean;
  getLikedTracks: () => ScTrack[];
}

const LIKED_PLAYLIST_ID = "liked-songs";

export const useLibrary = create<LibraryState>()(
  persist(
    (set, get) => ({
      playlists: [
        {
          id: LIKED_PLAYLIST_ID,
          title: "Liked Songs",
          description: "Songs you've liked",
          createdAt: Date.now(),
          updatedAt: Date.now(),
          trackIds: [],
          tracks: {},
          isLiked: true,
          artworkUrl: null,
        },
      ],
      likedTrackIds: [],
      likedTracksCache: {},

      createPlaylist: (title, description) => {
        const id = `pl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const playlist: LocalPlaylist = {
          id,
          title: title.trim() || "New Playlist",
          description: description?.trim() || "",
          createdAt: Date.now(),
          updatedAt: Date.now(),
          trackIds: [],
          tracks: {},
          artworkUrl: null,
        };
        set((s) => ({ playlists: [...s.playlists, playlist] }));
        return id;
      },

      renamePlaylist: (id, title) =>
        set((s) => ({
          playlists: s.playlists.map((p) =>
            p.id === id ? { ...p, title: title.trim() || p.title, updatedAt: Date.now() } : p
          ),
        })),

      deletePlaylist: (id) => {
        if (id === LIKED_PLAYLIST_ID) return; // never delete the Liked playlist
        set((s) => ({ playlists: s.playlists.filter((p) => p.id !== id) }));
      },

      addTrackToPlaylist: (playlistId, track) =>
        set((s) => ({
          playlists: s.playlists.map((p) => {
            if (p.id !== playlistId) return p;
            if (p.trackIds.includes(track.id)) return p;
            return {
              ...p,
              trackIds: [...p.trackIds, track.id],
              tracks: { ...p.tracks, [track.id]: track },
              updatedAt: Date.now(),
              artworkUrl: p.artworkUrl ?? track.artwork_url,
            };
          }),
        })),

      removeTrackFromPlaylist: (playlistId, trackId) =>
        set((s) => ({
          playlists: s.playlists.map((p) => {
            if (p.id !== playlistId) return p;
            const trackIds = p.trackIds.filter((id) => id !== trackId);
            const tracks = { ...p.tracks };
            delete tracks[trackId];
            return { ...p, trackIds, tracks, updatedAt: Date.now() };
          }),
        })),

      reorderPlaylistTrack: (playlistId, from, to) =>
        set((s) => ({
          playlists: s.playlists.map((p) => {
            if (p.id !== playlistId) return p;
            const trackIds = [...p.trackIds];
            const [item] = trackIds.splice(from, 1);
            trackIds.splice(to, 0, item);
            return { ...p, trackIds, updatedAt: Date.now() };
          }),
        })),

      getPlaylist: (id) => get().playlists.find((p) => p.id === id),

      importRemotePlaylist: (playlist, title) => {
        const id = `pl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const tracks: Record<number, ScTrack> = {};
        const trackIds: number[] = [];
        for (const t of playlist.tracks ?? []) {
          if (!t || t.id == null) continue;
          tracks[t.id] = t;
          trackIds.push(t.id);
        }
        const local: LocalPlaylist = {
          id,
          title: (title ?? playlist.title ?? "Imported Playlist").trim() || "Imported Playlist",
          description: playlist.description ?? "",
          createdAt: Date.now(),
          updatedAt: Date.now(),
          trackIds,
          tracks,
          artworkUrl: playlist.artwork_url ?? trackIds[0]?.toString?.() ?? null,
          sourceUrl: playlist.permalink_url,
        };
        set((s) => ({ playlists: [...s.playlists, local] }));
        return id;
      },

      toggleLike: (track) =>
        set((s) => {
          const isLiked = s.likedTrackIds.includes(track.id);
          if (isLiked) {
            // unlike
            const likedTrackIds = s.likedTrackIds.filter((id) => id !== track.id);
            const likedTracksCache = { ...s.likedTracksCache };
            delete likedTracksCache[track.id];
            const playlists = s.playlists.map((p) => {
              if (p.id !== LIKED_PLAYLIST_ID) return p;
              const trackIds = p.trackIds.filter((id) => id !== track.id);
              const tracks = { ...p.tracks };
              delete tracks[track.id];
              return { ...p, trackIds, tracks, updatedAt: Date.now() };
            });
            return { likedTrackIds, likedTracksCache, playlists };
          }
          // like
          const likedTrackIds = [track.id, ...s.likedTrackIds];
          const likedTracksCache = { ...s.likedTracksCache, [track.id]: track };
          const playlists = s.playlists.map((p) => {
            if (p.id !== LIKED_PLAYLIST_ID) return p;
            return {
              ...p,
              trackIds: [track.id, ...p.trackIds],
              tracks: { ...p.tracks, [track.id]: track },
              updatedAt: Date.now(),
              artworkUrl: p.artworkUrl ?? track.artwork_url,
            };
          });
          return { likedTrackIds, likedTracksCache, playlists };
        }),

      isLiked: (trackId) => get().likedTrackIds.includes(trackId),

      getLikedTracks: () => {
        const ids = get().likedTrackIds;
        const cache = get().likedTracksCache;
        return ids.map((id) => cache[id]).filter(Boolean);
      },
    }),
    {
      name: "ns-library",
      storage: createJSONStorage(() => createPersistentStorage("ns-library")),
      // Slim down tracks before persisting to save storage space
      partialize: (s) => ({
        playlists: s.playlists.map((p) => ({
          ...p,
          // Slim each track in the playlist's cache
          tracks: Object.fromEntries(
            Object.entries(p.tracks).map(([id, t]) => [
              id,
              t
                ? {
                    id: t.id,
                    title: t.title,
                    duration: t.duration,
                    artwork_url: t.artwork_url,
                    permalink_url: t.permalink_url,
                    genre: t.genre,
                    playback_count: t.playback_count,
                    likes_count: t.likes_count,
                    user: {
                      id: t.user.id,
                      username: t.user.username,
                      avatar_url: t.user.avatar_url,
                      permalink_url: t.user.permalink_url,
                      permalink: t.user.permalink,
                    },
                    streamable: t.streamable,
                    downloadable: t.downloadable,
                  }
                : t,
            ])
          ),
        })),
        likedTrackIds: s.likedTrackIds,
        likedTracksCache: Object.fromEntries(
          Object.entries(s.likedTracksCache).map(([id, t]) => [
            id,
            t
              ? {
                  id: t.id,
                  title: t.title,
                  duration: t.duration,
                  artwork_url: t.artwork_url,
                  permalink_url: t.permalink_url,
                  genre: t.genre,
                  playback_count: t.playback_count,
                  likes_count: t.likes_count,
                  user: {
                    id: t.user.id,
                    username: t.user.username,
                    avatar_url: t.user.avatar_url,
                    permalink_url: t.user.permalink_url,
                    permalink: t.user.permalink,
                  },
                  streamable: t.streamable,
                  downloadable: t.downloadable,
                }
              : t,
          ])
        ),
      }),
    }
  )
);

export { LIKED_PLAYLIST_ID };

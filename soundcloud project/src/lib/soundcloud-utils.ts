// Client-safe types and utility functions — no Node-only imports here.
// These mirror the relevant subset of the soundcloud.ts library's types.

export interface ScUser {
  id: number;
  username: string;
  avatar_url: string;
  permalink_url: string;
  permalink: string;
  city?: string;
  country_code?: string | number | null;
  followers_count?: number;
  track_count?: number;
  description?: string;
  verified?: boolean;
}

export interface ScTrack {
  id: number;
  title: string;
  duration: number;
  artwork_url: string | null;
  permalink_url: string;
  genre: string | null;
  playback_count: number;
  likes_count: number;
  comment_count: number;
  reposts_count: number;
  downloads_count?: number;
  user: ScUser;
  streamable: boolean;
  downloadable: boolean;
  tag_list?: string;
  description?: string | null;
  created_at?: string;
}

export interface ScPlaylist {
  id: number;
  title: string;
  description: string | null;
  artwork_url: string | null;
  permalink_url: string;
  track_count: number;
  duration: number;
  user: ScUser;
  tracks: ScTrack[];
  is_album?: boolean;
  genre?: string | null;
  created_at?: string;
}

export interface ScComment {
  id: number;
  body: string;
  timestamp: number;
  created_at: string;
  user: {
    id: number;
    username: string;
    avatar_url: string;
    permalink_url: string;
  };
}

// SoundCloud artwork URLs end with a size suffix like:
//   -large.jpg, -t67x67.jpg, -t300x300.jpg, -t500x500.jpg, -badge.jpg,
//   -small.jpg, -tiny.jpg, -mini.jpg, -crop.jpg, -original.jpg
// This regex matches ALL known suffixes so we can swap to any target size.
const ARTWORK_SIZE_REGEX =
  /-(large|t67x67|t300x300|t500x500|badge|small|tiny|mini|crop|original)\.(jpg|jpeg|png|webp)/i;

/**
 * Upgrade artwork to the t500x500 size (good balance of quality + load speed
 * for thumbnails and player artwork).
 */
export function largeArtwork(url: string | null | undefined): string | null {
  if (!url) return null;
  return url.replace(ARTWORK_SIZE_REGEX, "-t500x500.$2");
}

/**
 * Get a medium-sized artwork (t300x300) — useful for list rows and small
 * thumbnails where t500x500 is overkill.
 */
export function mediumArtwork(url: string | null | undefined): string | null {
  if (!url) return null;
  return url.replace(ARTWORK_SIZE_REGEX, "-t300x300.$2");
}

/**
 * Get the original (highest quality) artwork — use sparingly, as these can be
 * several MB. Good for the expanded full-screen player.
 */
export function originalArtwork(url: string | null | undefined): string | null {
  if (!url) return null;
  return url.replace(ARTWORK_SIZE_REGEX, "-original.$2");
}

/**
 * Get a specific size of artwork. Falls back to the original URL if the
 * pattern doesn't match (e.g. non-SoundCloud URLs).
 */
export function artworkAtSize(
  url: string | null | undefined,
  size: "t67x67" | "t300x300" | "t500x500" | "large" | "crop" | "original"
): string | null {
  if (!url) return null;
  return url.replace(ARTWORK_SIZE_REGEX, `-${size}.$2`);
}

// Helper: format duration ms -> mm:ss or h:mm:ss
export function formatDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// Helper: format large counts (e.g. 12345 -> "12.3K")
export function formatCount(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "0";
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

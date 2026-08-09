/**
 * Edge-compatible SoundCloud API client.
 *
 * This module replaces the Node-only `soundcloud.ts` library with direct
 * `fetch` calls to the SoundCloud API v2. It works in any runtime that
 * supports the Fetch API (Cloudflare Pages Edge, Cloudflare Workers,
 * Vercel Edge, browsers, Node 18+).
 *
 * The SoundCloud API auto-discovers a client_id by scraping soundcloud.com.
 * We do the same here — no API key required.
 */

const SOUNDCLOUD_BASE = "https://api-v2.soundcloud.com";

// Cached client_id (SoundCloud rotates these periodically; we refresh on 401)
let cachedClientId: string | null = null;

interface ScResource {
  kind: string;
  id: number;
  [key: string]: any;
}

/**
 * Fetch the client_id from soundcloud.com's homepage by scraping the JS bundle.
 * SoundCloud's client_id is a 32-character alphanumeric string embedded in
 * one of the JS bundles loaded on the homepage.
 */
async function getClientId(): Promise<string> {
  if (cachedClientId) return cachedClientId;

  // Try the desktop site first
  try {
    const html = await fetch("https://soundcloud.com", {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    }).then((r) => r.text());

    // Find all JS bundle URLs from sndcdn.com
    const scriptMatches = [
      ...html.matchAll(/src="(https:\/\/a-v2\.sndcdn\.com\/assets\/[^"]+\.js)"/g),
    ].map((m) => m[1]);

    // Search each bundle for the client_id
    for (const jsUrl of scriptMatches) {
      try {
        const js = await fetch(jsUrl).then((r) => r.text());
        // The client_id is a 32-char alphanumeric string assigned to client_id
        const clientIdMatch = js.match(
          /client_id["':\s]*["']([a-zA-Z0-9]{32})["']/
        );
        if (clientIdMatch) {
          cachedClientId = clientIdMatch[1];
          return cachedClientId;
        }
      } catch {}
    }
  } catch {}

  // Fallback: try the mobile site
  try {
    const html = await fetch("https://m.soundcloud.com", {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
      },
    }).then((r) => r.text());
    const scriptMatches = [
      ...html.matchAll(/src="(https:\/\/a-v2\.sndcdn\.com\/assets\/[^"]+\.js)"/g),
    ].map((m) => m[1]);
    for (const jsUrl of scriptMatches) {
      try {
        const js = await fetch(jsUrl).then((r) => r.text());
        const clientIdMatch = js.match(
          /client_id["':\s]*["']([a-zA-Z0-9]{32})["']/
        );
        if (clientIdMatch) {
          cachedClientId = clientIdMatch[1];
          return cachedClientId;
        }
      } catch {}
    }
  } catch {}

  throw new Error("Could not discover SoundCloud client_id");
}

/**
 * Make a request to the SoundCloud API v2 with the client_id attached.
 */
async function scFetch(endpoint: string, params: Record<string, any> = {}): Promise<any> {
  const clientId = await getClientId();
  const url = new URL(
    endpoint.startsWith("http") ? endpoint : `${SOUNDCLOUD_BASE}${endpoint}`
  );
  url.searchParams.set("client_id", clientId);
  for (const [key, value] of Object.entries(params)) {
    if (value != null) url.searchParams.set(key, String(value));
  }

  const response = await fetch(url.toString(), {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "application/json",
    },
  });

  if (response.status === 401) {
    // client_id expired — clear cache and retry once
    cachedClientId = null;
    return scFetch(endpoint, params);
  }

  if (!response.ok) {
    throw new Error(`SoundCloud API error: ${response.status}`);
  }

  return response.json();
}

// ---- Public API (mirrors the subset of soundcloud.ts we use) ----

export async function searchTracks(q: string, limit = 30, offset = 0) {
  return scFetch("/search/tracks", { q, limit, offset });
}

export async function searchPlaylists(q: string, limit = 30, offset = 0) {
  return scFetch("/search/playlists", { q, limit, offset });
}

export async function searchUsers(q: string, limit = 30, offset = 0) {
  return scFetch("/search/users", { q, limit, offset });
}

export async function getTrack(id: number | string) {
  return scFetch(`/tracks/${id}`);
}

export async function getRelatedTracks(id: number | string, limit = 20) {
  return scFetch(`/tracks/${id}/related`, { limit });
}

export async function getComments(id: number | string, limit = 30) {
  return scFetch(`/tracks/${id}/comments`, { limit, threaded: 0 });
}

export async function getPlaylist(id: number | string) {
  const playlist = await scFetch(`/playlists/${id}`);
  return playlist;
}

/**
 * Resolve a SoundCloud URL to a resource (track, playlist, user).
 */
export async function resolveUrl(url: string): Promise<ScResource> {
  return scFetch("/resolve", { url });
}

/**
 * Get the playable stream URL for a track.
 * Fetches the track, finds the best transcoding (progressive > hls, HQ > SQ),
 * then exchanges the transcoding URL for a signed media URL.
 */
export async function getStreamUrl(trackId: number | string): Promise<string | null> {
  const track = await getTrack(trackId);
  const transcodings = track?.media?.transcodings;
  if (!transcodings || transcodings.length === 0) return null;

  // Sort: prefer progressive (mp3) over hls, HQ over SQ
  const sorted = [...transcodings].sort((a: any, b: any) => {
    const aScore =
      (a.format?.protocol === "progressive" ? 2 : 0) +
      (a.quality === "hq" ? 1 : 0);
    const bScore =
      (b.format?.protocol === "progressive" ? 2 : 0) +
      (b.quality === "hq" ? 1 : 0);
    return bScore - aScore;
  });

  for (const transcoding of sorted) {
    try {
      const result = await scFetch(transcoding.url);
      if (result?.url) return result.url;
    } catch {}
  }

  return null;
}

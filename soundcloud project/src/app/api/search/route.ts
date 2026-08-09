import { NextRequest, NextResponse } from "next/server";
import {
  searchTracks,
  searchPlaylists,
  searchUsers,
} from "@/lib/soundcloud-edge";
import type { ScTrack } from "@/lib/soundcloud-utils";

// GET /api/search?q=<query>&limit=<n>&offset=<n>&kind=<tracks|playlists|users|all>
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";
  const limit = Math.min(Number(searchParams.get("limit") ?? 30), 50);
  const offset = Math.max(0, Number(searchParams.get("offset") ?? 0));
  const kind = searchParams.get("kind") ?? "tracks";

  try {
    if (kind === "tracks") {
      const res = await searchTracks(q, limit, offset);
      return NextResponse.json({
        tracks: res.collection ?? [],
        nextHref: res.next_href ?? null,
        offset,
        limit,
      });
    }
    if (kind === "playlists") {
      const res = await searchPlaylists(q, limit, offset);
      return NextResponse.json({
        playlists: res.collection ?? [],
        nextHref: res.next_href ?? null,
        offset,
        limit,
      });
    }
    if (kind === "users") {
      const res = await searchUsers(q, limit, offset);
      return NextResponse.json({
        users: res.collection ?? [],
        nextHref: res.next_href ?? null,
        offset,
        limit,
      });
    }
    if (kind === "all") {
      const [t, p, u] = await Promise.all([
        searchTracks(q, Math.min(limit, 12)),
        searchPlaylists(q, Math.min(limit, 8)),
        searchUsers(q, Math.min(limit, 6)),
      ]);
      return NextResponse.json({
        tracks: (t.collection ?? []) as ScTrack[],
        playlists: p.collection ?? [],
        users: u.collection ?? [],
        tracksNextHref: t.next_href ?? null,
        playlistsNextHref: p.next_href ?? null,
        usersNextHref: u.next_href ?? null,
      });
    }
    return NextResponse.json({ error: "Invalid kind" }, { status: 400 });
  } catch (e) {
    console.error("[/api/search] error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

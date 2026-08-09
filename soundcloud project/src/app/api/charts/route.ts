import { NextRequest, NextResponse } from "next/server";
import { searchTracks } from "@/lib/soundcloud-edge";
import type { ScTrack } from "@/lib/soundcloud-utils";

// Cloudflare Pages requires the Edge runtime for API routes.
export const runtime = "edge";

// GET /api/charts — fetch trending tracks to seed the home page.
const SEED_QUERIES = ["lofi hip hop", "electronic", "chillhop", "house", "ambient"];

export async function GET() {
  try {
    const picked = SEED_QUERIES[Math.floor(Math.random() * SEED_QUERIES.length)];
    const res = await searchTracks(picked, 30);
    const tracks = ((res.collection ?? []) as ScTrack[]).filter((t) => t.streamable);
    return NextResponse.json({ tracks, query: picked });
  } catch (e) {
    console.error("[/api/charts] error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getRelatedTracks } from "@/lib/soundcloud-edge";
import type { ScTrack } from "@/lib/soundcloud-utils";

// Cloudflare Pages requires the Edge runtime for API routes.
export const runtime = "edge";

// GET /api/related/[id]?limit=<n>
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const limit = Number(new URL(req.url).searchParams.get("limit") ?? 20);
  try {
    const resolvable = /^\d+$/.test(id) ? Number(id) : id;
    const res = await getRelatedTracks(resolvable, limit);
    return NextResponse.json({ tracks: (res.collection ?? []) as ScTrack[] });
  } catch (e) {
    console.error("[/api/related] error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

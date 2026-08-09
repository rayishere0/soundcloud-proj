import { NextRequest, NextResponse } from "next/server";
import { getPlaylist } from "@/lib/soundcloud-edge";
import type { ScPlaylist } from "@/lib/soundcloud-utils";

// GET /api/playlist/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const resolvable = /^\d+$/.test(id) ? Number(id) : id;
    const playlist = await getPlaylist(resolvable);
    return NextResponse.json({ playlist: playlist as ScPlaylist });
  } catch (e) {
    console.error("[/api/playlist] error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

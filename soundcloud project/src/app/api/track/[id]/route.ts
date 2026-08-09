import { NextRequest, NextResponse } from "next/server";
import { getTrack } from "@/lib/soundcloud-edge";

// Cloudflare Pages requires the Edge runtime for API routes.
export const runtime = "edge";

// GET /api/track/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const resolvable = /^\d+$/.test(id) ? Number(id) : id;
    const track = await getTrack(resolvable);
    return NextResponse.json({ track });
  } catch (e) {
    console.error("[/api/track] error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getComments } from "@/lib/soundcloud-edge";
import type { ScComment } from "@/lib/soundcloud-utils";

// Cloudflare Pages requires the Edge runtime for API routes.
export const runtime = "edge";

// GET /api/comments/[id]?limit=<n>
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const limit = Math.min(Number(new URL(req.url).searchParams.get("limit") ?? 30), 50);
  try {
    const resolvable = /^\d+$/.test(id) ? Number(id) : id;
    const res = await getComments(resolvable, limit);
    return NextResponse.json({ comments: (res.collection ?? []) as ScComment[] });
  } catch (e) {
    console.error("[/api/comments] error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

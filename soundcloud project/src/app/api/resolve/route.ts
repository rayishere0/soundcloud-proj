import { NextRequest, NextResponse } from "next/server";
import { resolveUrl } from "@/lib/soundcloud-edge";

// Cloudflare Pages requires the Edge runtime for API routes.
export const runtime = "edge";

// GET /api/resolve?url=<soundcloud url>
export async function GET(req: NextRequest) {
  const url = new URL(req.url).searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }
  try {
    const resource = await resolveUrl(url);
    if (!resource || !resource.kind) {
      return NextResponse.json({ error: "Could not resolve URL" }, { status: 404 });
    }
    return NextResponse.json({ resource });
  } catch (e) {
    console.error("[/api/resolve] error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

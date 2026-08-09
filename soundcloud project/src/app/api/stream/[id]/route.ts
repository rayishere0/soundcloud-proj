import { NextRequest, NextResponse } from "next/server";
import { getStreamUrl } from "@/lib/soundcloud-edge";

// GET /api/stream/[id] — resolves to a playable SoundCloud CDN URL and 302-redirects.
// Pass ?json=1 to get the URL as JSON instead of a redirect.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const wantsJson = new URL(req.url).searchParams.get("json") === "1";

  try {
    const resolvable = /^\d+$/.test(id) ? Number(id) : id;
    const url = await getStreamUrl(resolvable);

    if (!url) {
      return NextResponse.json(
        { error: "No streamable transcoding found" },
        { status: 404 }
      );
    }

    if (wantsJson) {
      return NextResponse.json({ url });
    }
    return NextResponse.redirect(url, { status: 302 });
  } catch (e) {
    console.error("[/api/stream] error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

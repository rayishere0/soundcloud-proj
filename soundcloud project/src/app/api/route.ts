import { NextResponse } from "next/server";

// Cloudflare Pages requires the Edge runtime for API routes.
export const runtime = "edge";

// Simple health check endpoint.
export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "notsoundcloud",
    time: new Date().toISOString(),
  });
}

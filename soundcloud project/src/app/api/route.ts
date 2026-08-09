import { NextResponse } from "next/server";

// Simple health check endpoint.
export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "soundcloud-clone",
    time: new Date().toISOString(),
  });
}

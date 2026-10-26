import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    { mockAi: process.env.MOCK_AI === "true" },
    { headers: { "Cache-Control": "no-store" } },
  );
}

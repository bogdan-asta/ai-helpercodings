import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    {
      mockAi: process.env.MOCK_AI === "true",
      openRouterKeyConfigured: Boolean(process.env.OPENROUTER_API_KEY),
      reviewModelConfigured: Boolean(process.env.OPENROUTER_MODEL_REVIEW),
      taskModelConfigured: Boolean(process.env.OPENROUTER_MODEL_TASKS),
      supabaseUrlConfigured: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
      supabaseAnonKeyConfigured: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      supabaseServiceRoleKeyConfigured: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

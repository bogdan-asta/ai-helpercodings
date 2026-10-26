import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateTask } from "@/lib/ai/openrouter";

const inputSchema = z.object({
  topic: z.string().trim().min(2).max(60).optional(),
  difficulty: z.number().int().min(1).max(3).optional(),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Серверный ИИ требует настройки Supabase." }, { status: 503 });
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Войди в аккаунт, чтобы создать задание." }, { status: 401 });
  const parsed = inputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Проверь тему и сложность задания." }, { status: 400 });

  try {
    const admin = createAdminClient();
    const { data: profile, error: profileError } = await admin.from("profiles").select("id").eq("id", user.id).maybeSingle();
    if (profileError) throw profileError;
    if (!profile) return NextResponse.json({ error: "Профиль не найден. Выйди и начни заново." }, { status: 404 });
    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);
    const { count, error: countError } = await admin.from("usage_log").select("*", { count: "exact", head: true })
      .eq("user_id", user.id).eq("kind", "generate_task").gte("created_at", startOfDay.toISOString());
    if (countError) throw countError;
    if ((count ?? 0) >= Number(process.env.DAILY_LIMIT_GENERATIONS ?? 10)) {
      return NextResponse.json({ error: "На сегодня лимит новых заданий закончился. Попробуй завтра!" }, { status: 429 });
    }
    const { data: issued, error: issuedError } = await admin.from("tasks").select("title").or(`user_id.is.null,user_id.eq.${user.id}`);
    if (issuedError) throw issuedError;
    let task;
    try {
      task = await generateTask(parsed.data.topic, parsed.data.difficulty, (issued ?? []).map(row => row.title));
    } catch (error) {
      console.error("PromptCoach task provider error", error);
      if (error instanceof Error && error.message === "ИИ пока не подключён") {
        return NextResponse.json({ error: error.message }, { status: 503 });
      }
      return NextResponse.json({ error: "Не удалось создать задание. Попробуй ещё раз." }, { status: 502 });
    }
    const { data: saved, error: saveError } = await admin.from("tasks").insert({ ...task, user_id: user.id }).select().single();
    if (saveError) throw saveError;
    const { error: logError } = await admin.from("usage_log").insert({ user_id: user.id, kind: "generate_task" });
    if (logError) throw logError;
    return NextResponse.json({ task: saved });
  } catch (error) {
    console.error("PromptCoach task generation failed", error);
    return NextResponse.json({ error: "Не получилось сохранить задание. Попробуй ещё раз." }, { status: 500 });
  }
}

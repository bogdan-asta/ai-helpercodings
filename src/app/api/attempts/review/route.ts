import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { reviewPrompt } from "@/lib/ai/openrouter";
import { levelForXp, nextStreak, xpForRepeat } from "@/lib/game/logic";

export const maxDuration = 60;

const inputSchema = z.object({
  taskId: z.string().uuid(),
  promptText: z.string().trim().min(1).max(1500),
});

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  if (!supabase) return errorResponse("ИИ пока не подключён: сначала настрой Supabase.", 503);
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return errorResponse("Войди в аккаунт, чтобы отправить промпт.", 401);

  const parsed = inputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return errorResponse("Проверь задание и текст промпта (до 1500 символов).", 400);
  const { taskId, promptText } = parsed.data;

  try {
    const admin = createAdminClient();
    const { data: task, error: taskError } = await admin.from("tasks")
      .select("id,title,description,difficulty").eq("id", taskId)
      .or(`user_id.is.null,user_id.eq.${user.id}`).maybeSingle();
    if (taskError) throw taskError;
    if (!task) return errorResponse("Это задание недоступно.", 404);

    const { data: profile, error: profileError } = await admin.from("profiles")
      .select("xp,level,streak,last_active").eq("id", user.id).single();
    if (profileError || !profile) return errorResponse("Профиль не найден. Выйди и начни заново.", 404);

    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);
    const { count, error: countError } = await admin.from("usage_log").select("*", { count: "exact", head: true })
      .eq("user_id", user.id).eq("kind", "review").gte("created_at", startOfDay.toISOString());
    if (countError) throw countError;
    const limit = Number(process.env.DAILY_LIMIT_REVIEWS ?? 20);
    if ((count ?? 0) >= limit) return errorResponse("На сегодня лимит разборов закончился. Попробуй завтра!", 429);

    const { data: previous, error: previousError } = await admin.from("attempts")
      .select("score").eq("user_id", user.id).eq("task_id", taskId).order("score", { ascending: false }).limit(1);
    if (previousError) throw previousError;

    let reviewResult;
    try {
      reviewResult = await reviewPrompt(task.title, task.description, promptText);
    } catch (error) {
      console.error("PromptCoach review provider error", error);
      if (error instanceof Error && error.message === "ИИ пока не подключён") return errorResponse(error.message, 503);
      return errorResponse("Не удалось получить разбор. Попробуй ещё раз.", 502);
    }

    const previousBest = previous?.[0]?.score ?? null;
    const earned = xpForRepeat(reviewResult.result.score, task.difficulty, previousBest);
    const totalXp = profile.xp + earned;
    const today = new Date().toISOString().slice(0, 10);
    const streakChange = nextStreak(profile.last_active, today);
    const streak = streakChange === "increment" ? profile.streak + 1 : streakChange === null ? profile.streak : 1;
    const { error: attemptError } = await admin.from("attempts").insert({
      user_id: user.id,
      task_id: taskId,
      prompt_text: promptText,
      score: reviewResult.result.score,
      review: reviewResult.result,
      model: reviewResult.model,
      xp_earned: earned,
    });
    if (attemptError) throw attemptError;
    const { error: profileUpdateError } = await admin.from("profiles").update({
      xp: totalXp,
      level: levelForXp(totalXp),
      streak,
      last_active: today,
    }).eq("id", user.id);
    if (profileUpdateError) throw profileUpdateError;
    const { error: logError } = await admin.from("usage_log").insert({ user_id: user.id, kind: "review" });
    if (logError) throw logError;

    return NextResponse.json({
      review: reviewResult.result,
      xpEarned: earned,
      xp: totalXp,
      level: levelForXp(totalXp),
      streak,
    });
  } catch (error) {
    console.error("PromptCoach review failed", error);
    return errorResponse("Не получилось сохранить разбор. Попробуй ещё раз.", 500);
  }
}

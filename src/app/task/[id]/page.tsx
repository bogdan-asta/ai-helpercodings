"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowRight, Check, ChevronDown, Clipboard, Lightbulb, RotateCcw, Sparkles } from "lucide-react";
import { ATTEMPTS_KEY, readPlayer, savePlayer, TASKS_KEY, type Player } from "@/components/app-shell";
import { createClient } from "@/lib/supabase/browser";
import { localMockReview } from "@/lib/ai/mock-client";
import { starterTasks, type Task } from "@/lib/tasks";
import type { Review } from "@/lib/ai/schemas";
import { levelForXp, nextStreak, xpForRepeat } from "@/lib/game/logic";

type Attempt = { taskId: string; taskTitle: string; topic: string; difficulty: number; score: number; createdAt: string; review: Review; promptText: string; xpEarned: number };
const criteria = [
  ["clarity", "Ясность"], ["context", "Контекст"], ["constraints", "Ограничения"], ["specificity", "Конкретность"], ["output_format", "Формат результата"],
] as const;

export default function TaskPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;
  const [task, setTask] = useState<Task | null>(null);
  const [player, setPlayer] = useState<Player | null>(null);
  const [promptText, setPromptText] = useState("");
  const [review, setReview] = useState<Review | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [hintIndex, setHintIndex] = useState(-1);
  const [copied, setCopied] = useState(false);
  const [earnedXp, setEarnedXp] = useState(0);
  const [loadingTask, setLoadingTask] = useState(true);

  useEffect(() => {
    const current = readPlayer();
    if (!current) { router.replace("/"); return; }
    setPlayer(current);
    const supabase = createClient();
    if (supabase && current.id) {
      const localTask = (JSON.parse(localStorage.getItem(TASKS_KEY) ?? "[]") as Task[]).find(item => item.id === id);
      if (localTask) { setTask(localTask); setLoadingTask(false); }
      else void supabase.from("tasks").select("*").eq("id", id).maybeSingle().then(({ data }) => { if (data) setTask(data as Task); setLoadingTask(false); });
      void supabase.from("attempts").select("review,prompt_text,xp_earned").eq("user_id", current.id).eq("task_id", id).order("created_at", { ascending: false }).limit(1).maybeSingle()
        .then(({ data }) => { if (data?.review) { setReview(data.review as Review); setPromptText(String(data.prompt_text)); setEarnedXp(data.xp_earned); } });
    } else {
      const found = [...starterTasks, ...JSON.parse(localStorage.getItem(TASKS_KEY) ?? "[]") as Task[]].find(item => item.id === id) ?? null;
      setTask(found);
      setLoadingTask(false);
      const previous = (JSON.parse(localStorage.getItem(ATTEMPTS_KEY) ?? "[]") as Attempt[]).find(item => item.taskId === id);
      if (previous) { setReview(previous.review); setPromptText(previous.promptText); setEarnedXp(previous.xpEarned); }
    }
  }, [id, router]);

  const saveLocalAttempt = useCallback((result: Review) => {
    const attempts = JSON.parse(localStorage.getItem(ATTEMPTS_KEY) ?? "[]") as Attempt[];
    const best = attempts.filter(item => item.taskId === id).reduce<number | null>((max, item) => max === null ? item.score : Math.max(max, item.score), null);
    const playerNow = readPlayer();
    if (!playerNow || !task) return;
    const xpEarned = xpForRepeat(result.score, task.difficulty, best);
    const newXp = playerNow.xp + xpEarned;
    const today = new Date().toISOString().slice(0, 10);
    const streakChange = nextStreak(playerNow.lastActive ?? null, today);
    const newPlayer = {
      ...playerNow, xp: newXp, level: levelForXp(newXp),
      streak: streakChange === "increment" ? playerNow.streak + 1 : streakChange === null ? playerNow.streak : 1,
      lastActive: today,
    };
    savePlayer(newPlayer);
    localStorage.setItem(ATTEMPTS_KEY, JSON.stringify([{
      taskId: id, taskTitle: task.title, topic: task.topic, difficulty: task.difficulty, score: result.score,
      createdAt: new Date().toISOString(), review: result, promptText, xpEarned,
    }, ...attempts]));
    setPlayer(newPlayer);
    return xpEarned;
  }, [id, promptText, task]);

  async function submit() {
    if (!task || !promptText.trim()) { setError("Напиши промпт перед отправкой."); return; }
    setBusy(true); setError("");
    try {
      const supabase = createClient();
      if (supabase && player?.id) {
        const response = await fetch("/api/attempts/review", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ taskId: task.id, promptText }) });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Не удалось получить разбор.");
        setReview(data.review as Review);
        setEarnedXp(Number(data.xpEarned) || 0);
        const updated = { ...player, xp: data.xp, level: data.level, streak: data.streak, lastActive: new Date().toISOString().slice(0, 10) };
        savePlayer(updated);
        setPlayer(updated);
      } else {
        const configResponse = await fetch("/api/config");
        if (!configResponse.ok || !(await configResponse.json()).mockAi) {
          throw new Error("ИИ пока не подключён. Настрой ключи или включи MOCK_AI=true.");
        }
        const localReview = { ...localMockReview };
        const earned = saveLocalAttempt(localReview);
        setEarnedXp(earned ?? 0);
        setReview(localReview);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось отправить промпт. Попробуй ещё раз.");
    } finally { setBusy(false); }
  }

  async function copyImproved() {
    if (!review) return;
    try { await navigator.clipboard.writeText(review.improved_prompt); setCopied(true); window.setTimeout(() => setCopied(false), 1800); }
    catch { setError("Не удалось скопировать текст. Выдели его и скопируй вручную."); }
  }

  const nextTask = starterTasks.find(item => item.id !== id);
  if (loadingTask) return <div className="card mx-auto max-w-xl animate-pulse p-8 text-center" aria-label="Загрузка задания"><div className="mx-auto h-6 w-2/3 rounded bg-[var(--line)]" /><div className="mx-auto mt-4 h-4 w-1/2 rounded bg-[var(--line)]" /></div>;
  if (!task) return <div className="card mx-auto max-w-xl p-8 text-center"><h1 className="text-xl font-bold">Задание не найдено</h1><p className="muted mt-2">Возможно, оно было удалено.</p><Link className="button-primary mt-5 inline-block" href="/dashboard">Вернуться к заданиям</Link></div>;

  return <div className="space-y-6">
    <div><Link href="/dashboard" className="muted text-sm hover:text-[var(--accent)]">← Все задания</Link><h1 className="mt-3 text-3xl font-black">{task.title}</h1><div className="muted mt-2 flex flex-wrap items-center gap-3 text-sm"><span>{task.topic}</span><span>·</span><span className="text-amber-500">{"●".repeat(task.difficulty)}{"○".repeat(3 - task.difficulty)}</span><span>Сложность {task.difficulty}</span></div></div>
    <div className="grid items-start gap-5 lg:grid-cols-2">
      <section className="card space-y-5 p-5 sm:p-6">
        <div><div className="mb-3 flex items-center gap-2 text-sm font-bold text-[var(--accent)]"><Sparkles size={17} />ТВОЁ ЗАДАНИЕ</div><p className="text-lg leading-8">{task.description}</p></div>
        <details className="rounded-xl bg-[var(--background)] p-4"><summary className="flex cursor-pointer list-none items-center justify-between font-semibold">Что должно получиться <ChevronDown size={17} /></summary><p className="muted mt-3 text-sm leading-6">{task.expected_result || "Реализуй описанное поведение в понятном и удобном интерфейсе."}</p></details>
        <details className="rounded-xl bg-[var(--background)] p-4"><summary className="flex cursor-pointer list-none items-center justify-between font-semibold">Подсказки <ChevronDown size={17} /></summary><ul className="mt-3 space-y-2 text-sm">{task.hints.slice(0, hintIndex + 1).map((hint, i) => <li key={i} className="flex gap-2"><Lightbulb size={16} className="shrink-0 text-amber-500" />{hint}</li>)}{hintIndex < 0 && <li className="muted">Открывай подсказки по одной, если понадобится.</li>}</ul></details>
        <button className="button-secondary inline-flex items-center gap-2" disabled={hintIndex >= task.hints.length - 1} onClick={() => setHintIndex(index => Math.min(index + 1, task.hints.length - 1))}><Lightbulb size={17} />{hintIndex >= task.hints.length - 1 ? "Подсказок больше нет" : "Подсказка"}</button>
      </section>
      <section className="card p-5 sm:p-6">
        <label htmlFor="prompt" className="block text-lg font-bold">Твой промпт</label><p className="muted mt-1 text-sm">Представь, что просишь ИИ-кодера выполнить это задание.</p>
        <textarea id="prompt" className="field mt-4 min-h-52 resize-y leading-7" maxLength={1500} value={promptText} onChange={e => setPromptText(e.target.value)} placeholder="Напиши, что именно нужно создать, как это должно работать и что важно учесть…" />
        <div className="muted mt-2 text-right text-xs">{promptText.length} / 1500</div>
        {error && <p role="alert" className="mt-3 rounded-xl bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">{error}</p>}
        <button className="button-primary mt-4 flex w-full items-center justify-center gap-2" onClick={submit} disabled={busy || !promptText.trim()}>{busy ? <><span className="animate-pulse">ИИ читает твой промпт…</span></> : error ? "Повторить разбор" : "Отправить на разбор"}</button>
      </section>
    </div>
    {review && <section className="card space-y-7 p-5 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-4"><div><p className="muted text-sm font-semibold">ОЦЕНКА ПРОМПТА</p><div className="mt-1 flex items-end gap-2"><span className="text-5xl font-black text-[var(--accent)]">{review.score}</span><span className="muted pb-1">/ 100</span></div></div><span className="rounded-2xl bg-emerald-50 px-4 py-3 font-bold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">+{earnedXp} XP</span></div>
      <div><h2 className="mb-3 font-bold">Критерии</h2><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{criteria.map(([key, label]) => <div key={key} className="rounded-xl bg-[var(--background)] p-3"><p className="muted text-xs">{label}</p><p className="mt-1 font-bold text-amber-500">{"★".repeat(review.criteria[key])}<span className="muted">{"★".repeat(5 - review.criteria[key])}</span></p><p className="text-xs">{review.criteria[key]} / 5</p></div>)}</div></div>
      <div className="grid gap-5 md:grid-cols-2"><div><h2 className="mb-3 font-bold">Что получилось хорошо</h2><ul className="space-y-2">{review.strengths.map((item, i) => <li key={i} className="flex gap-2 text-sm leading-6"><Check size={17} className="mt-1 shrink-0 text-emerald-600" />{item}</li>)}</ul></div><div><h2 className="mb-3 font-bold">Что улучшить</h2><div className="space-y-3">{review.improvements.map((item, i) => <div key={i} className="rounded-xl bg-[var(--background)] p-3 text-sm leading-6"><p><b>Проблема:</b> {item.issue}</p><p><b>Почему важно:</b> {item.why}</p><p><b>Как исправить:</b> {item.fix}</p></div>)}</div></div></div>
      <div className="rounded-2xl bg-[var(--accent-soft)] p-5"><div className="mb-3 flex items-center justify-between gap-3"><h2 className="font-bold">Улучшенная версия промпта</h2><button className="button-secondary inline-flex items-center gap-2 !py-2 text-sm" onClick={copyImproved}><Clipboard size={15} />{copied ? "Скопировано" : "Копировать"}</button></div><p className="whitespace-pre-wrap leading-7">{review.improved_prompt}</p></div>
      <div className="flex flex-wrap gap-3"><button className="button-secondary inline-flex items-center gap-2" onClick={() => { setReview(null); setError(""); }}><RotateCcw size={16} />Попробовать ещё раз</button>{nextTask && <Link className="button-primary inline-flex items-center gap-2" href={`/task/${nextTask.id}`}>Следующее задание <ArrowRight size={16} /></Link>}</div>
    </section>}
  </div>;
}

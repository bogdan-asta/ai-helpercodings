"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ATTEMPTS_KEY, readPlayer } from "@/components/app-shell";
import { createClient } from "@/lib/supabase/browser";
import { topics } from "@/lib/tasks";

type Attempt = { taskId: string; taskTitle: string; topic: string; score: number; difficulty?: number; createdAt: string; promptText?: string; review?: unknown };

export default function HistoryPage() {
  const router = useRouter();
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState("");
  useEffect(() => {
    const player = readPlayer();
    if (!player) { router.replace("/"); return; }
    try { setAttempts(JSON.parse(localStorage.getItem(ATTEMPTS_KEY) ?? "[]") as Attempt[]); } catch { setAttempts([]); }
    const supabase = createClient();
    if (supabase && player.id) void supabase.from("attempts").select("task_id,score,created_at,prompt_text,review,tasks(title,topic,difficulty)").eq("user_id", player.id).order("created_at", { ascending: false }).then(({ data }) => {
      if (data) setAttempts(data.map((row: Record<string, unknown>) => {
        const task = row.tasks as { title?: string; topic?: string; difficulty?: number } | null;
        return { taskId: String(row.task_id), taskTitle: task?.title ?? "Задание", topic: task?.topic ?? "", difficulty: task?.difficulty, score: Number(row.score), createdAt: String(row.created_at), promptText: String(row.prompt_text), review: row.review };
      }));
    });
  }, [router]);
  const filtered = useMemo(() => attempts.filter(item => (!topic || item.topic === topic) && (!difficulty || item.difficulty === Number(difficulty))), [attempts, topic, difficulty]);

  return <div className="space-y-6"><div><p className="muted text-sm font-semibold">ТВОЙ ПУТЬ</p><h1 className="mt-1 text-3xl font-black">История попыток</h1><p className="muted mt-2">Разборы и промпты, которые ты уже отправлял.</p></div>
    <div className="flex flex-wrap gap-3"><label className="sr-only" htmlFor="history-topic">Фильтр по теме</label><select id="history-topic" className="field max-w-xs" value={topic} onChange={e => setTopic(e.target.value)}><option value="">Все темы</option>{topics.map(item => <option key={item}>{item}</option>)}</select><label className="sr-only" htmlFor="history-difficulty">Фильтр по сложности</label><select id="history-difficulty" className="field max-w-xs" value={difficulty} onChange={e => setDifficulty(e.target.value)}><option value="">Любая сложность</option><option value="1">Сложность 1</option><option value="2">Сложность 2</option><option value="3">Сложность 3</option></select></div>
    {filtered.length ? <div className="space-y-3">{filtered.map((attempt, index) => <Link key={`${attempt.taskId}-${index}`} href={`/task/${attempt.taskId}`} className="card flex flex-wrap items-center justify-between gap-4 p-5 transition hover:shadow-md"><div><h2 className="font-bold">{attempt.taskTitle}</h2><p className="muted mt-1 text-sm">{new Date(attempt.createdAt).toLocaleString("ru-RU")} · {attempt.topic}{attempt.difficulty ? ` · Сложность ${attempt.difficulty}` : ""}</p>{attempt.promptText && <p className="muted mt-2 line-clamp-1 max-w-2xl text-sm">«{attempt.promptText}»</p>}</div><span className="rounded-xl bg-[var(--accent-soft)] px-4 py-3 text-xl font-black text-[var(--accent)]">{attempt.score}<span className="text-xs">/100</span></span></Link>)}</div> : <div className="card px-6 py-14 text-center"><div className="text-4xl">📝</div><h2 className="mt-3 text-xl font-bold">{attempts.length ? "Нет попыток по этим фильтрам" : "Пока ничего нет. Начни с первого задания"}</h2><Link href="/dashboard" className="button-primary mt-5 inline-flex">Перейти к заданиям</Link></div>}
  </div>;
}

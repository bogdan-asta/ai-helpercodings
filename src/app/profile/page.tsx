"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Flame, Star, Trophy } from "lucide-react";
import { ATTEMPTS_KEY, readPlayer, type Player } from "@/components/app-shell";
import { createClient } from "@/lib/supabase/browser";
import type { Review } from "@/lib/ai/schemas";

type Attempt = { score: number; createdAt: string; review?: Review };
const criteria = [["clarity", "Ясность"], ["context", "Контекст"], ["constraints", "Ограничения"], ["specificity", "Конкретность"], ["output_format", "Формат результата"]] as const;

export default function ProfilePage() {
  const router = useRouter();
  const [player, setPlayer] = useState<Player | null>(null);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  useEffect(() => {
    const current = readPlayer();
    if (!current) { router.replace("/"); return; }
    setPlayer(current);
    try { setAttempts(JSON.parse(localStorage.getItem(ATTEMPTS_KEY) ?? "[]") as Attempt[]); } catch { setAttempts([]); }
    const supabase = createClient();
    if (supabase && current.id) void Promise.all([
      supabase.from("profiles").select("display_name,level,xp,streak").eq("id", current.id).single(),
      supabase.from("attempts").select("score,created_at,review").eq("user_id", current.id).order("created_at", { ascending: true }),
    ]).then(([profileResult, attemptResult]) => {
      if (profileResult.data) setPlayer({ id: current.id, name: profileResult.data.display_name, level: profileResult.data.level, xp: profileResult.data.xp, streak: profileResult.data.streak });
      if (attemptResult.data) setAttempts(attemptResult.data.map(row => ({ score: Number(row.score), createdAt: row.created_at, review: row.review as Review })));
    });
  }, [router]);

  const weekly = useMemo(() => {
    const weeks = new Map<string, { total: number; count: number }>();
    attempts.forEach(attempt => {
      const date = new Date(attempt.createdAt);
      const start = new Date(date);
      start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
      const key = start.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
      const value = weeks.get(key) ?? { total: 0, count: 0 };
      value.total += attempt.score; value.count += 1; weeks.set(key, value);
    });
    return [...weeks.entries()].slice(-8).map(([week, value]) => ({ week, score: Math.round(value.total / value.count) }));
  }, [attempts]);
  const averages = useMemo(() => criteria.map(([key, label]) => {
    const values = attempts.map(item => item.review?.criteria?.[key]).filter((value): value is number => typeof value === "number");
    return { key, label, score: values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0 };
  }), [attempts]);
  const weakest = averages.length ? [...averages].filter(item => item.score > 0).sort((a, b) => a.score - b.score)[0]?.key : undefined;

  return <div className="space-y-7"><div><p className="muted text-sm font-semibold">ТВОЯ СТАТИСТИКА</p><h1 className="mt-1 text-3xl font-black">Прогресс</h1></div>
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><div className="card p-5"><p className="muted text-sm">Игрок</p><p className="mt-2 text-xl font-bold">{player?.name}</p><p className="muted mt-1 text-sm">Уровень {player?.level}</p></div><div className="card p-5"><p className="muted flex items-center gap-2 text-sm"><Star size={16} className="text-amber-500" />Всего XP</p><p className="mt-2 text-3xl font-black">{player?.xp ?? 0}</p></div><div className="card p-5"><p className="muted flex items-center gap-2 text-sm"><Flame size={16} className="text-orange-500" />Серия</p><p className="mt-2 text-3xl font-black">{player?.streak ?? 0} дней</p></div><div className="card p-5"><p className="muted flex items-center gap-2 text-sm"><Trophy size={16} className="text-[var(--accent)]" />Разборы</p><p className="mt-2 text-3xl font-black">{attempts.length}</p></div></section>
    {attempts.length ? <>
      <section className="card p-5 sm:p-6"><h2 className="mb-5 text-lg font-bold">Средняя оценка по неделям</h2><div className="h-64 w-full"><ResponsiveContainer width="100%" height="100%"><BarChart data={weekly}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--line)" /><XAxis dataKey="week" tickLine={false} axisLine={false} /><YAxis domain={[0, 100]} tickLine={false} axisLine={false} /><Tooltip /><Bar dataKey="score" name="Средняя оценка" fill="var(--accent)" radius={[8, 8, 0, 0]} /></BarChart></ResponsiveContainer></div></section>
      <section className="card p-5 sm:p-6"><h2 className="mb-4 text-lg font-bold">Сильные стороны и точки роста</h2><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{averages.map(item => <div key={item.key} className={`rounded-xl p-4 ${item.key === weakest ? "bg-amber-50 dark:bg-amber-950/30" : "bg-[var(--background)]"}`}><p className="muted text-sm">{item.label}</p><p className={`mt-2 text-2xl font-black ${item.key === weakest ? "text-amber-600" : ""}`}>{item.score ? `${item.score.toFixed(1)}/5` : "—"}</p><p className="muted mt-1 text-xs">{item.key === weakest ? "Зона роста" : item.score >= 4 ? "Сильная сторона" : "Продолжай практику"}</p></div>)}</div></section>
    </> : <div className="card px-6 py-14 text-center"><div className="text-4xl">🚀</div><h2 className="mt-3 text-xl font-bold">Здесь появится твой прогресс</h2><p className="muted mt-2">Сделай первое задание, чтобы увидеть статистику и сильные стороны.</p><Link className="button-primary mt-5 inline-flex" href="/dashboard">Начать тренировку</Link></div>}
  </div>;
}

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, BookOpen, Flame, Sparkles, Star } from "lucide-react";
import { starterTasks, topics, type Task } from "@/lib/tasks";
import { ATTEMPTS_KEY, readPlayer, TASKS_KEY, type Player } from "@/components/app-shell";
import { createClient } from "@/lib/supabase/browser";

type Attempt = { taskId: string; taskTitle: string; topic: string; score: number; createdAt: string; review?: unknown; promptText?: string };
const advice = [
  "Опиши не только цель, но и то, как пользователь взаимодействует с результатом.",
  "Укажи ограничения проекта: стек, существующие компоненты и что нельзя менять.",
  "Разбей сложную задачу на конкретные требования и проверяемые состояния.",
  "Добавь пример ожидаемого результата, если поведение можно понять по-разному.",
  "Скажи ИИ, какие граничные случаи важно обработать.",
  "Определи, как должен выглядеть интерфейс на мобильном экране.",
  "Проси сохранить существующий стиль и архитектуру проекта.",
  "Чётко отделяй обязательные требования от пожеланий.",
  "Опиши, что должно происходить при ошибке, загрузке и пустых данных.",
  "Уточни, какие поля обязательны и как показывать ошибки в форме.",
  "Добавь критерии готовности, по которым можно проверить результат.",
  "Укажи доступные действия с клавиатуры и состояния фокуса.",
  "Не перегружай промпт лишними деталями — сначала обозначь главную цель.",
  "Проси не менять несвязанные части приложения.",
  "Вместо «сделай красиво» опиши конкретные отступы, цвета и поведение.",
];

export default function DashboardPage() {
  const router = useRouter();
  const [player, setPlayer] = useState<Player | null>(null);
  const [tasks, setTasks] = useState<Task[]>(starterTasks);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [topic, setTopic] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const current = readPlayer();
    if (!current) { router.replace("/"); return; }
    setPlayer(current);
    try {
      const storedTasks = localStorage.getItem(TASKS_KEY);
      if (storedTasks) setTasks([...starterTasks, ...JSON.parse(storedTasks) as Task[]]);
      const storedAttempts = localStorage.getItem(ATTEMPTS_KEY);
      if (storedAttempts) setAttempts(JSON.parse(storedAttempts) as Attempt[]);
    } catch { setError("Не удалось прочитать сохранённые данные."); }
    const supabase = createClient();
    if (supabase && current.id) {
      setTasks([]);
      void Promise.all([
      supabase.from("tasks").select("*").order("created_at", { ascending: false }),
      supabase.from("attempts").select("task_id,score,created_at,review,prompt_text,tasks(title,topic)").eq("user_id", current.id).order("created_at", { ascending: false }),
    ]).then(([taskResult, attemptResult]) => {
      if (taskResult.error || attemptResult.error) {
        setError("Не удалось загрузить данные. Проверь подключение и настройки Supabase.");
      }
      if (taskResult.data) setTasks(taskResult.data as Task[]);
      if (attemptResult.data) setAttempts(attemptResult.data.map((row: Record<string, unknown>) => {
        const task = row.tasks as { title?: string; topic?: string } | null;
        return { taskId: String(row.task_id), taskTitle: task?.title ?? "Задание", topic: task?.topic ?? "", score: Number(row.score), createdAt: String(row.created_at), review: row.review, promptText: String(row.prompt_text) };
      }));
    });
    }
  }, [router]);

  const topicStats = useMemo(() => topics.map(name => {
    const all = tasks.filter(task => task.topic === name);
    const done = new Set(attempts.filter(a => a.topic === name).map(a => a.taskId)).size;
    return { name, count: all.length, done, difficulty: all.length ? Math.min(...all.map(t => t.difficulty)) : 1 };
  }), [tasks, attempts]);

  async function generate() {
    setBusy(true); setError("");
    try {
      const supabase = createClient();
      if (supabase && player?.id) {
        const response = await fetch("/api/tasks/generate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ topic: topic || undefined }) });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? "Не удалось создать задание.");
        router.push(`/task/${body.task.id}`);
        return;
      }
      const configResponse = await fetch("/api/config");
      if (!configResponse.ok || !(await configResponse.json()).mockAi) {
        throw new Error("ИИ пока не подключён. Настрой ключи или включи MOCK_AI=true.");
      }
      const { localMockTask } = await import("@/lib/ai/mock-client");
      const generated = localMockTask(topic || undefined);
      const current = JSON.parse(localStorage.getItem(TASKS_KEY) ?? "[]") as Task[];
      localStorage.setItem(TASKS_KEY, JSON.stringify([generated, ...current]));
      setTasks(previous => [generated, ...previous]);
      router.push(`/task/${generated.id}`);
    } catch (err) { setError(err instanceof Error ? err.message : "Не удалось создать задание."); }
    finally { setBusy(false); }
  }

  const continueTask = tasks.find(task => !attempts.some(attempt => attempt.taskId === task.id)) ?? tasks[0];
  const adviceOfDay = advice[Math.floor(Date.now() / 86_400_000) % advice.length];
  const xp = player?.xp ?? 0;

  return <div className="space-y-8">
    <section className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
      <div><p className="muted font-medium">Рады видеть тебя снова</p><h1 className="mt-1 text-3xl font-black">Привет, {player?.name ?? "друг"}! 👋</h1><p className="muted mt-2">Уровень {player?.level ?? 1} · {xp % 100}/100 XP до следующего уровня</p><div className="mt-3 h-2 w-full max-w-sm overflow-hidden rounded-full bg-[var(--line)]"><div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${xp % 100}%` }} /></div></div>
      <div className="flex gap-3"><span className="card flex items-center gap-2 px-4 py-3 font-bold"><Flame className="text-orange-500" size={18} />{player?.streak ?? 0} дней</span><span className="card flex items-center gap-2 px-4 py-3 font-bold"><Star className="text-amber-500" size={18} />{xp} XP</span></div>
    </section>

    <section className="grid gap-5 lg:grid-cols-[1fr_1.2fr]">
      <div className="card flex flex-col justify-between overflow-hidden p-6">
        <div><span className="inline-flex rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-bold text-[var(--accent)]">ПРОДОЛЖИТЬ</span><h2 className="mt-4 text-xl font-bold">{continueTask?.title ?? "Выбери своё первое задание"}</h2><p className="muted mt-2 line-clamp-2 text-sm">{continueTask?.description ?? "Тебя ждёт первое упражнение по созданию интерфейса."}</p><div className="mt-4 flex gap-2"><span className="rounded-lg bg-[var(--background)] px-2 py-1 text-xs">{continueTask?.topic ?? "Старт"}</span><span className="rounded-lg bg-[var(--background)] px-2 py-1 text-xs">{"●".repeat(continueTask?.difficulty ?? 1)}{"○".repeat(3 - (continueTask?.difficulty ?? 1))}</span></div></div>
        {continueTask && <Link href={`/task/${continueTask.id}`} className="button-primary mt-6 inline-flex w-fit items-center gap-2">Открыть задание <ArrowRight size={16} /></Link>}
      </div>
      <div className="card bg-[var(--accent)] p-6 text-white">
        <span className="inline-flex items-center gap-2 text-sm font-bold text-white/80"><Sparkles size={16} /> НОВЫЙ ВЫЗОВ</span>
        <h2 className="mt-3 text-2xl font-bold">Хочешь новое задание?</h2>
        <p className="mt-2 text-sm text-white/80">ИИ подберёт упражнение специально для тебя.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <label htmlFor="topic" className="sr-only">Тема задания</label>
          <select id="topic" className="min-w-40 flex-1 rounded-xl border border-white/30 bg-white/10 px-3 py-2 text-sm text-white [&>option]:text-black" value={topic} onChange={e => setTopic(e.target.value)}><option value="">Любая тема</option>{topics.map(t => <option key={t}>{t}</option>)}</select>
          <button disabled={busy} className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-[var(--accent)] disabled:opacity-60" onClick={generate}>{busy ? "Создаём…" : "Новое задание от ИИ"}</button>
        </div>
        {error && <p role="alert" className="mt-3 text-sm text-white">{error}</p>}
      </div>
    </section>

    <section><div className="mb-4 flex items-end justify-between"><div><h2 className="text-xl font-bold">Тренируйся по темам</h2><p className="muted mt-1 text-sm">Выбирай направление и прокачивай навык</p></div><Link href="/history" className="text-sm font-bold text-[var(--accent)]">Все попытки</Link></div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{topicStats.map((stat, index) => <Link key={stat.name} href={`/dashboard?topic=${encodeURIComponent(stat.name)}`} onClick={e => { e.preventDefault(); const first = tasks.find(t => t.topic === stat.name); if (first) router.push(`/task/${first.id}`); }} className="card flex items-center justify-between p-4 transition hover:-translate-y-0.5 hover:shadow-md"><div><p className="font-bold">{stat.name}</p><p className="muted mt-1 text-sm">Пройдено {stat.done} из {stat.count}</p><span className="mt-3 inline-block rounded-md bg-[var(--background)] px-2 py-1 text-xs">{"●".repeat(stat.difficulty)}{"○".repeat(3 - stat.difficulty)} Сложность</span></div><span className="grid h-11 w-11 place-items-center rounded-2xl bg-[var(--accent-soft)] text-lg font-bold text-[var(--accent)]">{["✦", "⌘", "◉", "↗", "⌁", "▤"][index]}</span></Link>)}</div>
    </section>

    <section className="grid gap-5 lg:grid-cols-[1.4fr_.8fr]">
      <div className="card p-5"><div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-bold">Последние попытки</h2><BookOpen size={18} className="muted" /></div>
        {attempts.length ? <div className="divide-y" style={{ borderColor: "var(--line)" }}>{attempts.slice(0, 3).map((attempt, i) => <Link key={`${attempt.taskId}-${i}`} href={`/task/${attempt.taskId}`} className="flex items-center justify-between gap-3 py-3"><div><p className="font-semibold">{attempt.taskTitle}</p><p className="muted mt-1 text-xs">{attempt.topic} · {new Date(attempt.createdAt).toLocaleDateString("ru-RU")}</p></div><span className="rounded-xl bg-[var(--accent-soft)] px-3 py-2 font-black text-[var(--accent)]">{attempt.score}</span></Link>)}</div> : <p className="muted py-5 text-sm">Попытки появятся здесь после первого разбора.</p>}
      </div>
      <div className="card bg-amber-50 p-5 dark:bg-amber-950/20"><div className="flex items-center gap-2 text-amber-700 dark:text-amber-300"><Sparkles size={18} /><h2 className="font-bold">Совет дня</h2></div><p className="mt-4 leading-7">{adviceOfDay}</p></div>
    </section>
  </div>;
}

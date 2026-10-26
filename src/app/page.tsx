"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/browser";
import { readPlayer, savePlayer } from "@/components/app-shell";

export default function LandingPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [level, setLevel] = useState("1");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (readPlayer()) { router.replace("/dashboard"); return; }
    const supabase = createClient();
    if (!supabase) return;
    let active = true;
    void supabase.auth.getUser().then(async ({ data: { user }, error: authError }) => {
      if (!active || authError || !user) return;
      const { data, error: profileError } = await supabase.from("profiles")
        .select("display_name,level,xp,streak,last_active").eq("id", user.id).maybeSingle();
      if (!active) return;
      if (profileError) {
        setError("Не удалось проверить профиль. Попробуй начать ещё раз.");
        return;
      }
      if (data) {
        savePlayer({ id: user.id, name: data.display_name, level: data.level, xp: data.xp, streak: data.streak, lastActive: data.last_active });
        router.replace("/dashboard");
      }
    });
    return () => { active = false; };
  }, [router]);

  async function start(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const displayName = name.trim();
    if (displayName.length < 2 || displayName.length > 30) {
      setError("Имя должно содержать от 2 до 30 символов.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const supabase = createClient();
      if (supabase) {
        let { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          const { data, error: authError } = await supabase.auth.signInAnonymously();
          if (authError) throw authError;
          user = data.user;
        }
        if (!user) throw new Error("Не удалось создать профиль. Попробуй ещё раз.");
        const { error: profileError } = await supabase.from("profiles").upsert({
          id: user.id, display_name: displayName, level: Number(level),
        }, { onConflict: "id", ignoreDuplicates: true });
        if (profileError) throw new Error("Не удалось сохранить профиль в Supabase.");
        const { data: savedProfile, error: readError } = await supabase.from("profiles").select("level,xp,streak,last_active,display_name").eq("id", user.id).single();
        if (readError) throw new Error("Не удалось загрузить профиль. Проверь настройки Supabase.");
        savePlayer({ id: user.id, name: savedProfile.display_name, level: savedProfile.level, xp: savedProfile.xp, streak: savedProfile.streak, lastActive: savedProfile.last_active });
      } else {
        savePlayer({ name: displayName, level: Number(level), xp: 0, streak: 0, lastActive: null });
      }
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось начать. Попробуй ещё раз.");
    } finally {
      setBusy(false);
    }
  }

  return <div className="relative overflow-hidden">
    <div className="absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full bg-violet-200/50 blur-3xl dark:bg-violet-950/40" />
    <div className="absolute -right-40 top-28 h-[420px] w-[420px] rounded-full bg-fuchsia-100/60 blur-3xl dark:bg-fuchsia-950/20" />
    <div className="relative mx-auto grid min-h-screen max-w-6xl items-center gap-12 px-5 py-14 lg:grid-cols-[1.1fr_.9fr]">
      <section className="max-w-2xl">
        <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--card)] px-4 py-2 text-sm font-semibold text-[var(--accent)]"><Sparkles size={16} /> Тренажёр промптов для вайбкодинга</div>
        <h1 className="text-4xl font-black leading-[1.08] tracking-tight sm:text-6xl">Научись вайбкодить с <span className="text-[var(--accent)]">ИИ-репетитором</span></h1>
        <p className="muted mt-6 max-w-xl text-lg leading-8">Получай короткие задания, учись объяснять их ИИ и прокачивай навык с персональной обратной связью.</p>
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {["Получаешь задание", "Пишешь промпт", "ИИ разбирает"].map((step, i) => <div key={step} className="card flex items-center gap-3 p-4"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--accent-soft)] text-sm font-bold text-[var(--accent)]">{i + 1}</span><span className="text-sm font-semibold">{step}</span></div>)}
        </div>
      </section>
      <section className="card mx-auto w-full max-w-md p-6 shadow-xl shadow-violet-950/5 sm:p-8">
        <div className="mb-6"><p className="text-sm font-bold text-[var(--accent)]">ТВОЙ ПЕРВЫЙ ШАГ</p><h2 className="mt-2 text-2xl font-bold">Начнём знакомство?</h2><p className="muted mt-2 text-sm">Это займёт меньше минуты</p></div>
        <form onSubmit={start} className="space-y-5">
          <label className="block space-y-2 text-sm font-semibold">Как тебя зовут?
            <input className="field" autoComplete="given-name" maxLength={30} value={name} onChange={e => setName(e.target.value)} placeholder="Например, Саша" required />
          </label>
          <fieldset className="space-y-2"><legend className="text-sm font-semibold">Какой у тебя опыт?</legend>
            <div className="grid gap-2">
              {[["1", "Новичок"], ["2", "Средний"], ["3", "Уже кодил"]].map(([value, label]) => <label key={value} className={`flex cursor-pointer items-center justify-between rounded-xl border p-3 text-sm ${level === value ? "border-[var(--accent)] bg-[var(--accent-soft)]" : "border-[var(--line)]"}`}><span>{label}</span><input type="radio" name="level" value={value} checked={level === value} onChange={e => setLevel(e.target.value)} className="accent-[var(--accent)]" /></label>)}
            </div>
          </fieldset>
          {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}
          <button className="button-primary flex w-full items-center justify-center gap-2" disabled={busy}>{busy ? "Готовим твой кабинет…" : <>Начать <ArrowRight size={17} /></>}</button>
        </form>
        <p className="muted mt-4 text-center text-xs"><Check className="mr-1 inline" size={13} />Прогресс сохраняется на этом устройстве</p>
      </section>
    </div>
  </div>;
}

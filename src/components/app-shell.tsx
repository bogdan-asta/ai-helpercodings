"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BarChart3, BookOpen, ChevronDown, Flame, Home, LogOut, Moon, Pencil, Sun, UserRound } from "lucide-react";
import { createClient } from "@/lib/supabase/browser";

export type Player = { id?: string; name: string; level: number; xp: number; streak: number; lastActive?: string | null };
export const PLAYER_KEY = "promptcoach-player";
export const ATTEMPTS_KEY = "promptcoach-attempts";
export const TASKS_KEY = "promptcoach-tasks";

export function readPlayer(): Player | null {
  try {
    const raw = localStorage.getItem(PLAYER_KEY);
    return raw ? JSON.parse(raw) as Player : null;
  } catch {
    return null;
  }
}

export function savePlayer(player: Player) {
  localStorage.setItem(PLAYER_KEY, JSON.stringify(player));
  window.dispatchEvent(new Event("promptcoach-player"));
}

const navLinks = [
  { href: "/dashboard", label: "Задания", icon: Home },
  { href: "/history", label: "История", icon: BookOpen },
  { href: "/profile", label: "Прогресс", icon: BarChart3 },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [player, setPlayer] = useState<Player | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const isLanding = path === "/";

  useEffect(() => {
    const update = () => setPlayer(readPlayer());
    update();
    window.addEventListener("storage", update);
    window.addEventListener("promptcoach-player", update);
    const savedTheme = localStorage.getItem("promptcoach-theme");
    const useDark = savedTheme ? savedTheme === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
    setDark(useDark);
    document.documentElement.classList.toggle("dark", useDark);
    return () => {
      window.removeEventListener("storage", update);
      window.removeEventListener("promptcoach-player", update);
    };
  }, []);

  async function logout() {
    const supabase = createClient();
    if (supabase) {
      const { error } = await supabase.auth.signOut();
      if (error) {
        window.alert("Не удалось выйти из аккаунта. Попробуй ещё раз.");
        return;
      }
    }
    localStorage.removeItem(PLAYER_KEY);
    localStorage.removeItem(ATTEMPTS_KEY);
    localStorage.removeItem(TASKS_KEY);
    setPlayer(null);
    router.push("/");
  }

  async function renamePlayer() {
    const nextName = window.prompt("Как тебя теперь называть?", player?.name ?? "")?.trim();
    if (!nextName) return;
    if (nextName.length < 2 || nextName.length > 30) {
      window.alert("Имя должно содержать от 2 до 30 символов.");
      return;
    }
    const supabase = createClient();
    if (supabase && player?.id) {
      const { error } = await supabase.from("profiles").update({ display_name: nextName }).eq("id", player.id);
      if (error) {
        window.alert("Не удалось обновить имя. Попробуй ещё раз.");
        return;
      }
    }
    if (player) savePlayer({ ...player, name: nextName });
    setMenuOpen(false);
  }

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("promptcoach-theme", next ? "dark" : "light");
  }

  return (
    <>
      {!isLanding && <header className="sticky top-0 z-40 border-b bg-[var(--card)]/95 backdrop-blur" style={{ borderColor: "var(--line)" }}>
        <div className="mx-auto flex h-[68px] max-w-6xl items-center justify-between px-4">
          <Link href="/dashboard" className="flex items-center gap-2 text-lg font-black tracking-tight">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--accent)] text-white">P</span> PromptCoach
          </Link>
          <nav className="hidden items-center gap-1 md:flex" aria-label="Основная навигация">
            {navLinks.map(({ href, label }) => <Link key={href} href={href} className={`rounded-xl px-4 py-2 text-sm font-semibold ${path.startsWith(href) ? "bg-[var(--accent-soft)] text-[var(--accent)]" : "muted hover:bg-[var(--background)]"}`}>{label}</Link>)}
          </nav>
          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-1 text-sm font-semibold sm:flex"><Flame size={17} className="text-orange-500" />{player?.streak ?? 0}</span>
            <span className="hidden items-center gap-1 text-sm font-semibold sm:flex">⭐ {player?.xp ?? 0} XP</span>
            <div className="relative">
              <button className="button-secondary flex items-center gap-2 !px-3 !py-2" onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen} aria-label="Меню профиля">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-[var(--accent-soft)] text-[var(--accent)]"><UserRound size={16} /></span>
                <span className="hidden max-w-24 truncate sm:inline">{player?.name ?? "Профиль"}</span><ChevronDown size={15} />
              </button>
              {menuOpen && <div className="card absolute right-0 top-12 z-50 w-52 p-2 shadow-lg">
                <Link onClick={() => setMenuOpen(false)} href="/profile" className="block rounded-lg px-3 py-2 text-sm hover:bg-[var(--background)]">Прогресс</Link>
                <button onClick={toggleTheme} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-[var(--background)]">{dark ? <Sun size={16} /> : <Moon size={16} />} {dark ? "Светлая тема" : "Тёмная тема"}</button>
                <button onClick={renamePlayer} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-[var(--background)]"><Pencil size={16} />Сменить имя</button>
                <button onClick={logout} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-rose-600 hover:bg-[var(--background)]"><LogOut size={16} />Выйти</button>
              </div>}
            </div>
          </div>
        </div>
      </header>}
      <main className={isLanding ? "" : "mx-auto min-h-[calc(100vh-68px)] max-w-6xl px-4 pb-24 pt-8 md:pb-12"}>{children}</main>
      {!isLanding && <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-3 border-t bg-[var(--card)] px-3 py-2 md:hidden" style={{ borderColor: "var(--line)" }} aria-label="Мобильная навигация">
        {navLinks.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className={`flex flex-col items-center gap-1 py-1 text-xs ${path.startsWith(href) ? "font-bold text-[var(--accent)]" : "muted"}`}><Icon size={19} />{label}</Link>)}
      </nav>}
    </>
  );
}

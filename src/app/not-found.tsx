import Link from "next/link";

export default function NotFound() {
  return <div className="mx-auto max-w-lg py-24 text-center"><p className="text-6xl font-black text-[var(--accent)]">404</p><h1 className="mt-4 text-2xl font-bold">Такой страницы нет</h1><p className="muted mt-2">Похоже, ссылка устарела или была введена с ошибкой.</p><Link href="/dashboard" className="button-primary mt-6 inline-flex">На главную</Link></div>;
}

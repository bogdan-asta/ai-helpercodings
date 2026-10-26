"use client";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <div className="mx-auto max-w-lg py-24 text-center"><h1 className="text-2xl font-bold">Что-то пошло не так</h1><p className="muted mt-2">Попробуй обновить страницу. Твой прогресс не потеряется.</p><button className="button-primary mt-6" onClick={() => reset()}>Попробовать снова</button></div>;
}

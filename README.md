# PromptCoach

PromptCoach — русскоязычный тренажёр промптов для вайбкодинга. Приложение построено на Next.js App Router, TypeScript, Tailwind CSS и Supabase. ИИ работает через OpenRouter; для локальной проверки интерфейса доступен `MOCK_AI=true`.

## Запуск

1. Установите Node.js 20+ и npm.
2. Скопируйте `.env.example` в `.env.local`. Для локального демо достаточно `MOCK_AI=true`.
3. Для Supabase выполните `supabase/setup.sql`, затем `supabase/seed.sql` в SQL Editor и включите Anonymous Sign-ins.
4. Запустите `npm install`, затем `npm run dev`, откройте [http://localhost:3000](http://localhost:3000).

Без Supabase приложение запускается в демо-режиме с локальным профилем в браузере. Для постоянного хранения и серверной ИИ-оценки настройте Supabase и ключ OpenRouter.

## Проверки

- `npm run lint`
- `npx tsc --noEmit`
- `npm test`
- `npm run build`

## Деплой на Vercel

Импортируйте репозиторий в Vercel и добавьте переменные окружения из `.env.example` в настройках проекта. В Supabase укажите URL продакшн-сайта в Authentication → URL Configuration → Site URL и добавьте адрес в Redirect URLs. Секреты не задавайте с префиксом `NEXT_PUBLIC_`.

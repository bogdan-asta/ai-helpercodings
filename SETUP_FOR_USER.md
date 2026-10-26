# Настройка PromptCoach

## Что потребуется сделать вручную

1. Установить Node.js 20 или новее.
2. Создать проект Supabase. В **Authentication → Sign In / Providers → Anonymous Sign-ins** включить анонимный вход.
3. В Supabase **SQL Editor → New query** выполнить целиком `supabase/setup.sql`, затем выполнить `supabase/seed.sql`.
4. В корне проекта скопировать `.env.example` в `.env.local` и заполнить:
   - `NEXT_PUBLIC_SUPABASE_URL` и `NEXT_PUBLIC_SUPABASE_ANON_KEY` из **Project Settings → API**;
   - `SUPABASE_SERVICE_ROLE_KEY` из **Project Settings → API Keys** (только серверный секрет);
   - для настоящего ИИ `OPENROUTER_API_KEY`, `OPENROUTER_MODEL_REVIEW`, `OPENROUTER_MODEL_TASKS`.
5. Пока ИИ не настроен, поставить `MOCK_AI=true`. С этим режимом OpenRouter-ключ не нужен.
6. В терминале проекта выполнить `npm install`, затем `npm run dev`.
7. После деплоя в Supabase открыть **Authentication → URL Configuration**, указать домен приложения в **Site URL** и добавить его в **Redirect URLs**.

Не отправляйте ключи в чат и не добавляйте `.env.local` в Git.

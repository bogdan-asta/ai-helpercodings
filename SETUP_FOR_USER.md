# Настройка PromptCoach

## Что потребуется сделать вручную

1. Установить Node.js 20 или новее.
2. Создать проект Supabase. В **Authentication → Sign In / Providers → Anonymous Sign-ins** включить анонимный вход.
3. В Supabase **SQL Editor → New query** выполнить целиком `supabase/setup.sql`, затем выполнить `supabase/seed.sql`.
4. В корне проекта открой `.env.local` и вставь значения ключей прямо в этот файл:
   - В Supabase открой **Project Settings → API Keys**: скопируй **Project URL** в `NEXT_PUBLIC_SUPABASE_URL`, **anon / publishable** key в `NEXT_PUBLIC_SUPABASE_ANON_KEY`, а **service_role / secret** key — в `SUPABASE_SERVICE_ROLE_KEY`.
   - В OpenRouter открой **Keys → Create Key**, создай ключ, при необходимости пополни баланс и вставь ключ в `OPENROUTER_API_KEY`.
   - Для `OPENROUTER_MODEL_REVIEW` и `OPENROUTER_MODEL_TASKS` указана проверенная бесплатная модель `recursive/flint-v1.0:free`. В проекте для неё включены JSON-ответы и низкий уровень рассуждений, чтобы модель успевала возвращать разбор в пределах лимита токенов.
5. Вначале оставь `MOCK_AI=true`: проверь анонимный вход и сохранение профиля с ключами Supabase. Когда они работают, поменяй значение на `MOCK_AI=false`, чтобы включить настоящие запросы OpenRouter.
6. После любого изменения `.env.local` останови сервер (`Ctrl+C` в его терминале) и запусти снова командой `npm run dev`.
7. После деплоя в Supabase открой **Authentication → URL Configuration**, укажи домен приложения в **Site URL** и добавь его в **Redirect URLs**.

Никогда не отправляй значения ключей в чат, скриншоты, Git или браузерный код. `SUPABASE_SERVICE_ROLE_KEY` и `OPENROUTER_API_KEY` — только серверные секреты. Не публикуй содержимое `.env.local`; файл уже исключён из Git.

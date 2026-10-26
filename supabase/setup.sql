create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 30),
  level int not null default 1,
  xp int not null default 0,
  streak int not null default 0,
  last_active date,
  created_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  title text not null,
  description text not null,
  expected_result text,
  difficulty int not null check (difficulty between 1 and 3),
  topic text not null,
  hints jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  prompt_text text not null,
  score int check (score between 0 and 100),
  review jsonb,
  model text,
  xp_earned int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.usage_log (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('generate_task', 'review')),
  created_at timestamptz not null default now()
);

create index if not exists attempts_user_created_idx on public.attempts (user_id, created_at desc);
create index if not exists attempts_user_task_idx on public.attempts (user_id, task_id);
create index if not exists usage_user_kind_created_idx on public.usage_log (user_id, kind, created_at);
create index if not exists tasks_user_idx on public.tasks (user_id);

alter table public.profiles enable row level security;
alter table public.tasks enable row level security;
alter table public.attempts enable row level security;
alter table public.usage_log enable row level security;

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated using (id = auth.uid());
drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles for insert to authenticated with check (id = auth.uid());
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
drop policy if exists tasks_select on public.tasks;
create policy tasks_select on public.tasks for select to authenticated using (user_id is null or user_id = auth.uid());
drop policy if exists attempts_select on public.attempts;
create policy attempts_select on public.attempts for select to authenticated using (user_id = auth.uid());
drop policy if exists usage_select on public.usage_log;
create policy usage_select on public.usage_log for select to authenticated using (user_id = auth.uid());

revoke insert, update, delete on public.profiles from authenticated, anon;
grant insert (id, display_name, level) on public.profiles to authenticated;
grant update (display_name) on public.profiles to authenticated;
revoke insert, update, delete on public.tasks, public.attempts, public.usage_log from authenticated, anon;
grant select on public.profiles, public.tasks, public.attempts, public.usage_log to authenticated;
grant all on public.profiles, public.tasks, public.attempts, public.usage_log to service_role;
grant usage, select on sequence public.usage_log_id_seq to service_role;

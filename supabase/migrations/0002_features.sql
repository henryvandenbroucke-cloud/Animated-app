-- Sippy v2: characters, reminders, cup sizes, caffeine/calories, editable history and challenges.
-- Applied to the `sippy` Supabase project as migration "features_v2".

alter table public.profiles
  add column character text not null default 'leucistic',
  add column sex text check (sex in ('female','male','pregnant','breastfeeding','other')),
  add column wake_time text not null default '08:00',
  add column sleep_time text not null default '22:00',
  add column reminder_every_min integer not null default 90 check (reminder_every_min between 30 and 240),
  add column reminder_sound text not null default 'bubble',
  add column cup_ml integer not null default 250 check (cup_ml between 50 and 2000),
  add column favorite_drinks text[] not null default '{water,tea,coffee,juice,sparkling}';

alter table public.drink_logs
  add column caffeine_mg integer not null default 0 check (caffeine_mg between 0 and 2000),
  add column kcal integer not null default 0 check (kcal between 0 and 5000);

-- Editing past entries (amount, time) is allowed on your own rows.
create policy "own logs update" on public.drink_logs for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create table public.user_challenges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  challenge_id text not null,
  status text not null default 'active' check (status in ('active','completed','quit')),
  started_at timestamptz not null default now(),
  ended_at timestamptz
);
create index user_challenges_user_idx on public.user_challenges (user_id, started_at desc);
-- Only one attempt at a time per challenge.
create unique index user_challenges_one_active on public.user_challenges (user_id, challenge_id) where status = 'active';

alter table public.user_challenges enable row level security;
create policy "own challenges select" on public.user_challenges for select to authenticated using ((select auth.uid()) = user_id);
create policy "own challenges insert" on public.user_challenges for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "own challenges update" on public.user_challenges for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own challenges delete" on public.user_challenges for delete to authenticated using ((select auth.uid()) = user_id);

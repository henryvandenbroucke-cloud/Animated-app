-- Sippy schema: one profile per user plus a log of drinks.
-- Applied to the `sippy` Supabase project as migration "init".

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  unit text not null default 'ml' check (unit in ('ml','oz')),
  daily_goal_ml integer not null default 2000 check (daily_goal_ml between 500 and 8000),
  weight_kg numeric,
  activity text,
  climate text,
  feelings text[] not null default '{}',
  onboarded_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.drink_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  drink text not null,
  volume_ml integer not null check (volume_ml > 0 and volume_ml <= 5000),
  water_ml integer not null check (water_ml >= 0 and water_ml <= 5000),
  logged_at timestamptz not null default now()
);
create index drink_logs_user_logged_idx on public.drink_logs (user_id, logged_at desc);

-- Row level security: people only ever see and change their own rows.
alter table public.profiles enable row level security;
alter table public.drink_logs enable row level security;

create policy "own profile select" on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy "own profile update" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy "own profile insert" on public.profiles for insert to authenticated with check ((select auth.uid()) = id);

create policy "own logs select" on public.drink_logs for select to authenticated using ((select auth.uid()) = user_id);
create policy "own logs insert" on public.drink_logs for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "own logs delete" on public.drink_logs for delete to authenticated using ((select auth.uid()) = user_id);

-- Every new account gets a profile row straight away.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, name)
  values (new.id, new.raw_user_meta_data ->> 'name');
  return new;
end;
$$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

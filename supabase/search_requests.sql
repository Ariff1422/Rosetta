create table if not exists public.search_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  query text not null,
  sections jsonb,
  status text not null default 'running',
  result_count integer not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists search_requests_user_id_created_at_idx
  on public.search_requests (user_id, created_at desc);

alter table public.search_requests enable row level security;

create policy "Users can read their own search requests"
  on public.search_requests
  for select
  using (auth.uid() = user_id);

create policy "Users can insert their own search requests"
  on public.search_requests
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own search requests"
  on public.search_requests
  for update
  using (auth.uid() = user_id);

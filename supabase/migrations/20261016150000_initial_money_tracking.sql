create type public.transaction_kind as enum ('income', 'expense');
create type public.budget_period as enum ('daily', 'monthly', 'yearly');
create type public.receipt_status as enum ('uploaded', 'processing', 'review', 'saved', 'failed');
create type public.ai_message_role as enum ('user', 'assistant');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url text,
  preferred_currency char(3) not null default 'IDR',
  timezone text not null default 'Asia/Jakarta',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 60),
  kind public.transaction_kind not null,
  icon text not null default 'wallet',
  color text not null default '#2DB780',
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  constraint categories_default_ownership check (is_default = (user_id is null))
);
create unique index categories_default_name_kind_idx
  on public.categories (lower(name), kind) where user_id is null;
create unique index categories_owner_name_kind_idx
  on public.categories (user_id, lower(name), kind) where user_id is not null;

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind public.transaction_kind not null,
  amount numeric(14, 2) not null check (amount > 0),
  category_id uuid references public.categories (id) on delete set null,
  category text not null default 'Lainnya' check (length(trim(category)) between 1 and 60),
  title text not null check (length(trim(title)) between 1 and 160),
  merchant text,
  note text,
  occurred_at timestamptz not null default now(),
  receipt_path text,
  source text not null default 'manual' check (source in ('manual', 'receipt', 'import')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index transactions_user_occurred_idx on public.transactions (user_id, occurred_at desc);
create index transactions_user_kind_occurred_idx on public.transactions (user_id, kind, occurred_at desc);
create index transactions_category_idx on public.transactions (category_id) where category_id is not null;

create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  period public.budget_period not null,
  limit_amount numeric(14, 2) not null check (limit_amount > 0),
  starts_on date not null default current_date,
  ends_on date,
  alert_threshold_percent smallint not null default 80 check (alert_threshold_percent between 1 and 100),
  notifications_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_on is null or ends_on >= starts_on),
  unique (user_id, period, starts_on)
);
create index budgets_user_period_idx on public.budgets (user_id, period, starts_on desc);

create table public.receipt_scans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  bucket_path text not null,
  status public.receipt_status not null default 'uploaded',
  extracted_data jsonb not null default '{}'::jsonb,
  model_name text not null default 'gemini-3.6-flash',
  transaction_id uuid references public.transactions (id) on delete set null,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, bucket_path)
);
create index receipt_scans_user_created_idx on public.receipt_scans (user_id, created_at desc);

create table public.ai_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default 'Percakapan baru' check (length(title) <= 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index ai_threads_user_updated_idx on public.ai_threads (user_id, updated_at desc);

create table public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.ai_threads (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.ai_message_role not null,
  content text not null check (length(content) between 1 and 12000),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index ai_messages_thread_created_idx on public.ai_messages (thread_id, created_at);
create index ai_messages_user_created_idx on public.ai_messages (user_id, created_at desc);

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth_secret text not null,
  user_agent text,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, endpoint)
);
create index push_subscriptions_user_enabled_idx on public.push_subscriptions (user_id, enabled);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  budget_id uuid references public.budgets (id) on delete set null,
  kind text not null check (kind in ('budget_threshold', 'budget_exceeded', 'system')),
  title text not null check (length(title) <= 120),
  body text not null check (length(body) <= 500),
  dedupe_key text not null,
  triggered_at timestamptz not null default now(),
  read_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, dedupe_key)
);
create index notifications_user_unread_idx on public.notifications (user_id, created_at desc) where read_at is null;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.validate_transaction_category_owner()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.category_id is not null and not exists (
    select 1
    from public.categories c
    where c.id = new.category_id
      and (c.user_id is null or c.user_id = new.user_id)
  ) then
    raise exception 'category is not available to this user' using errcode = '23503';
  end if;
  return new;
end;
$$;

create trigger transactions_category_owner
before insert or update of category_id, user_id on public.transactions
for each row execute function public.validate_transaction_category_owner();

create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
create trigger transactions_set_updated_at before update on public.transactions
for each row execute function public.set_updated_at();
create trigger budgets_set_updated_at before update on public.budgets
for each row execute function public.set_updated_at();
create trigger receipt_scans_set_updated_at before update on public.receipt_scans
for each row execute function public.set_updated_at();
create trigger ai_threads_set_updated_at before update on public.ai_threads
for each row execute function public.set_updated_at();
create trigger push_subscriptions_set_updated_at before update on public.push_subscriptions
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

insert into public.profiles (id, display_name, avatar_url)
select
  id,
  coalesce(raw_user_meta_data ->> 'full_name', raw_user_meta_data ->> 'name'),
  raw_user_meta_data ->> 'avatar_url'
from auth.users
on conflict (id) do nothing;

insert into public.categories (user_id, name, kind, icon, color, is_default)
values
  (null, 'Makanan', 'expense', 'utensils', '#E69F52', true),
  (null, 'Transportasi', 'expense', 'car-front', '#6B9CD4', true),
  (null, 'Belanja', 'expense', 'shopping-bag', '#A583D9', true),
  (null, 'Tagihan', 'expense', 'receipt', '#738B86', true),
  (null, 'Kesehatan', 'expense', 'heart-pulse', '#DB7C83', true),
  (null, 'Hiburan', 'expense', 'clapperboard', '#DF9C67', true),
  (null, 'Lainnya', 'expense', 'wallet', '#86A898', true),
  (null, 'Gaji', 'income', 'briefcase-business', '#2DB780', true),
  (null, 'Freelance', 'income', 'laptop', '#6B9CD4', true),
  (null, 'Investasi', 'income', 'chart-no-axes-combined', '#A583D9', true),
  (null, 'Lainnya', 'income', 'wallet', '#86A898', true)
on conflict do nothing;

-- Explicit grants accompany RLS; the public browser role never receives access to private rows.
grant usage on schema public to authenticated;
revoke all on public.profiles, public.categories, public.transactions, public.budgets,
  public.receipt_scans, public.ai_threads, public.ai_messages,
  public.push_subscriptions, public.notifications from anon, authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.categories to authenticated;
grant select, insert, update, delete on public.transactions to authenticated;
grant select, insert, update, delete on public.budgets to authenticated;
grant select, insert, update, delete on public.receipt_scans to authenticated;
grant select, insert, update, delete on public.ai_threads to authenticated;
grant select, insert, update, delete on public.ai_messages to authenticated;
grant select, insert, update, delete on public.push_subscriptions to authenticated;
grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'profiles', 'categories', 'transactions', 'budgets', 'receipt_scans',
    'ai_threads', 'ai_messages', 'push_subscriptions', 'notifications'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
  end loop;
end;
$$;

create policy "Profiles: select own" on public.profiles
for select to authenticated using ((select auth.uid()) = id);
create policy "Profiles: update own" on public.profiles
for update to authenticated using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy "Categories: read defaults and own" on public.categories
for select to authenticated using (is_default or (select auth.uid()) = user_id);
create policy "Categories: insert own" on public.categories
for insert to authenticated with check ((select auth.uid()) = user_id and not is_default);
create policy "Categories: update own" on public.categories
for update to authenticated using ((select auth.uid()) = user_id and not is_default)
with check ((select auth.uid()) = user_id and not is_default);
create policy "Categories: delete own" on public.categories
for delete to authenticated using ((select auth.uid()) = user_id and not is_default);

create policy "Transactions: select own" on public.transactions
for select to authenticated using ((select auth.uid()) = user_id);
create policy "Transactions: insert own" on public.transactions
for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Transactions: update own" on public.transactions
for update to authenticated using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
create policy "Transactions: delete own" on public.transactions
for delete to authenticated using ((select auth.uid()) = user_id);

create policy "Budgets: select own" on public.budgets
for select to authenticated using ((select auth.uid()) = user_id);
create policy "Budgets: insert own" on public.budgets
for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Budgets: update own" on public.budgets
for update to authenticated using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
create policy "Budgets: delete own" on public.budgets
for delete to authenticated using ((select auth.uid()) = user_id);

create policy "Receipt scans: select own" on public.receipt_scans
for select to authenticated using ((select auth.uid()) = user_id);
create policy "Receipt scans: insert own" on public.receipt_scans
for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Receipt scans: update own" on public.receipt_scans
for update to authenticated using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
create policy "Receipt scans: delete own" on public.receipt_scans
for delete to authenticated using ((select auth.uid()) = user_id);

create policy "AI threads: select own" on public.ai_threads
for select to authenticated using ((select auth.uid()) = user_id);
create policy "AI threads: insert own" on public.ai_threads
for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "AI threads: update own" on public.ai_threads
for update to authenticated using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
create policy "AI threads: delete own" on public.ai_threads
for delete to authenticated using ((select auth.uid()) = user_id);

create policy "AI messages: select own" on public.ai_messages
for select to authenticated using (
  (select auth.uid()) = user_id and exists (
    select 1 from public.ai_threads t
    where t.id = thread_id and t.user_id = (select auth.uid())
  )
);
create policy "AI messages: insert own" on public.ai_messages
for insert to authenticated with check (
  (select auth.uid()) = user_id and exists (
    select 1 from public.ai_threads t
    where t.id = thread_id and t.user_id = (select auth.uid())
  )
);
create policy "AI messages: update own" on public.ai_messages
for update to authenticated using (
  (select auth.uid()) = user_id and exists (
    select 1 from public.ai_threads t
    where t.id = thread_id and t.user_id = (select auth.uid())
  )
) with check (
  (select auth.uid()) = user_id and exists (
    select 1 from public.ai_threads t
    where t.id = thread_id and t.user_id = (select auth.uid())
  )
);
create policy "AI messages: delete own" on public.ai_messages
for delete to authenticated using (
  (select auth.uid()) = user_id and exists (
    select 1 from public.ai_threads t
    where t.id = thread_id and t.user_id = (select auth.uid())
  )
);

create policy "Push subscriptions: select own" on public.push_subscriptions
for select to authenticated using ((select auth.uid()) = user_id);
create policy "Push subscriptions: insert own" on public.push_subscriptions
for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Push subscriptions: update own" on public.push_subscriptions
for update to authenticated using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
create policy "Push subscriptions: delete own" on public.push_subscriptions
for delete to authenticated using ((select auth.uid()) = user_id);

create policy "Notifications: select own" on public.notifications
for select to authenticated using ((select auth.uid()) = user_id);
create policy "Notifications: mark own read" on public.notifications
for update to authenticated using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

-- Keep receipt files private; object names must start with the authenticated user UUID.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('receipts', 'receipts', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Receipt files: read own" on storage.objects
for select to authenticated using (
  bucket_id = 'receipts' and (storage.foldername(name))[1] = (select auth.uid())::text
);
create policy "Receipt files: upload own" on storage.objects
for insert to authenticated with check (
  bucket_id = 'receipts' and (storage.foldername(name))[1] = (select auth.uid())::text
);
create policy "Receipt files: update own" on storage.objects
for update to authenticated using (
  bucket_id = 'receipts' and (storage.foldername(name))[1] = (select auth.uid())::text
) with check (
  bucket_id = 'receipts' and (storage.foldername(name))[1] = (select auth.uid())::text
);
create policy "Receipt files: delete own" on storage.objects
for delete to authenticated using (
  bucket_id = 'receipts' and (storage.foldername(name))[1] = (select auth.uid())::text
);

begin;
select plan(3);

select ok(
  (
    select bool_and(c.relrowsecurity)
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = any (array[
        'profiles', 'categories', 'transactions', 'budgets', 'receipt_scans',
        'ai_threads', 'ai_messages', 'push_subscriptions', 'notifications'
      ])
  ),
  'RLS is enabled on every DanaKu table'
);

select is(
  (
    select count(*)::integer
    from pg_policies
    where schemaname = 'public'
      and tablename = any (array[
        'profiles', 'categories', 'transactions', 'budgets', 'receipt_scans',
        'ai_threads', 'ai_messages', 'push_subscriptions', 'notifications'
      ])
  ),
  32,
  'Expected per-operation policies exist for DanaKu tables'
);

select ok(
  exists (select 1 from storage.buckets where id = 'receipts' and public = false),
  'Receipt files are stored in a private bucket'
);

select * from finish();
rollback;

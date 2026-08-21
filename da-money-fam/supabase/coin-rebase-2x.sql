-- 2× Coinz denomination rebase (run once on DMF SITE Supabase)
-- Same USD economics; doubles balances and expected debit unit
-- Live column is `amount` (not coinz)

update public.user_coins
set amount = amount * 2
where amount is not null;

-- site_settings: bump video pricing + pack amounts if rows exist
update public.site_settings
set value = jsonb_set(
  jsonb_set(value, '{liteBaseCoins}', '20'),
  '{fastBaseCoins}',
  '40'
)
where key = 'ad_studio.pricing';

update public.site_settings
set value = jsonb_build_object(
  'starter', jsonb_build_object('amount', 100, 'price', 8, 'label', 'Starter'),
  'creator', jsonb_build_object('amount', 300, 'price', 20, 'label', 'Creator'),
  'studio', jsonb_build_object('amount', 800, 'price', 50, 'label', 'Studio')
)
where key = 'ad_studio.packs';

-- Image Studio tier floors (Draft/Fast/Edit/Smart)
insert into public.site_settings (key, value, updated_at)
values (
  'ad_studio.image_models',
  jsonb_build_object(
    'draft', jsonb_build_object('baseCoins', 4),
    'fast', jsonb_build_object('baseCoins', 4),
    'edit', jsonb_build_object('baseCoins', 6),
    'smart', jsonb_build_object('baseCoins', 10)
  ),
  now()
)
on conflict (key) do update
set value = excluded.value,
    updated_at = now();

alter table public.merch_orders add column if not exists admin_notes text;
alter table public.service_orders add column if not exists admin_notes text;

-- Add invoice lifecycle fields to buchungen
alter table if exists public.buchungen
  add column if not exists is_invoice boolean default false,
  add column if not exists invoice_id text,
  add column if not exists invoice_status text default 'open',
  add column if not exists paid_at timestamptz null,
  add column if not exists last_seen_at timestamptz null;

create index if not exists idx_buchungen_invoice_id on public.buchungen (invoice_id);
create index if not exists idx_buchungen_invoice_status on public.buchungen (invoice_status);



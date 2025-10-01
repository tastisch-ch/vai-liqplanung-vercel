-- Yearly revenue targets (Ertragsziel)
create table if not exists public.revenue_targets (
  id uuid primary key default uuid_generate_v4(),
  year int not null,
  target_amount numeric(14,2) not null,
  updated_by uuid,
  updated_by_email text,
  updated_at timestamptz not null default now(),
  unique(year)
);

alter table public.revenue_targets enable row level security;
create policy "revenue_targets_select" on public.revenue_targets for select using (auth.role() = 'authenticated');
create policy "revenue_targets_upsert" on public.revenue_targets for insert with check (auth.role() = 'authenticated');
create policy "revenue_targets_update" on public.revenue_targets for update using (auth.role() = 'authenticated');

create index if not exists idx_revenue_targets_year on public.revenue_targets(year);


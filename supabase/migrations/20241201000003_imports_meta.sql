-- Imports meta table to track last imports (global)
create table if not exists public.imports (
  id uuid primary key default uuid_generate_v4(),
  kind text not null, -- 'html' | 'excel'
  imported_at timestamptz not null default now(),
  user_id uuid,
  user_email text,
  details jsonb,
  created_at timestamptz not null default now()
);

-- Basic RLS: authenticated users can insert and select
alter table public.imports enable row level security;
create policy "imports_select" on public.imports for select using (auth.role() = 'authenticated');
create policy "imports_insert" on public.imports for insert with check (auth.role() = 'authenticated');

-- helpful index to get latest import quickly
create index if not exists idx_imports_kind_imported_at on public.imports(kind, imported_at desc);


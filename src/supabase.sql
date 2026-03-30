create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.sites (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.daily_reports (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id),
  report_date date not null,
  worker_count integer not null check (worker_count > 0),
  tomorrow_plan text,
  note text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.work_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.waste_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.safety_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.machines (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.partner_companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.daily_report_work_items (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.daily_reports(id) on delete cascade,
  work_item_id uuid not null references public.work_items(id),
  created_at timestamptz not null default now(),
  unique (report_id, work_item_id)
);

create table if not exists public.daily_report_waste_items (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.daily_reports(id) on delete cascade,
  waste_item_id uuid not null references public.waste_items(id),
  created_at timestamptz not null default now(),
  unique (report_id, waste_item_id)
);

create table if not exists public.daily_report_safety_items (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.daily_reports(id) on delete cascade,
  safety_item_id uuid not null references public.safety_items(id),
  created_at timestamptz not null default now(),
  unique (report_id, safety_item_id)
);

create table if not exists public.daily_report_workers (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.daily_reports(id) on delete cascade,
  worker_id uuid not null references public.workers(id),
  created_at timestamptz not null default now(),
  unique (report_id, worker_id)
);

create table if not exists public.daily_report_machines (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.daily_reports(id) on delete cascade,
  machine_id uuid not null references public.machines(id),
  created_at timestamptz not null default now(),
  unique (report_id, machine_id)
);

create table if not exists public.daily_report_vehicles (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.daily_reports(id) on delete cascade,
  vehicle_id uuid not null references public.vehicles(id),
  created_at timestamptz not null default now(),
  unique (report_id, vehicle_id)
);

create table if not exists public.daily_report_partner_companies (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.daily_reports(id) on delete cascade,
  partner_company_id uuid not null references public.partner_companies(id),
  created_at timestamptz not null default now(),
  unique (report_id, partner_company_id)
);

create table if not exists public.report_photos (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.daily_reports(id) on delete cascade,
  image_path text not null,
  caption text,
  created_at timestamptz not null default now()
);

create index if not exists idx_daily_reports_site_id on public.daily_reports(site_id);
create index if not exists idx_daily_reports_report_date on public.daily_reports(report_date desc);
create index if not exists idx_report_photos_report_id on public.report_photos(report_id);

drop trigger if exists set_sites_updated_at on public.sites;
create trigger set_sites_updated_at
before update on public.sites
for each row execute function public.set_updated_at();

drop trigger if exists set_daily_reports_updated_at on public.daily_reports;
create trigger set_daily_reports_updated_at
before update on public.daily_reports
for each row execute function public.set_updated_at();

drop trigger if exists set_work_items_updated_at on public.work_items;
create trigger set_work_items_updated_at
before update on public.work_items
for each row execute function public.set_updated_at();

drop trigger if exists set_waste_items_updated_at on public.waste_items;
create trigger set_waste_items_updated_at
before update on public.waste_items
for each row execute function public.set_updated_at();

drop trigger if exists set_safety_items_updated_at on public.safety_items;
create trigger set_safety_items_updated_at
before update on public.safety_items
for each row execute function public.set_updated_at();

drop trigger if exists set_workers_updated_at on public.workers;
create trigger set_workers_updated_at
before update on public.workers
for each row execute function public.set_updated_at();

drop trigger if exists set_machines_updated_at on public.machines;
create trigger set_machines_updated_at
before update on public.machines
for each row execute function public.set_updated_at();

drop trigger if exists set_vehicles_updated_at on public.vehicles;
create trigger set_vehicles_updated_at
before update on public.vehicles
for each row execute function public.set_updated_at();

drop trigger if exists set_partner_companies_updated_at on public.partner_companies;
create trigger set_partner_companies_updated_at
before update on public.partner_companies
for each row execute function public.set_updated_at();

alter table public.sites enable row level security;
alter table public.daily_reports enable row level security;
alter table public.work_items enable row level security;
alter table public.waste_items enable row level security;
alter table public.safety_items enable row level security;
alter table public.workers enable row level security;
alter table public.machines enable row level security;
alter table public.vehicles enable row level security;
alter table public.partner_companies enable row level security;
alter table public.daily_report_work_items enable row level security;
alter table public.daily_report_waste_items enable row level security;
alter table public.daily_report_safety_items enable row level security;
alter table public.daily_report_workers enable row level security;
alter table public.daily_report_machines enable row level security;
alter table public.daily_report_vehicles enable row level security;
alter table public.daily_report_partner_companies enable row level security;
alter table public.report_photos enable row level security;

drop policy if exists "authenticated users can manage sites" on public.sites;
create policy "authenticated users can manage sites"
on public.sites
for all
to authenticated
using (true)
with check (true);

drop policy if exists "authenticated users can manage daily_reports" on public.daily_reports;
create policy "authenticated users can manage daily_reports"
on public.daily_reports
for all
to authenticated
using (true)
with check (true);

drop policy if exists "authenticated users can manage work_items" on public.work_items;
create policy "authenticated users can manage work_items"
on public.work_items
for all
to authenticated
using (true)
with check (true);

drop policy if exists "authenticated users can manage waste_items" on public.waste_items;
create policy "authenticated users can manage waste_items"
on public.waste_items
for all
to authenticated
using (true)
with check (true);

drop policy if exists "authenticated users can manage safety_items" on public.safety_items;
create policy "authenticated users can manage safety_items"
on public.safety_items
for all
to authenticated
using (true)
with check (true);

drop policy if exists "authenticated users can manage workers" on public.workers;
create policy "authenticated users can manage workers"
on public.workers
for all
to authenticated
using (true)
with check (true);

drop policy if exists "authenticated users can manage machines" on public.machines;
create policy "authenticated users can manage machines"
on public.machines
for all
to authenticated
using (true)
with check (true);

drop policy if exists "authenticated users can manage vehicles" on public.vehicles;
create policy "authenticated users can manage vehicles"
on public.vehicles
for all
to authenticated
using (true)
with check (true);

drop policy if exists "authenticated users can manage partner_companies" on public.partner_companies;
create policy "authenticated users can manage partner_companies"
on public.partner_companies
for all
to authenticated
using (true)
with check (true);

drop policy if exists "authenticated users can manage daily_report_workers" on public.daily_report_workers;
create policy "authenticated users can manage daily_report_workers"
on public.daily_report_workers
for all
to authenticated
using (true)
with check (true);

drop policy if exists "authenticated users can manage daily_report_machines" on public.daily_report_machines;
create policy "authenticated users can manage daily_report_machines"
on public.daily_report_machines
for all
to authenticated
using (true)
with check (true);

drop policy if exists "authenticated users can manage daily_report_vehicles" on public.daily_report_vehicles;
create policy "authenticated users can manage daily_report_vehicles"
on public.daily_report_vehicles
for all
to authenticated
using (true)
with check (true);

drop policy if exists "authenticated users can manage daily_report_partner_companies" on public.daily_report_partner_companies;
create policy "authenticated users can manage daily_report_partner_companies"
on public.daily_report_partner_companies
for all
to authenticated
using (true)
with check (true);

drop policy if exists "authenticated users can manage daily_report_work_items" on public.daily_report_work_items;
create policy "authenticated users can manage daily_report_work_items"
on public.daily_report_work_items
for all
to authenticated
using (true)
with check (true);

drop policy if exists "authenticated users can manage daily_report_waste_items" on public.daily_report_waste_items;
create policy "authenticated users can manage daily_report_waste_items"
on public.daily_report_waste_items
for all
to authenticated
using (true)
with check (true);

drop policy if exists "authenticated users can manage daily_report_safety_items" on public.daily_report_safety_items;
create policy "authenticated users can manage daily_report_safety_items"
on public.daily_report_safety_items
for all
to authenticated
using (true)
with check (true);

drop policy if exists "authenticated users can manage report_photos" on public.report_photos;
create policy "authenticated users can manage report_photos"
on public.report_photos
for all
to authenticated
using (true)
with check (true);

comment on table public.sites is 'MVPでは単一会社向け。将来は company_id を追加し、RLS を company_id ベースに切り替える。';
comment on table public.daily_reports is 'MVPでは単一会社向け。将来は company_id を追加し、created_by と合わせてテナント分離する。';
comment on table public.workers is '固定マスタ種別として追加。将来 company_id や worker_code などを付与しやすい形。';
comment on table public.machines is '固定マスタ種別として追加。将来機種、号機、保有区分などを付与しやすい形。';
comment on table public.vehicles is '固定マスタ種別として追加。将来ナンバー、車種、積載量などを付与しやすい形。';
comment on table public.partner_companies is '固定マスタ種別として追加。将来担当者情報や請負区分を付与しやすい形。';
comment on column public.report_photos.image_path is '外部ストレージまたは自社サーバーに保存した画像URLを格納する。';

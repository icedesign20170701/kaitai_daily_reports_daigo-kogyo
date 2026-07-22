create extension if not exists "pgcrypto";

create table if not exists public.app_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  is_master boolean not null default false,
  is_subcontractor boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.app_users
add column if not exists sort_order integer not null default 0;

alter table public.app_users
add column if not exists is_subcontractor boolean not null default false;

create table if not exists public.sites (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  site_area text not null default 'kansai' check (site_area in ('kansai', 'kanto')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.sites
add column if not exists site_area text not null default 'kansai' check (site_area in ('kansai', 'kanto'));

create table if not exists public.daily_reports (
  id uuid primary key default gen_random_uuid(),
  site_id uuid references public.sites(id),
  site_name text,
  report_date date not null,
  reporter_name text,
  worker_count integer not null check (worker_count > 0),
  work_shift text not null check (work_shift in ('day', 'night')),
  contract_type text not null check (contract_type in ('contract', 'regular')),
  miscellaneous_costs text,
  other_vehicle_entries jsonb not null default '[]'::jsonb,
  work_description text,
  other_workers_note text,
  remarks text,
  progress_status text not null check (progress_status in ('continuing', 'completed')),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.work_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.work_categories
  add column if not exists is_deleted boolean not null default false;

alter table public.daily_reports
  add column if not exists work_category_id uuid references public.work_categories(id);

alter table public.daily_reports
  add column if not exists work_description text;

alter table public.daily_reports
  add column if not exists reporter_name text;

alter table public.daily_reports
  add column if not exists site_name text;

create table if not exists public.workers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  group_label text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.workers
  add column if not exists is_deleted boolean not null default false;

create table if not exists public.worker_labels (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  unit_price integer not null default 0,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.worker_labels
  add column if not exists is_deleted boolean not null default false;

create table if not exists public.lease_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.lease_items
  add column if not exists is_deleted boolean not null default false;

create table if not exists public.disposal_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.disposal_items
  add column if not exists is_deleted boolean not null default false;

create table if not exists public.disposal_units (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.disposal_units
  add column if not exists is_deleted boolean not null default false;

delete from public.disposal_units
where name in ('CT', 'PG');

delete from public.disposal_units
where id in (
  select id
  from (
    select
      id,
      row_number() over (partition by name order by sort_order, created_at, id) as row_number
    from public.disposal_units
  ) as duplicated_units
  where duplicated_units.row_number > 1
);

insert into public.disposal_units (name, sort_order)
select unit_name, sort_order
from (
  values
    ('TC', 0),
    ('TL', 1),
    ('TP', 2)
) as defaults(unit_name, sort_order)
where not exists (
  select 1
  from public.disposal_units
  where disposal_units.name = defaults.unit_name
    and disposal_units.is_deleted = false
);

create unique index if not exists idx_disposal_units_name_not_deleted
on public.disposal_units (name)
where is_deleted = false;

create table if not exists public.transport_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.transport_items
  add column if not exists is_deleted boolean not null default false;

create table if not exists public.daily_report_workers (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.daily_reports(id) on delete cascade,
  worker_id uuid not null references public.workers(id),
  label_snapshot text,
  unit_price_snapshot integer not null default 0,
  created_at timestamptz not null default now(),
  unique (report_id, worker_id)
);

create table if not exists public.daily_report_external_workers (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.daily_reports(id) on delete cascade,
  worker_label_id uuid not null references public.worker_labels(id),
  label_snapshot text not null,
  count integer not null default 0 check (count >= 0),
  unit_price_snapshot integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.daily_report_workers
  add column if not exists label_snapshot text;

alter table public.daily_report_workers
  add column if not exists unit_price_snapshot integer not null default 0;

create table if not exists public.daily_report_lease_items (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.daily_reports(id) on delete cascade,
  lease_item_id uuid references public.lease_items(id),
  item_name text,
  count integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.daily_report_lease_items
  alter column lease_item_id drop not null;

alter table public.daily_report_lease_items
  add column if not exists item_name text;

create table if not exists public.daily_report_disposal_items (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.daily_reports(id) on delete cascade,
  disposal_item_id uuid not null references public.disposal_items(id),
  waste_type text not null default 'wood',
  other_label text,
  ton_count integer not null default 0,
  ton_unit text not null default 'TC',
  truck_count integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.daily_report_disposal_items
  add column if not exists waste_type text not null default 'wood';

alter table public.daily_report_disposal_items
  add column if not exists other_label text;

alter table public.daily_report_disposal_items
  add column if not exists ton_unit text not null default 'TC';

alter table public.daily_report_disposal_items
  alter column ton_unit set default 'TC';

create table if not exists public.daily_report_transport_items (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.daily_reports(id) on delete cascade,
  transport_item_id uuid not null references public.transport_items(id),
  count integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.report_photos (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.daily_reports(id) on delete cascade,
  image_path text not null,
  caption text,
  created_at timestamptz not null default now()
);

create table if not exists public.report_edit_logs (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.daily_reports(id) on delete cascade,
  edited_by uuid not null references auth.users(id),
  edited_at timestamptz not null default now()
);

create index if not exists idx_daily_reports_site_id on public.daily_reports(site_id);
create index if not exists idx_daily_reports_work_category_id on public.daily_reports(work_category_id);
create index if not exists idx_daily_reports_report_date on public.daily_reports(report_date desc);
create index if not exists idx_daily_report_workers_report_id on public.daily_report_workers(report_id);
create index if not exists idx_daily_report_external_workers_report_id on public.daily_report_external_workers(report_id);
create index if not exists idx_daily_report_lease_items_report_id on public.daily_report_lease_items(report_id);
create index if not exists idx_daily_report_disposal_items_report_id on public.daily_report_disposal_items(report_id);
create index if not exists idx_daily_report_transport_items_report_id on public.daily_report_transport_items(report_id);
create index if not exists idx_report_photos_report_id on public.report_photos(report_id);
create index if not exists idx_report_edit_logs_report_id on public.report_edit_logs(report_id, edited_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.is_master_user(target_user uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.app_users
    where user_id = target_user
      and is_master = true
  );
$$;

create or replace function public.can_edit_report(target_report uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.daily_reports
    where id = target_report
      and (created_by = auth.uid() or public.is_master_user())
  );
$$;

create or replace function public.save_daily_report(
  p_report_id uuid,
  p_site_id uuid,
  p_site_name text,
  p_work_category_id uuid,
  p_report_date date,
  p_reporter_name text,
  p_worker_count integer,
  p_work_shift text,
  p_contract_type text,
  p_miscellaneous_costs text,
  p_other_vehicle_entries jsonb,
  p_work_description text,
  p_other_workers_note text,
  p_remarks text,
  p_progress_status text,
  p_worker_ids uuid[],
  p_external_worker_entries jsonb,
  p_lease_entries jsonb,
  p_disposal_entries jsonb,
  p_transport_entries jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_report_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if p_report_id is null then
    insert into public.daily_reports (
      site_id,
      site_name,
      work_category_id,
      report_date,
      reporter_name,
      worker_count,
      work_shift,
      contract_type,
      miscellaneous_costs,
      other_vehicle_entries,
      work_description,
      other_workers_note,
      remarks,
      progress_status,
      created_by
    )
    values (
      p_site_id,
      p_site_name,
      p_work_category_id,
      p_report_date,
      p_reporter_name,
      p_worker_count,
      p_work_shift,
      p_contract_type,
      p_miscellaneous_costs,
      coalesce(p_other_vehicle_entries, '[]'::jsonb),
      p_work_description,
      p_other_workers_note,
      p_remarks,
      p_progress_status,
      auth.uid()
    )
    returning id into v_report_id;
  else
    if not public.can_edit_report(p_report_id) then
      raise exception 'Not allowed to edit this report';
    end if;

    update public.daily_reports
    set
      site_id = p_site_id,
      site_name = p_site_name,
      work_category_id = p_work_category_id,
      report_date = p_report_date,
      reporter_name = p_reporter_name,
      worker_count = p_worker_count,
      work_shift = p_work_shift,
      contract_type = p_contract_type,
      miscellaneous_costs = p_miscellaneous_costs,
      other_vehicle_entries = coalesce(p_other_vehicle_entries, '[]'::jsonb),
      work_description = p_work_description,
      other_workers_note = p_other_workers_note,
      remarks = p_remarks,
      progress_status = p_progress_status
    where id = p_report_id;

    v_report_id := p_report_id;
  end if;

  if coalesce(array_length(p_worker_ids, 1), 0) > 0 then
    create temporary table if not exists tmp_existing_worker_snapshots (
      worker_id uuid primary key,
      label_snapshot text,
      unit_price_snapshot integer
    ) on commit drop;

    truncate table tmp_existing_worker_snapshots;

    insert into tmp_existing_worker_snapshots (worker_id, label_snapshot, unit_price_snapshot)
    select worker_id, label_snapshot, unit_price_snapshot
    from public.daily_report_workers
    where report_id = v_report_id;
  end if;

  delete from public.daily_report_workers where report_id = v_report_id;
  if coalesce(array_length(p_worker_ids, 1), 0) > 0 then
    insert into public.daily_report_workers (report_id, worker_id, label_snapshot, unit_price_snapshot)
    select
      v_report_id,
      worker.id,
      coalesce(existing.label_snapshot, worker.group_label),
      coalesce(existing.unit_price_snapshot, worker_label.unit_price, 0)
    from unnest(p_worker_ids) as input_worker(worker_id)
    join public.workers as worker on worker.id = input_worker.worker_id
    left join tmp_existing_worker_snapshots as existing on existing.worker_id = worker.id
    left join public.worker_labels as worker_label on worker_label.name = worker.group_label;
  end if;

  delete from public.daily_report_external_workers where report_id = v_report_id;
  if coalesce(jsonb_array_length(coalesce(p_external_worker_entries, '[]'::jsonb)), 0) > 0 then
    insert into public.daily_report_external_workers (report_id, worker_label_id, label_snapshot, count, unit_price_snapshot)
    select
      v_report_id,
      (entry->>'worker_label_id')::uuid,
      coalesce(nullif(trim(entry->>'label_snapshot'), ''), worker_label.name),
      coalesce((entry->>'count')::integer, 0),
      coalesce(worker_label.unit_price, 0)
    from jsonb_array_elements(coalesce(p_external_worker_entries, '[]'::jsonb)) as entry
    join public.worker_labels as worker_label on worker_label.id = (entry->>'worker_label_id')::uuid
    where coalesce((entry->>'count')::integer, 0) > 0;
  end if;

  delete from public.daily_report_lease_items where report_id = v_report_id;
  if coalesce(jsonb_array_length(coalesce(p_lease_entries, '[]'::jsonb)), 0) > 0 then
    insert into public.daily_report_lease_items (report_id, lease_item_id, item_name, count)
    select
      v_report_id,
      nullif(entry->>'lease_item_id', '')::uuid,
      nullif(trim(entry->>'label'), ''),
      (entry->>'count')::integer
    from jsonb_array_elements(coalesce(p_lease_entries, '[]'::jsonb)) as entry
    where coalesce(trim(entry->>'label'), '') <> ''
      and coalesce((entry->>'count')::integer, 0) > 0;
  end if;

  delete from public.daily_report_disposal_items where report_id = v_report_id;
  if coalesce(jsonb_array_length(coalesce(p_disposal_entries, '[]'::jsonb)), 0) > 0 then
    insert into public.daily_report_disposal_items (report_id, disposal_item_id, waste_type, other_label, ton_count, ton_unit, truck_count)
    select
      v_report_id,
      (entry->>'disposal_item_id')::uuid,
      coalesce(nullif(entry->>'waste_type', ''), 'wood'),
      nullif(trim(entry->>'other_label'), ''),
      coalesce((entry->>'ton_count')::integer, 0),
      coalesce(nullif(trim(entry->>'ton_unit'), ''), 'TC'),
      coalesce((entry->>'truck_count')::integer, 0)
    from jsonb_array_elements(coalesce(p_disposal_entries, '[]'::jsonb)) as entry
    where coalesce((entry->>'disposal_item_id')::text, '') <> ''
      and (
        coalesce(nullif(entry->>'waste_type', ''), 'wood') <> 'other'
        or coalesce(trim(entry->>'other_label'), '') <> ''
      )
      and (
        coalesce((entry->>'ton_count')::integer, 0) > 0
        or coalesce((entry->>'truck_count')::integer, 0) > 0
      );
  end if;

  delete from public.daily_report_transport_items where report_id = v_report_id;
  if coalesce(jsonb_array_length(coalesce(p_transport_entries, '[]'::jsonb)), 0) > 0 then
    insert into public.daily_report_transport_items (report_id, transport_item_id, count)
    select
      v_report_id,
      (entry->>'transport_item_id')::uuid,
      (entry->>'count')::integer
    from jsonb_array_elements(coalesce(p_transport_entries, '[]'::jsonb)) as entry
    where coalesce((entry->>'transport_item_id')::text, '') <> ''
      and coalesce((entry->>'count')::integer, 0) > 0;
  end if;

  if p_report_id is not null then
    insert into public.report_edit_logs (report_id, edited_by)
    values (v_report_id, auth.uid());
  end if;

  return v_report_id;
end;
$$;

drop trigger if exists set_sites_updated_at on public.sites;
create trigger set_sites_updated_at
before update on public.sites
for each row execute function public.set_updated_at();

drop trigger if exists set_daily_reports_updated_at on public.daily_reports;
create trigger set_daily_reports_updated_at
before update on public.daily_reports
for each row execute function public.set_updated_at();

drop trigger if exists set_workers_updated_at on public.workers;
create trigger set_workers_updated_at
before update on public.workers
for each row execute function public.set_updated_at();

drop trigger if exists set_worker_labels_updated_at on public.worker_labels;
create trigger set_worker_labels_updated_at
before update on public.worker_labels
for each row execute function public.set_updated_at();

drop trigger if exists set_work_categories_updated_at on public.work_categories;
create trigger set_work_categories_updated_at
before update on public.work_categories
for each row execute function public.set_updated_at();

drop trigger if exists set_lease_items_updated_at on public.lease_items;
create trigger set_lease_items_updated_at
before update on public.lease_items
for each row execute function public.set_updated_at();

drop trigger if exists set_disposal_items_updated_at on public.disposal_items;
create trigger set_disposal_items_updated_at
before update on public.disposal_items
for each row execute function public.set_updated_at();

drop trigger if exists set_disposal_units_updated_at on public.disposal_units;
create trigger set_disposal_units_updated_at
before update on public.disposal_units
for each row execute function public.set_updated_at();

drop trigger if exists set_transport_items_updated_at on public.transport_items;
create trigger set_transport_items_updated_at
before update on public.transport_items
for each row execute function public.set_updated_at();

alter table public.app_users enable row level security;
alter table public.sites enable row level security;
alter table public.daily_reports enable row level security;
alter table public.workers enable row level security;
alter table public.worker_labels enable row level security;
alter table public.work_categories enable row level security;
alter table public.lease_items enable row level security;
alter table public.disposal_items enable row level security;
alter table public.disposal_units enable row level security;
alter table public.transport_items enable row level security;
alter table public.daily_report_workers enable row level security;
alter table public.daily_report_external_workers enable row level security;
alter table public.daily_report_lease_items enable row level security;
alter table public.daily_report_disposal_items enable row level security;
alter table public.daily_report_transport_items enable row level security;
alter table public.report_photos enable row level security;
alter table public.report_edit_logs enable row level security;

drop policy if exists "authenticated users can read app_users" on public.app_users;
create policy "authenticated users can read app_users"
on public.app_users
for select
to authenticated
using (true);

drop policy if exists "users can insert own app_user or masters can insert all" on public.app_users;
create policy "users can insert own app_user or masters can insert all"
on public.app_users
for insert
to authenticated
with check (user_id = auth.uid() or public.is_master_user());

drop policy if exists "users can update own app_user or masters can update all" on public.app_users;
create policy "users can update own app_user or masters can update all"
on public.app_users
for update
to authenticated
using (user_id = auth.uid() or public.is_master_user())
with check (user_id = auth.uid() or public.is_master_user());

drop policy if exists "authenticated users can manage sites" on public.sites;
create policy "authenticated users can manage sites"
on public.sites
for all
to authenticated
using (true)
with check (true);

drop policy if exists "authenticated users can read daily_reports" on public.daily_reports;
create policy "authenticated users can read daily_reports"
on public.daily_reports
for select
to authenticated
using (true);

drop policy if exists "authenticated users can insert daily_reports" on public.daily_reports;
create policy "authenticated users can insert daily_reports"
on public.daily_reports
for insert
to authenticated
with check (created_by = auth.uid());

drop policy if exists "owners or masters can update daily_reports" on public.daily_reports;
create policy "owners or masters can update daily_reports"
on public.daily_reports
for update
to authenticated
using (public.can_edit_report(id))
with check (created_by = auth.uid() or public.is_master_user());

drop policy if exists "owners or masters can delete daily_reports" on public.daily_reports;
create policy "owners or masters can delete daily_reports"
on public.daily_reports
for delete
to authenticated
using (public.can_edit_report(id));

drop policy if exists "authenticated users can manage workers" on public.workers;
create policy "authenticated users can manage workers"
on public.workers
for all
to authenticated
using (true)
with check (true);

drop policy if exists "authenticated users can manage worker_labels" on public.worker_labels;
create policy "authenticated users can manage worker_labels"
on public.worker_labels
for all
to authenticated
using (true)
with check (true);

drop policy if exists "authenticated users can manage work_categories" on public.work_categories;
create policy "authenticated users can manage work_categories"
on public.work_categories
for all
to authenticated
using (true)
with check (true);

drop policy if exists "authenticated users can manage lease_items" on public.lease_items;
create policy "authenticated users can manage lease_items"
on public.lease_items
for all
to authenticated
using (true)
with check (true);

drop policy if exists "authenticated users can manage disposal_items" on public.disposal_items;
create policy "authenticated users can manage disposal_items"
on public.disposal_items
for all
to authenticated
using (true)
with check (true);

drop policy if exists "authenticated users can manage disposal_units" on public.disposal_units;
create policy "authenticated users can manage disposal_units"
on public.disposal_units
for all
to authenticated
using (true)
with check (true);

drop policy if exists "authenticated users can manage transport_items" on public.transport_items;
create policy "authenticated users can manage transport_items"
on public.transport_items
for all
to authenticated
using (true)
with check (true);

drop policy if exists "authenticated users can read daily_report_workers" on public.daily_report_workers;
create policy "authenticated users can read daily_report_workers"
on public.daily_report_workers
for select
to authenticated
using (true);

drop policy if exists "owners or masters can manage daily_report_workers" on public.daily_report_workers;
create policy "owners or masters can manage daily_report_workers"
on public.daily_report_workers
for all
to authenticated
using (public.can_edit_report(report_id))
with check (public.can_edit_report(report_id));

drop policy if exists "authenticated users can read daily_report_external_workers" on public.daily_report_external_workers;
create policy "authenticated users can read daily_report_external_workers"
on public.daily_report_external_workers
for select
to authenticated
using (true);

drop policy if exists "owners or masters can manage daily_report_external_workers" on public.daily_report_external_workers;
create policy "owners or masters can manage daily_report_external_workers"
on public.daily_report_external_workers
for all
to authenticated
using (public.can_edit_report(report_id))
with check (public.can_edit_report(report_id));

drop policy if exists "authenticated users can read daily_report_lease_items" on public.daily_report_lease_items;
create policy "authenticated users can read daily_report_lease_items"
on public.daily_report_lease_items
for select
to authenticated
using (true);

drop policy if exists "owners or masters can manage daily_report_lease_items" on public.daily_report_lease_items;
create policy "owners or masters can manage daily_report_lease_items"
on public.daily_report_lease_items
for all
to authenticated
using (public.can_edit_report(report_id))
with check (public.can_edit_report(report_id));

drop policy if exists "authenticated users can read daily_report_disposal_items" on public.daily_report_disposal_items;
create policy "authenticated users can read daily_report_disposal_items"
on public.daily_report_disposal_items
for select
to authenticated
using (true);

drop policy if exists "owners or masters can manage daily_report_disposal_items" on public.daily_report_disposal_items;
create policy "owners or masters can manage daily_report_disposal_items"
on public.daily_report_disposal_items
for all
to authenticated
using (public.can_edit_report(report_id))
with check (public.can_edit_report(report_id));

drop policy if exists "authenticated users can read daily_report_transport_items" on public.daily_report_transport_items;
create policy "authenticated users can read daily_report_transport_items"
on public.daily_report_transport_items
for select
to authenticated
using (true);

drop policy if exists "owners or masters can manage daily_report_transport_items" on public.daily_report_transport_items;
create policy "owners or masters can manage daily_report_transport_items"
on public.daily_report_transport_items
for all
to authenticated
using (public.can_edit_report(report_id))
with check (public.can_edit_report(report_id));

drop policy if exists "authenticated users can read report_photos" on public.report_photos;
create policy "authenticated users can read report_photos"
on public.report_photos
for select
to authenticated
using (true);

drop policy if exists "owners or masters can manage report_photos" on public.report_photos;
create policy "owners or masters can manage report_photos"
on public.report_photos
for all
to authenticated
using (public.can_edit_report(report_id))
with check (public.can_edit_report(report_id));

drop policy if exists "authenticated users can read report_edit_logs" on public.report_edit_logs;
create policy "authenticated users can read report_edit_logs"
on public.report_edit_logs
for select
to authenticated
using (true);

drop policy if exists "owners or masters can manage report_edit_logs" on public.report_edit_logs;
create policy "owners or masters can manage report_edit_logs"
on public.report_edit_logs
for all
to authenticated
using (public.can_edit_report(report_id))
with check (public.can_edit_report(report_id));

comment on table public.sites is 'MVPでは単一会社向け。将来は company_id を追加し、RLS を company_id ベースに切り替える。';
comment on table public.daily_reports is 'MVPでは単一会社向け。将来は company_id を追加し、created_by と合わせてテナント分離する。';
comment on table public.app_users is 'is_master=true のユーザーは日報を横断して編集可能。';
comment on table public.workers is '作業員マスタ。group_label には worker_labels.name を保存し、日報でラベル別集計に使う。';
comment on table public.worker_labels is '作業員ラベルマスタ。会社や所属ラベルと1人あたり単価を管理する。';
comment on table public.lease_items is 'リース関係マスタ。ニシコンや城東リースなどを管理する。';
comment on table public.disposal_items is 'ゴミ処分マスタ。エイシンやRSKなどを管理する。';
comment on table public.disposal_units is 'ゴミ処分の数量単位マスタ。TC、TL、TPなどを管理する。';
comment on table public.transport_items is '車両・運搬マスタ。2TCや乗用車などを管理する。';
comment on column public.report_photos.image_path is '外部ストレージまたは自社サーバーに保存した画像URLを格納する。';

-- マスターアカウント設定例
-- Authentication > Users で確認した user_id に差し替えて実行する
--
-- insert into public.app_users (user_id, is_master)
-- values ('REPLACE_WITH_AUTH_USER_ID', true)
-- on conflict (user_id)
-- do update
-- set is_master = excluded.is_master;

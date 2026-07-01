


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."can_edit_report"("target_report" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
    from public.daily_reports
    where id = target_report
      and (created_by = auth.uid() or public.is_master_user())
  );
$$;


ALTER FUNCTION "public"."can_edit_report"("target_report" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_master_user"("target_user" "uuid" DEFAULT "auth"."uid"()) RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
    from public.app_users
    where user_id = target_user
      and is_master = true
  );
$$;


ALTER FUNCTION "public"."is_master_user"("target_user" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."save_daily_report"("p_report_id" "uuid", "p_site_id" "uuid", "p_report_date" "date", "p_worker_count" integer, "p_work_shift" "text", "p_contract_type" "text", "p_miscellaneous_costs" "text", "p_other_vehicle_entries" "jsonb", "p_other_workers_note" "text", "p_remarks" "text", "p_progress_status" "text", "p_worker_ids" "uuid"[], "p_lease_entries" "jsonb", "p_disposal_entries" "jsonb", "p_transport_entries" "jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_report_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if p_report_id is null then
    insert into public.daily_reports (
      site_id,
      report_date,
      worker_count,
      work_shift,
      contract_type,
      miscellaneous_costs,
      other_vehicle_entries,
      other_workers_note,
      remarks,
      progress_status,
      created_by
    )
    values (
      p_site_id,
      p_report_date,
      p_worker_count,
      p_work_shift,
      p_contract_type,
      p_miscellaneous_costs,
      coalesce(p_other_vehicle_entries, '[]'::jsonb),
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
      report_date = p_report_date,
      worker_count = p_worker_count,
      work_shift = p_work_shift,
      contract_type = p_contract_type,
      miscellaneous_costs = p_miscellaneous_costs,
      other_vehicle_entries = coalesce(p_other_vehicle_entries, '[]'::jsonb),
      other_workers_note = p_other_workers_note,
      remarks = p_remarks,
      progress_status = p_progress_status
    where id = p_report_id;

    v_report_id := p_report_id;
  end if;

  delete from public.daily_report_workers where report_id = v_report_id;
  if coalesce(array_length(p_worker_ids, 1), 0) > 0 then
    insert into public.daily_report_workers (report_id, worker_id)
    select v_report_id, worker_id
    from unnest(p_worker_ids) as worker_id;
  end if;

  delete from public.daily_report_lease_items where report_id = v_report_id;
  if coalesce(jsonb_array_length(coalesce(p_lease_entries, '[]'::jsonb)), 0) > 0 then
    insert into public.daily_report_lease_items (report_id, lease_item_id, count)
    select
      v_report_id,
      (entry->>'lease_item_id')::uuid,
      (entry->>'count')::integer
    from jsonb_array_elements(coalesce(p_lease_entries, '[]'::jsonb)) as entry
    where coalesce((entry->>'lease_item_id')::text, '') <> ''
      and coalesce((entry->>'count')::integer, 0) > 0;
  end if;

  delete from public.daily_report_disposal_items where report_id = v_report_id;
  if coalesce(jsonb_array_length(coalesce(p_disposal_entries, '[]'::jsonb)), 0) > 0 then
    insert into public.daily_report_disposal_items (report_id, disposal_item_id, ton_count, truck_count)
    select
      v_report_id,
      (entry->>'disposal_item_id')::uuid,
      coalesce((entry->>'ton_count')::integer, 0),
      coalesce((entry->>'truck_count')::integer, 0)
    from jsonb_array_elements(coalesce(p_disposal_entries, '[]'::jsonb)) as entry
    where coalesce((entry->>'disposal_item_id')::text, '') <> ''
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


ALTER FUNCTION "public"."save_daily_report"("p_report_id" "uuid", "p_site_id" "uuid", "p_report_date" "date", "p_worker_count" integer, "p_work_shift" "text", "p_contract_type" "text", "p_miscellaneous_costs" "text", "p_other_vehicle_entries" "jsonb", "p_other_workers_note" "text", "p_remarks" "text", "p_progress_status" "text", "p_worker_ids" "uuid"[], "p_lease_entries" "jsonb", "p_disposal_entries" "jsonb", "p_transport_entries" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."save_daily_report"("p_report_id" "uuid", "p_site_id" "uuid", "p_work_category_id" "uuid", "p_report_date" "date", "p_worker_count" integer, "p_work_shift" "text", "p_contract_type" "text", "p_miscellaneous_costs" "text", "p_other_vehicle_entries" "jsonb", "p_other_workers_note" "text", "p_remarks" "text", "p_progress_status" "text", "p_worker_ids" "uuid"[], "p_lease_entries" "jsonb", "p_disposal_entries" "jsonb", "p_transport_entries" "jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_report_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if p_report_id is null then
    insert into public.daily_reports (
      site_id,
      work_category_id,
      report_date,
      worker_count,
      work_shift,
      contract_type,
      miscellaneous_costs,
      other_vehicle_entries,
      other_workers_note,
      remarks,
      progress_status,
      created_by
    )
    values (
      p_site_id,
      p_work_category_id,
      p_report_date,
      p_worker_count,
      p_work_shift,
      p_contract_type,
      p_miscellaneous_costs,
      coalesce(p_other_vehicle_entries, '[]'::jsonb),
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
      work_category_id = p_work_category_id,
      report_date = p_report_date,
      worker_count = p_worker_count,
      work_shift = p_work_shift,
      contract_type = p_contract_type,
      miscellaneous_costs = p_miscellaneous_costs,
      other_vehicle_entries = coalesce(p_other_vehicle_entries, '[]'::jsonb),
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
    insert into public.daily_report_disposal_items (report_id, disposal_item_id, waste_type, other_label, ton_count, truck_count)
    select
      v_report_id,
      (entry->>'disposal_item_id')::uuid,
      coalesce(nullif(entry->>'waste_type', ''), 'wood'),
      nullif(trim(entry->>'other_label'), ''),
      coalesce((entry->>'ton_count')::integer, 0),
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


ALTER FUNCTION "public"."save_daily_report"("p_report_id" "uuid", "p_site_id" "uuid", "p_work_category_id" "uuid", "p_report_date" "date", "p_worker_count" integer, "p_work_shift" "text", "p_contract_type" "text", "p_miscellaneous_costs" "text", "p_other_vehicle_entries" "jsonb", "p_other_workers_note" "text", "p_remarks" "text", "p_progress_status" "text", "p_worker_ids" "uuid"[], "p_lease_entries" "jsonb", "p_disposal_entries" "jsonb", "p_transport_entries" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."save_daily_report"("p_report_id" "uuid", "p_site_id" "uuid", "p_work_category_id" "uuid", "p_report_date" "date", "p_reporter_name" "text", "p_worker_count" integer, "p_work_shift" "text", "p_contract_type" "text", "p_miscellaneous_costs" "text", "p_other_vehicle_entries" "jsonb", "p_work_description" "text", "p_other_workers_note" "text", "p_remarks" "text", "p_progress_status" "text", "p_worker_ids" "uuid"[], "p_external_worker_entries" "jsonb", "p_lease_entries" "jsonb", "p_disposal_entries" "jsonb", "p_transport_entries" "jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_report_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if p_report_id is null then
    insert into public.daily_reports (
      site_id,
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
    insert into public.daily_report_disposal_items (report_id, disposal_item_id, waste_type, other_label, ton_count, truck_count)
    select
      v_report_id,
      (entry->>'disposal_item_id')::uuid,
      coalesce(nullif(entry->>'waste_type', ''), 'wood'),
      nullif(trim(entry->>'other_label'), ''),
      coalesce((entry->>'ton_count')::integer, 0),
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


ALTER FUNCTION "public"."save_daily_report"("p_report_id" "uuid", "p_site_id" "uuid", "p_work_category_id" "uuid", "p_report_date" "date", "p_reporter_name" "text", "p_worker_count" integer, "p_work_shift" "text", "p_contract_type" "text", "p_miscellaneous_costs" "text", "p_other_vehicle_entries" "jsonb", "p_work_description" "text", "p_other_workers_note" "text", "p_remarks" "text", "p_progress_status" "text", "p_worker_ids" "uuid"[], "p_external_worker_entries" "jsonb", "p_lease_entries" "jsonb", "p_disposal_entries" "jsonb", "p_transport_entries" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."save_daily_report"("p_report_id" "uuid", "p_site_id" "uuid", "p_site_name" "text", "p_work_category_id" "uuid", "p_report_date" "date", "p_reporter_name" "text", "p_worker_count" integer, "p_work_shift" "text", "p_contract_type" "text", "p_miscellaneous_costs" "text", "p_other_vehicle_entries" "jsonb", "p_work_description" "text", "p_other_workers_note" "text", "p_remarks" "text", "p_progress_status" "text", "p_worker_ids" "uuid"[], "p_external_worker_entries" "jsonb", "p_lease_entries" "jsonb", "p_disposal_entries" "jsonb", "p_transport_entries" "jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
    insert into public.daily_report_disposal_items (report_id, disposal_item_id, waste_type, other_label, ton_count, truck_count)
    select
      v_report_id,
      (entry->>'disposal_item_id')::uuid,
      coalesce(nullif(entry->>'waste_type', ''), 'wood'),
      nullif(trim(entry->>'other_label'), ''),
      coalesce((entry->>'ton_count')::integer, 0),
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


ALTER FUNCTION "public"."save_daily_report"("p_report_id" "uuid", "p_site_id" "uuid", "p_site_name" "text", "p_work_category_id" "uuid", "p_report_date" "date", "p_reporter_name" "text", "p_worker_count" integer, "p_work_shift" "text", "p_contract_type" "text", "p_miscellaneous_costs" "text", "p_other_vehicle_entries" "jsonb", "p_work_description" "text", "p_other_workers_note" "text", "p_remarks" "text", "p_progress_status" "text", "p_worker_ids" "uuid"[], "p_external_worker_entries" "jsonb", "p_lease_entries" "jsonb", "p_disposal_entries" "jsonb", "p_transport_entries" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."app_users" (
    "user_id" "uuid" NOT NULL,
    "is_master" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "display_name" "text",
    "sort_order" integer DEFAULT 0 NOT NULL,
    "is_subcontractor" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."app_users" OWNER TO "postgres";


COMMENT ON TABLE "public"."app_users" IS 'is_master=true のユーザーは日報を横断して編集可能。';



CREATE TABLE IF NOT EXISTS "public"."daily_report_disposal_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "report_id" "uuid" NOT NULL,
    "disposal_item_id" "uuid" NOT NULL,
    "ton_count" integer DEFAULT 0 NOT NULL,
    "truck_count" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "waste_type" "text" DEFAULT 'wood'::"text" NOT NULL,
    "other_label" "text"
);


ALTER TABLE "public"."daily_report_disposal_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."daily_report_external_workers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "report_id" "uuid" NOT NULL,
    "worker_label_id" "uuid" NOT NULL,
    "label_snapshot" "text" NOT NULL,
    "count" integer DEFAULT 0 NOT NULL,
    "unit_price_snapshot" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "daily_report_external_workers_count_check" CHECK (("count" >= 0))
);


ALTER TABLE "public"."daily_report_external_workers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."daily_report_lease_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "report_id" "uuid" NOT NULL,
    "lease_item_id" "uuid",
    "count" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "item_name" "text"
);


ALTER TABLE "public"."daily_report_lease_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."daily_report_machines" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "report_id" "uuid" NOT NULL,
    "machine_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."daily_report_machines" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."daily_report_partner_companies" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "report_id" "uuid" NOT NULL,
    "partner_company_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."daily_report_partner_companies" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."daily_report_safety_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "report_id" "uuid" NOT NULL,
    "safety_item_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."daily_report_safety_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."daily_report_transport_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "report_id" "uuid" NOT NULL,
    "transport_item_id" "uuid" NOT NULL,
    "count" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."daily_report_transport_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."daily_report_vehicles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "report_id" "uuid" NOT NULL,
    "vehicle_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."daily_report_vehicles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."daily_report_waste_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "report_id" "uuid" NOT NULL,
    "waste_item_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."daily_report_waste_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."daily_report_work_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "report_id" "uuid" NOT NULL,
    "work_item_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."daily_report_work_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."daily_report_workers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "report_id" "uuid" NOT NULL,
    "worker_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "label_snapshot" "text",
    "unit_price_snapshot" integer DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."daily_report_workers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."daily_reports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "site_id" "uuid" NOT NULL,
    "report_date" "date" NOT NULL,
    "worker_count" integer NOT NULL,
    "tomorrow_plan" "text",
    "note" "text",
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "work_shift" "text",
    "contract_type" "text",
    "miscellaneous_costs" "text",
    "lease_nishicon" "text",
    "lease_joto" "text",
    "lease_aktio" "text",
    "waste_eishin" "text",
    "waste_rsk" "text",
    "waste_asahi" "text",
    "waste_gara" "text",
    "waste_shiba" "text",
    "vehicle_2tc_count" integer DEFAULT 0 NOT NULL,
    "vehicle_2tl_gate_count" integer DEFAULT 0 NOT NULL,
    "vehicle_4tc_count" integer DEFAULT 0 NOT NULL,
    "vehicle_2td_count" integer DEFAULT 0 NOT NULL,
    "vehicle_passenger_count" integer DEFAULT 0 NOT NULL,
    "vehicle_aktio_2tl_count" integer DEFAULT 0 NOT NULL,
    "vehicle_aktio_2td_count" integer DEFAULT 0 NOT NULL,
    "other_vehicle_count" integer DEFAULT 0 NOT NULL,
    "other_vehicle_note" "text",
    "other_workers_note" "text",
    "remarks" "text",
    "progress_status" "text",
    "other_vehicle_entries" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "work_category_id" "uuid",
    "work_description" "text",
    "reporter_name" "text",
    "site_name" "text",
    CONSTRAINT "daily_reports_worker_count_check" CHECK (("worker_count" > 0))
);


ALTER TABLE "public"."daily_reports" OWNER TO "postgres";


COMMENT ON TABLE "public"."daily_reports" IS 'MVPでは単一会社向け。将来は company_id を追加し、created_by と合わせてテナント分離する。';



CREATE TABLE IF NOT EXISTS "public"."disposal_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."disposal_items" OWNER TO "postgres";


COMMENT ON TABLE "public"."disposal_items" IS 'ゴミ処分マスタ。エイシンやRSKなどを管理する。';



CREATE TABLE IF NOT EXISTS "public"."lease_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."lease_items" OWNER TO "postgres";


COMMENT ON TABLE "public"."lease_items" IS 'リース関係マスタ。ニシコンや城東リースなどを管理する。';



CREATE TABLE IF NOT EXISTS "public"."machines" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."machines" OWNER TO "postgres";


COMMENT ON TABLE "public"."machines" IS '固定マスタ種別として追加。将来機種、号機、保有区分などを付与しやすい形。';



CREATE TABLE IF NOT EXISTS "public"."partner_companies" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."partner_companies" OWNER TO "postgres";


COMMENT ON TABLE "public"."partner_companies" IS '固定マスタ種別として追加。将来担当者情報や請負区分を付与しやすい形。';



CREATE TABLE IF NOT EXISTS "public"."report_edit_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "report_id" "uuid" NOT NULL,
    "edited_by" "uuid" NOT NULL,
    "edited_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."report_edit_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."report_photos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "report_id" "uuid" NOT NULL,
    "image_path" "text" NOT NULL,
    "caption" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."report_photos" OWNER TO "postgres";


COMMENT ON COLUMN "public"."report_photos"."image_path" IS '外部ストレージまたは自社サーバーに保存した画像URLを格納する。';



CREATE TABLE IF NOT EXISTS "public"."safety_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."safety_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sites" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "address" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."sites" OWNER TO "postgres";


COMMENT ON TABLE "public"."sites" IS 'MVPでは単一会社向け。将来は company_id を追加し、RLS を company_id ベースに切り替える。';



CREATE TABLE IF NOT EXISTS "public"."transport_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."transport_items" OWNER TO "postgres";


COMMENT ON TABLE "public"."transport_items" IS '車両・運搬マスタ。2TCや乗用車などを管理する。';



CREATE TABLE IF NOT EXISTS "public"."vehicles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."vehicles" OWNER TO "postgres";


COMMENT ON TABLE "public"."vehicles" IS '固定マスタ種別として追加。将来ナンバー、車種、積載量などを付与しやすい形。';



CREATE TABLE IF NOT EXISTS "public"."waste_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."waste_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."work_categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."work_categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."work_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."work_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."worker_labels" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "unit_price" integer DEFAULT 0 NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."worker_labels" OWNER TO "postgres";


COMMENT ON TABLE "public"."worker_labels" IS '作業員ラベルマスタ。会社や所属ラベルと1人あたり単価を管理する。';



CREATE TABLE IF NOT EXISTS "public"."workers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "group_label" "text"
);


ALTER TABLE "public"."workers" OWNER TO "postgres";


COMMENT ON TABLE "public"."workers" IS '作業員マスタ。group_label には worker_labels.name を保存し、日報でラベル別集計に使う。';



ALTER TABLE ONLY "public"."app_users"
    ADD CONSTRAINT "app_users_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."daily_report_disposal_items"
    ADD CONSTRAINT "daily_report_disposal_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."daily_report_external_workers"
    ADD CONSTRAINT "daily_report_external_workers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."daily_report_lease_items"
    ADD CONSTRAINT "daily_report_lease_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."daily_report_machines"
    ADD CONSTRAINT "daily_report_machines_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."daily_report_machines"
    ADD CONSTRAINT "daily_report_machines_report_id_machine_id_key" UNIQUE ("report_id", "machine_id");



ALTER TABLE ONLY "public"."daily_report_partner_companies"
    ADD CONSTRAINT "daily_report_partner_companies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."daily_report_partner_companies"
    ADD CONSTRAINT "daily_report_partner_companies_report_id_partner_company_id_key" UNIQUE ("report_id", "partner_company_id");



ALTER TABLE ONLY "public"."daily_report_safety_items"
    ADD CONSTRAINT "daily_report_safety_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."daily_report_safety_items"
    ADD CONSTRAINT "daily_report_safety_items_report_id_safety_item_id_key" UNIQUE ("report_id", "safety_item_id");



ALTER TABLE ONLY "public"."daily_report_transport_items"
    ADD CONSTRAINT "daily_report_transport_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."daily_report_vehicles"
    ADD CONSTRAINT "daily_report_vehicles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."daily_report_vehicles"
    ADD CONSTRAINT "daily_report_vehicles_report_id_vehicle_id_key" UNIQUE ("report_id", "vehicle_id");



ALTER TABLE ONLY "public"."daily_report_waste_items"
    ADD CONSTRAINT "daily_report_waste_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."daily_report_waste_items"
    ADD CONSTRAINT "daily_report_waste_items_report_id_waste_item_id_key" UNIQUE ("report_id", "waste_item_id");



ALTER TABLE ONLY "public"."daily_report_work_items"
    ADD CONSTRAINT "daily_report_work_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."daily_report_work_items"
    ADD CONSTRAINT "daily_report_work_items_report_id_work_item_id_key" UNIQUE ("report_id", "work_item_id");



ALTER TABLE ONLY "public"."daily_report_workers"
    ADD CONSTRAINT "daily_report_workers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."daily_report_workers"
    ADD CONSTRAINT "daily_report_workers_report_id_worker_id_key" UNIQUE ("report_id", "worker_id");



ALTER TABLE ONLY "public"."daily_reports"
    ADD CONSTRAINT "daily_reports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."disposal_items"
    ADD CONSTRAINT "disposal_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lease_items"
    ADD CONSTRAINT "lease_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."machines"
    ADD CONSTRAINT "machines_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."partner_companies"
    ADD CONSTRAINT "partner_companies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."report_edit_logs"
    ADD CONSTRAINT "report_edit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."report_photos"
    ADD CONSTRAINT "report_photos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."safety_items"
    ADD CONSTRAINT "safety_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sites"
    ADD CONSTRAINT "sites_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."transport_items"
    ADD CONSTRAINT "transport_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."vehicles"
    ADD CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."waste_items"
    ADD CONSTRAINT "waste_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."work_categories"
    ADD CONSTRAINT "work_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."work_items"
    ADD CONSTRAINT "work_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."worker_labels"
    ADD CONSTRAINT "worker_labels_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."workers"
    ADD CONSTRAINT "workers_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_daily_report_disposal_items_report_id" ON "public"."daily_report_disposal_items" USING "btree" ("report_id");



CREATE INDEX "idx_daily_report_external_workers_report_id" ON "public"."daily_report_external_workers" USING "btree" ("report_id");



CREATE INDEX "idx_daily_report_lease_items_report_id" ON "public"."daily_report_lease_items" USING "btree" ("report_id");



CREATE INDEX "idx_daily_report_transport_items_report_id" ON "public"."daily_report_transport_items" USING "btree" ("report_id");



CREATE INDEX "idx_daily_report_workers_report_id" ON "public"."daily_report_workers" USING "btree" ("report_id");



CREATE INDEX "idx_daily_reports_report_date" ON "public"."daily_reports" USING "btree" ("report_date" DESC);



CREATE INDEX "idx_daily_reports_site_id" ON "public"."daily_reports" USING "btree" ("site_id");



CREATE INDEX "idx_daily_reports_work_category_id" ON "public"."daily_reports" USING "btree" ("work_category_id");



CREATE INDEX "idx_report_edit_logs_report_id" ON "public"."report_edit_logs" USING "btree" ("report_id", "edited_at" DESC);



CREATE INDEX "idx_report_photos_report_id" ON "public"."report_photos" USING "btree" ("report_id");



CREATE OR REPLACE TRIGGER "set_daily_reports_updated_at" BEFORE UPDATE ON "public"."daily_reports" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_disposal_items_updated_at" BEFORE UPDATE ON "public"."disposal_items" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_lease_items_updated_at" BEFORE UPDATE ON "public"."lease_items" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_machines_updated_at" BEFORE UPDATE ON "public"."machines" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_partner_companies_updated_at" BEFORE UPDATE ON "public"."partner_companies" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_safety_items_updated_at" BEFORE UPDATE ON "public"."safety_items" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_sites_updated_at" BEFORE UPDATE ON "public"."sites" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_transport_items_updated_at" BEFORE UPDATE ON "public"."transport_items" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_vehicles_updated_at" BEFORE UPDATE ON "public"."vehicles" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_waste_items_updated_at" BEFORE UPDATE ON "public"."waste_items" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_work_categories_updated_at" BEFORE UPDATE ON "public"."work_categories" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_work_items_updated_at" BEFORE UPDATE ON "public"."work_items" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_worker_labels_updated_at" BEFORE UPDATE ON "public"."worker_labels" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_workers_updated_at" BEFORE UPDATE ON "public"."workers" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



ALTER TABLE ONLY "public"."app_users"
    ADD CONSTRAINT "app_users_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."daily_report_disposal_items"
    ADD CONSTRAINT "daily_report_disposal_items_disposal_item_id_fkey" FOREIGN KEY ("disposal_item_id") REFERENCES "public"."disposal_items"("id");



ALTER TABLE ONLY "public"."daily_report_disposal_items"
    ADD CONSTRAINT "daily_report_disposal_items_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "public"."daily_reports"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."daily_report_external_workers"
    ADD CONSTRAINT "daily_report_external_workers_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "public"."daily_reports"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."daily_report_external_workers"
    ADD CONSTRAINT "daily_report_external_workers_worker_label_id_fkey" FOREIGN KEY ("worker_label_id") REFERENCES "public"."worker_labels"("id");



ALTER TABLE ONLY "public"."daily_report_lease_items"
    ADD CONSTRAINT "daily_report_lease_items_lease_item_id_fkey" FOREIGN KEY ("lease_item_id") REFERENCES "public"."lease_items"("id");



ALTER TABLE ONLY "public"."daily_report_lease_items"
    ADD CONSTRAINT "daily_report_lease_items_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "public"."daily_reports"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."daily_report_machines"
    ADD CONSTRAINT "daily_report_machines_machine_id_fkey" FOREIGN KEY ("machine_id") REFERENCES "public"."machines"("id");



ALTER TABLE ONLY "public"."daily_report_machines"
    ADD CONSTRAINT "daily_report_machines_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "public"."daily_reports"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."daily_report_partner_companies"
    ADD CONSTRAINT "daily_report_partner_companies_partner_company_id_fkey" FOREIGN KEY ("partner_company_id") REFERENCES "public"."partner_companies"("id");



ALTER TABLE ONLY "public"."daily_report_partner_companies"
    ADD CONSTRAINT "daily_report_partner_companies_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "public"."daily_reports"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."daily_report_safety_items"
    ADD CONSTRAINT "daily_report_safety_items_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "public"."daily_reports"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."daily_report_safety_items"
    ADD CONSTRAINT "daily_report_safety_items_safety_item_id_fkey" FOREIGN KEY ("safety_item_id") REFERENCES "public"."safety_items"("id");



ALTER TABLE ONLY "public"."daily_report_transport_items"
    ADD CONSTRAINT "daily_report_transport_items_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "public"."daily_reports"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."daily_report_transport_items"
    ADD CONSTRAINT "daily_report_transport_items_transport_item_id_fkey" FOREIGN KEY ("transport_item_id") REFERENCES "public"."transport_items"("id");



ALTER TABLE ONLY "public"."daily_report_vehicles"
    ADD CONSTRAINT "daily_report_vehicles_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "public"."daily_reports"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."daily_report_vehicles"
    ADD CONSTRAINT "daily_report_vehicles_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id");



ALTER TABLE ONLY "public"."daily_report_waste_items"
    ADD CONSTRAINT "daily_report_waste_items_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "public"."daily_reports"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."daily_report_waste_items"
    ADD CONSTRAINT "daily_report_waste_items_waste_item_id_fkey" FOREIGN KEY ("waste_item_id") REFERENCES "public"."waste_items"("id");



ALTER TABLE ONLY "public"."daily_report_work_items"
    ADD CONSTRAINT "daily_report_work_items_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "public"."daily_reports"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."daily_report_work_items"
    ADD CONSTRAINT "daily_report_work_items_work_item_id_fkey" FOREIGN KEY ("work_item_id") REFERENCES "public"."work_items"("id");



ALTER TABLE ONLY "public"."daily_report_workers"
    ADD CONSTRAINT "daily_report_workers_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "public"."daily_reports"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."daily_report_workers"
    ADD CONSTRAINT "daily_report_workers_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "public"."workers"("id");



ALTER TABLE ONLY "public"."daily_reports"
    ADD CONSTRAINT "daily_reports_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."daily_reports"
    ADD CONSTRAINT "daily_reports_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id");



ALTER TABLE ONLY "public"."daily_reports"
    ADD CONSTRAINT "daily_reports_work_category_id_fkey" FOREIGN KEY ("work_category_id") REFERENCES "public"."work_categories"("id");



ALTER TABLE ONLY "public"."report_edit_logs"
    ADD CONSTRAINT "report_edit_logs_edited_by_fkey" FOREIGN KEY ("edited_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."report_edit_logs"
    ADD CONSTRAINT "report_edit_logs_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "public"."daily_reports"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."report_photos"
    ADD CONSTRAINT "report_photos_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "public"."daily_reports"("id") ON DELETE CASCADE;



ALTER TABLE "public"."app_users" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "authenticated users can insert daily_reports" ON "public"."daily_reports" FOR INSERT TO "authenticated" WITH CHECK (("created_by" = "auth"."uid"()));



CREATE POLICY "authenticated users can manage daily_report_machines" ON "public"."daily_report_machines" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "authenticated users can manage daily_report_partner_companies" ON "public"."daily_report_partner_companies" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "authenticated users can manage daily_report_safety_items" ON "public"."daily_report_safety_items" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "authenticated users can manage daily_report_vehicles" ON "public"."daily_report_vehicles" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "authenticated users can manage daily_report_waste_items" ON "public"."daily_report_waste_items" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "authenticated users can manage daily_report_work_items" ON "public"."daily_report_work_items" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "authenticated users can manage daily_report_workers" ON "public"."daily_report_workers" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "authenticated users can manage daily_reports" ON "public"."daily_reports" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "authenticated users can manage disposal_items" ON "public"."disposal_items" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "authenticated users can manage lease_items" ON "public"."lease_items" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "authenticated users can manage machines" ON "public"."machines" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "authenticated users can manage partner_companies" ON "public"."partner_companies" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "authenticated users can manage report_photos" ON "public"."report_photos" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "authenticated users can manage safety_items" ON "public"."safety_items" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "authenticated users can manage sites" ON "public"."sites" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "authenticated users can manage transport_items" ON "public"."transport_items" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "authenticated users can manage vehicles" ON "public"."vehicles" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "authenticated users can manage waste_items" ON "public"."waste_items" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "authenticated users can manage work_categories" ON "public"."work_categories" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "authenticated users can manage work_items" ON "public"."work_items" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "authenticated users can manage worker_labels" ON "public"."worker_labels" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "authenticated users can manage workers" ON "public"."workers" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "authenticated users can read app_users" ON "public"."app_users" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "authenticated users can read daily_report_disposal_items" ON "public"."daily_report_disposal_items" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "authenticated users can read daily_report_external_workers" ON "public"."daily_report_external_workers" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "authenticated users can read daily_report_lease_items" ON "public"."daily_report_lease_items" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "authenticated users can read daily_report_machines" ON "public"."daily_report_machines" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "authenticated users can read daily_report_partner_companies" ON "public"."daily_report_partner_companies" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "authenticated users can read daily_report_safety_items" ON "public"."daily_report_safety_items" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "authenticated users can read daily_report_transport_items" ON "public"."daily_report_transport_items" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "authenticated users can read daily_report_vehicles" ON "public"."daily_report_vehicles" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "authenticated users can read daily_report_waste_items" ON "public"."daily_report_waste_items" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "authenticated users can read daily_report_work_items" ON "public"."daily_report_work_items" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "authenticated users can read daily_report_workers" ON "public"."daily_report_workers" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "authenticated users can read daily_reports" ON "public"."daily_reports" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "authenticated users can read report_edit_logs" ON "public"."report_edit_logs" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "authenticated users can read report_photos" ON "public"."report_photos" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."daily_report_disposal_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."daily_report_external_workers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."daily_report_lease_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."daily_report_machines" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."daily_report_partner_companies" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."daily_report_safety_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."daily_report_transport_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."daily_report_vehicles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."daily_report_waste_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."daily_report_work_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."daily_report_workers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."daily_reports" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."disposal_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."lease_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."machines" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "owners or masters can delete daily_reports" ON "public"."daily_reports" FOR DELETE TO "authenticated" USING ("public"."can_edit_report"("id"));



CREATE POLICY "owners or masters can manage daily_report_disposal_items" ON "public"."daily_report_disposal_items" TO "authenticated" USING ("public"."can_edit_report"("report_id")) WITH CHECK ("public"."can_edit_report"("report_id"));



CREATE POLICY "owners or masters can manage daily_report_external_workers" ON "public"."daily_report_external_workers" TO "authenticated" USING ("public"."can_edit_report"("report_id")) WITH CHECK ("public"."can_edit_report"("report_id"));



CREATE POLICY "owners or masters can manage daily_report_lease_items" ON "public"."daily_report_lease_items" TO "authenticated" USING ("public"."can_edit_report"("report_id")) WITH CHECK ("public"."can_edit_report"("report_id"));



CREATE POLICY "owners or masters can manage daily_report_machines" ON "public"."daily_report_machines" TO "authenticated" USING ("public"."can_edit_report"("report_id")) WITH CHECK ("public"."can_edit_report"("report_id"));



CREATE POLICY "owners or masters can manage daily_report_partner_companies" ON "public"."daily_report_partner_companies" TO "authenticated" USING ("public"."can_edit_report"("report_id")) WITH CHECK ("public"."can_edit_report"("report_id"));



CREATE POLICY "owners or masters can manage daily_report_safety_items" ON "public"."daily_report_safety_items" TO "authenticated" USING ("public"."can_edit_report"("report_id")) WITH CHECK ("public"."can_edit_report"("report_id"));



CREATE POLICY "owners or masters can manage daily_report_transport_items" ON "public"."daily_report_transport_items" TO "authenticated" USING ("public"."can_edit_report"("report_id")) WITH CHECK ("public"."can_edit_report"("report_id"));



CREATE POLICY "owners or masters can manage daily_report_vehicles" ON "public"."daily_report_vehicles" TO "authenticated" USING ("public"."can_edit_report"("report_id")) WITH CHECK ("public"."can_edit_report"("report_id"));



CREATE POLICY "owners or masters can manage daily_report_waste_items" ON "public"."daily_report_waste_items" TO "authenticated" USING ("public"."can_edit_report"("report_id")) WITH CHECK ("public"."can_edit_report"("report_id"));



CREATE POLICY "owners or masters can manage daily_report_work_items" ON "public"."daily_report_work_items" TO "authenticated" USING ("public"."can_edit_report"("report_id")) WITH CHECK ("public"."can_edit_report"("report_id"));



CREATE POLICY "owners or masters can manage daily_report_workers" ON "public"."daily_report_workers" TO "authenticated" USING ("public"."can_edit_report"("report_id")) WITH CHECK ("public"."can_edit_report"("report_id"));



CREATE POLICY "owners or masters can manage report_edit_logs" ON "public"."report_edit_logs" TO "authenticated" USING ("public"."can_edit_report"("report_id")) WITH CHECK ("public"."can_edit_report"("report_id"));



CREATE POLICY "owners or masters can manage report_photos" ON "public"."report_photos" TO "authenticated" USING ("public"."can_edit_report"("report_id")) WITH CHECK ("public"."can_edit_report"("report_id"));



CREATE POLICY "owners or masters can update daily_reports" ON "public"."daily_reports" FOR UPDATE TO "authenticated" USING ("public"."can_edit_report"("id")) WITH CHECK ((("created_by" = "auth"."uid"()) OR "public"."is_master_user"()));



ALTER TABLE "public"."partner_companies" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."report_edit_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."report_photos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."safety_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sites" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."transport_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "users can insert own app_user or masters can insert all" ON "public"."app_users" FOR INSERT TO "authenticated" WITH CHECK ((("user_id" = "auth"."uid"()) OR "public"."is_master_user"()));



CREATE POLICY "users can read own app_user or masters can read all" ON "public"."app_users" FOR SELECT TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR "public"."is_master_user"()));



CREATE POLICY "users can update own app_user or masters can update all" ON "public"."app_users" FOR UPDATE TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR "public"."is_master_user"())) WITH CHECK ((("user_id" = "auth"."uid"()) OR "public"."is_master_user"()));



ALTER TABLE "public"."vehicles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."waste_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."work_categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."work_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."worker_labels" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."workers" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































GRANT ALL ON FUNCTION "public"."can_edit_report"("target_report" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_edit_report"("target_report" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_edit_report"("target_report" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_master_user"("target_user" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_master_user"("target_user" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_master_user"("target_user" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."save_daily_report"("p_report_id" "uuid", "p_site_id" "uuid", "p_report_date" "date", "p_worker_count" integer, "p_work_shift" "text", "p_contract_type" "text", "p_miscellaneous_costs" "text", "p_other_vehicle_entries" "jsonb", "p_other_workers_note" "text", "p_remarks" "text", "p_progress_status" "text", "p_worker_ids" "uuid"[], "p_lease_entries" "jsonb", "p_disposal_entries" "jsonb", "p_transport_entries" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."save_daily_report"("p_report_id" "uuid", "p_site_id" "uuid", "p_report_date" "date", "p_worker_count" integer, "p_work_shift" "text", "p_contract_type" "text", "p_miscellaneous_costs" "text", "p_other_vehicle_entries" "jsonb", "p_other_workers_note" "text", "p_remarks" "text", "p_progress_status" "text", "p_worker_ids" "uuid"[], "p_lease_entries" "jsonb", "p_disposal_entries" "jsonb", "p_transport_entries" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."save_daily_report"("p_report_id" "uuid", "p_site_id" "uuid", "p_report_date" "date", "p_worker_count" integer, "p_work_shift" "text", "p_contract_type" "text", "p_miscellaneous_costs" "text", "p_other_vehicle_entries" "jsonb", "p_other_workers_note" "text", "p_remarks" "text", "p_progress_status" "text", "p_worker_ids" "uuid"[], "p_lease_entries" "jsonb", "p_disposal_entries" "jsonb", "p_transport_entries" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."save_daily_report"("p_report_id" "uuid", "p_site_id" "uuid", "p_work_category_id" "uuid", "p_report_date" "date", "p_worker_count" integer, "p_work_shift" "text", "p_contract_type" "text", "p_miscellaneous_costs" "text", "p_other_vehicle_entries" "jsonb", "p_other_workers_note" "text", "p_remarks" "text", "p_progress_status" "text", "p_worker_ids" "uuid"[], "p_lease_entries" "jsonb", "p_disposal_entries" "jsonb", "p_transport_entries" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."save_daily_report"("p_report_id" "uuid", "p_site_id" "uuid", "p_work_category_id" "uuid", "p_report_date" "date", "p_worker_count" integer, "p_work_shift" "text", "p_contract_type" "text", "p_miscellaneous_costs" "text", "p_other_vehicle_entries" "jsonb", "p_other_workers_note" "text", "p_remarks" "text", "p_progress_status" "text", "p_worker_ids" "uuid"[], "p_lease_entries" "jsonb", "p_disposal_entries" "jsonb", "p_transport_entries" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."save_daily_report"("p_report_id" "uuid", "p_site_id" "uuid", "p_work_category_id" "uuid", "p_report_date" "date", "p_worker_count" integer, "p_work_shift" "text", "p_contract_type" "text", "p_miscellaneous_costs" "text", "p_other_vehicle_entries" "jsonb", "p_other_workers_note" "text", "p_remarks" "text", "p_progress_status" "text", "p_worker_ids" "uuid"[], "p_lease_entries" "jsonb", "p_disposal_entries" "jsonb", "p_transport_entries" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."save_daily_report"("p_report_id" "uuid", "p_site_id" "uuid", "p_work_category_id" "uuid", "p_report_date" "date", "p_reporter_name" "text", "p_worker_count" integer, "p_work_shift" "text", "p_contract_type" "text", "p_miscellaneous_costs" "text", "p_other_vehicle_entries" "jsonb", "p_work_description" "text", "p_other_workers_note" "text", "p_remarks" "text", "p_progress_status" "text", "p_worker_ids" "uuid"[], "p_external_worker_entries" "jsonb", "p_lease_entries" "jsonb", "p_disposal_entries" "jsonb", "p_transport_entries" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."save_daily_report"("p_report_id" "uuid", "p_site_id" "uuid", "p_work_category_id" "uuid", "p_report_date" "date", "p_reporter_name" "text", "p_worker_count" integer, "p_work_shift" "text", "p_contract_type" "text", "p_miscellaneous_costs" "text", "p_other_vehicle_entries" "jsonb", "p_work_description" "text", "p_other_workers_note" "text", "p_remarks" "text", "p_progress_status" "text", "p_worker_ids" "uuid"[], "p_external_worker_entries" "jsonb", "p_lease_entries" "jsonb", "p_disposal_entries" "jsonb", "p_transport_entries" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."save_daily_report"("p_report_id" "uuid", "p_site_id" "uuid", "p_work_category_id" "uuid", "p_report_date" "date", "p_reporter_name" "text", "p_worker_count" integer, "p_work_shift" "text", "p_contract_type" "text", "p_miscellaneous_costs" "text", "p_other_vehicle_entries" "jsonb", "p_work_description" "text", "p_other_workers_note" "text", "p_remarks" "text", "p_progress_status" "text", "p_worker_ids" "uuid"[], "p_external_worker_entries" "jsonb", "p_lease_entries" "jsonb", "p_disposal_entries" "jsonb", "p_transport_entries" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."save_daily_report"("p_report_id" "uuid", "p_site_id" "uuid", "p_site_name" "text", "p_work_category_id" "uuid", "p_report_date" "date", "p_reporter_name" "text", "p_worker_count" integer, "p_work_shift" "text", "p_contract_type" "text", "p_miscellaneous_costs" "text", "p_other_vehicle_entries" "jsonb", "p_work_description" "text", "p_other_workers_note" "text", "p_remarks" "text", "p_progress_status" "text", "p_worker_ids" "uuid"[], "p_external_worker_entries" "jsonb", "p_lease_entries" "jsonb", "p_disposal_entries" "jsonb", "p_transport_entries" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."save_daily_report"("p_report_id" "uuid", "p_site_id" "uuid", "p_site_name" "text", "p_work_category_id" "uuid", "p_report_date" "date", "p_reporter_name" "text", "p_worker_count" integer, "p_work_shift" "text", "p_contract_type" "text", "p_miscellaneous_costs" "text", "p_other_vehicle_entries" "jsonb", "p_work_description" "text", "p_other_workers_note" "text", "p_remarks" "text", "p_progress_status" "text", "p_worker_ids" "uuid"[], "p_external_worker_entries" "jsonb", "p_lease_entries" "jsonb", "p_disposal_entries" "jsonb", "p_transport_entries" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."save_daily_report"("p_report_id" "uuid", "p_site_id" "uuid", "p_site_name" "text", "p_work_category_id" "uuid", "p_report_date" "date", "p_reporter_name" "text", "p_worker_count" integer, "p_work_shift" "text", "p_contract_type" "text", "p_miscellaneous_costs" "text", "p_other_vehicle_entries" "jsonb", "p_work_description" "text", "p_other_workers_note" "text", "p_remarks" "text", "p_progress_status" "text", "p_worker_ids" "uuid"[], "p_external_worker_entries" "jsonb", "p_lease_entries" "jsonb", "p_disposal_entries" "jsonb", "p_transport_entries" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";


















GRANT ALL ON TABLE "public"."app_users" TO "anon";
GRANT ALL ON TABLE "public"."app_users" TO "authenticated";
GRANT ALL ON TABLE "public"."app_users" TO "service_role";



GRANT ALL ON TABLE "public"."daily_report_disposal_items" TO "anon";
GRANT ALL ON TABLE "public"."daily_report_disposal_items" TO "authenticated";
GRANT ALL ON TABLE "public"."daily_report_disposal_items" TO "service_role";



GRANT ALL ON TABLE "public"."daily_report_external_workers" TO "anon";
GRANT ALL ON TABLE "public"."daily_report_external_workers" TO "authenticated";
GRANT ALL ON TABLE "public"."daily_report_external_workers" TO "service_role";



GRANT ALL ON TABLE "public"."daily_report_lease_items" TO "anon";
GRANT ALL ON TABLE "public"."daily_report_lease_items" TO "authenticated";
GRANT ALL ON TABLE "public"."daily_report_lease_items" TO "service_role";



GRANT ALL ON TABLE "public"."daily_report_machines" TO "anon";
GRANT ALL ON TABLE "public"."daily_report_machines" TO "authenticated";
GRANT ALL ON TABLE "public"."daily_report_machines" TO "service_role";



GRANT ALL ON TABLE "public"."daily_report_partner_companies" TO "anon";
GRANT ALL ON TABLE "public"."daily_report_partner_companies" TO "authenticated";
GRANT ALL ON TABLE "public"."daily_report_partner_companies" TO "service_role";



GRANT ALL ON TABLE "public"."daily_report_safety_items" TO "anon";
GRANT ALL ON TABLE "public"."daily_report_safety_items" TO "authenticated";
GRANT ALL ON TABLE "public"."daily_report_safety_items" TO "service_role";



GRANT ALL ON TABLE "public"."daily_report_transport_items" TO "anon";
GRANT ALL ON TABLE "public"."daily_report_transport_items" TO "authenticated";
GRANT ALL ON TABLE "public"."daily_report_transport_items" TO "service_role";



GRANT ALL ON TABLE "public"."daily_report_vehicles" TO "anon";
GRANT ALL ON TABLE "public"."daily_report_vehicles" TO "authenticated";
GRANT ALL ON TABLE "public"."daily_report_vehicles" TO "service_role";



GRANT ALL ON TABLE "public"."daily_report_waste_items" TO "anon";
GRANT ALL ON TABLE "public"."daily_report_waste_items" TO "authenticated";
GRANT ALL ON TABLE "public"."daily_report_waste_items" TO "service_role";



GRANT ALL ON TABLE "public"."daily_report_work_items" TO "anon";
GRANT ALL ON TABLE "public"."daily_report_work_items" TO "authenticated";
GRANT ALL ON TABLE "public"."daily_report_work_items" TO "service_role";



GRANT ALL ON TABLE "public"."daily_report_workers" TO "anon";
GRANT ALL ON TABLE "public"."daily_report_workers" TO "authenticated";
GRANT ALL ON TABLE "public"."daily_report_workers" TO "service_role";



GRANT ALL ON TABLE "public"."daily_reports" TO "anon";
GRANT ALL ON TABLE "public"."daily_reports" TO "authenticated";
GRANT ALL ON TABLE "public"."daily_reports" TO "service_role";



GRANT ALL ON TABLE "public"."disposal_items" TO "anon";
GRANT ALL ON TABLE "public"."disposal_items" TO "authenticated";
GRANT ALL ON TABLE "public"."disposal_items" TO "service_role";



GRANT ALL ON TABLE "public"."lease_items" TO "anon";
GRANT ALL ON TABLE "public"."lease_items" TO "authenticated";
GRANT ALL ON TABLE "public"."lease_items" TO "service_role";



GRANT ALL ON TABLE "public"."machines" TO "anon";
GRANT ALL ON TABLE "public"."machines" TO "authenticated";
GRANT ALL ON TABLE "public"."machines" TO "service_role";



GRANT ALL ON TABLE "public"."partner_companies" TO "anon";
GRANT ALL ON TABLE "public"."partner_companies" TO "authenticated";
GRANT ALL ON TABLE "public"."partner_companies" TO "service_role";



GRANT ALL ON TABLE "public"."report_edit_logs" TO "anon";
GRANT ALL ON TABLE "public"."report_edit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."report_edit_logs" TO "service_role";



GRANT ALL ON TABLE "public"."report_photos" TO "anon";
GRANT ALL ON TABLE "public"."report_photos" TO "authenticated";
GRANT ALL ON TABLE "public"."report_photos" TO "service_role";



GRANT ALL ON TABLE "public"."safety_items" TO "anon";
GRANT ALL ON TABLE "public"."safety_items" TO "authenticated";
GRANT ALL ON TABLE "public"."safety_items" TO "service_role";



GRANT ALL ON TABLE "public"."sites" TO "anon";
GRANT ALL ON TABLE "public"."sites" TO "authenticated";
GRANT ALL ON TABLE "public"."sites" TO "service_role";



GRANT ALL ON TABLE "public"."transport_items" TO "anon";
GRANT ALL ON TABLE "public"."transport_items" TO "authenticated";
GRANT ALL ON TABLE "public"."transport_items" TO "service_role";



GRANT ALL ON TABLE "public"."vehicles" TO "anon";
GRANT ALL ON TABLE "public"."vehicles" TO "authenticated";
GRANT ALL ON TABLE "public"."vehicles" TO "service_role";



GRANT ALL ON TABLE "public"."waste_items" TO "anon";
GRANT ALL ON TABLE "public"."waste_items" TO "authenticated";
GRANT ALL ON TABLE "public"."waste_items" TO "service_role";



GRANT ALL ON TABLE "public"."work_categories" TO "anon";
GRANT ALL ON TABLE "public"."work_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."work_categories" TO "service_role";



GRANT ALL ON TABLE "public"."work_items" TO "anon";
GRANT ALL ON TABLE "public"."work_items" TO "authenticated";
GRANT ALL ON TABLE "public"."work_items" TO "service_role";



GRANT ALL ON TABLE "public"."worker_labels" TO "anon";
GRANT ALL ON TABLE "public"."worker_labels" TO "authenticated";
GRANT ALL ON TABLE "public"."worker_labels" TO "service_role";



GRANT ALL ON TABLE "public"."workers" TO "anon";
GRANT ALL ON TABLE "public"."workers" TO "authenticated";
GRANT ALL ON TABLE "public"."workers" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";
































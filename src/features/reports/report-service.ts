import { supabase } from "@/lib/supabase";
import { storageService } from "@/lib/storage-service";
import type {
  DailyReport,
  DailyReportDetail,
  MasterItem,
  ReportFormValues,
  ReportListFilters,
  ReportPhoto,
  Site,
} from "@/types/database";

type JoinRow = { id: string; name: string; sort_order: number; is_active: boolean; created_at?: string; updated_at?: string };

function mapJoinedItems(rows: Array<Record<string, JoinRow | JoinRow[] | null>>, key: string) {
  return rows
    .flatMap((row) => {
      const value = row[key];
      if (!value) {
        return [];
      }
      return Array.isArray(value) ? value : [value];
    })
    .filter((row): row is JoinRow => Boolean(row));
}

export async function listReports(filters: ReportListFilters = {}) {
  let query = supabase
    .from("daily_reports")
    .select("*, sites(*)")
    .order("report_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (filters.from) {
    query = query.gte("report_date", filters.from);
  }
  if (filters.to) {
    query = query.lte("report_date", filters.to);
  }
  if (filters.siteId) {
    query = query.eq("site_id", filters.siteId);
  }

  const { data, error } = await query;
  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => ({
    ...(row as DailyReport),
    site: (row as { sites: Site | null }).sites,
  })) as Array<DailyReport & { site: Site | null }>;
}

export async function getReportDetail(id: string): Promise<DailyReportDetail> {
  const [{ data: report, error: reportError }, workResult, wasteResult, safetyResult, workerResult, machineResult, vehicleResult, partnerResult, photoResult] = await Promise.all([
    supabase.from("daily_reports").select("*, sites(*)").eq("id", id).single(),
    supabase
      .from("daily_report_work_items")
      .select("work_items(*)")
      .eq("report_id", id),
    supabase
      .from("daily_report_waste_items")
      .select("waste_items(*)")
      .eq("report_id", id),
    supabase
      .from("daily_report_safety_items")
      .select("safety_items(*)")
      .eq("report_id", id),
    supabase
      .from("daily_report_workers")
      .select("workers(*)")
      .eq("report_id", id),
    supabase
      .from("daily_report_machines")
      .select("machines(*)")
      .eq("report_id", id),
    supabase
      .from("daily_report_vehicles")
      .select("vehicles(*)")
      .eq("report_id", id),
    supabase
      .from("daily_report_partner_companies")
      .select("partner_companies(*)")
      .eq("report_id", id),
    supabase.from("report_photos").select("*").eq("report_id", id).order("created_at"),
  ]);

  if (reportError) {
    throw reportError;
  }
  if (workResult.error) {
    throw workResult.error;
  }
  if (wasteResult.error) {
    throw wasteResult.error;
  }
  if (safetyResult.error) {
    throw safetyResult.error;
  }
  if (workerResult.error) {
    throw workerResult.error;
  }
  if (machineResult.error) {
    throw machineResult.error;
  }
  if (vehicleResult.error) {
    throw vehicleResult.error;
  }
  if (partnerResult.error) {
    throw partnerResult.error;
  }
  if (photoResult.error) {
    throw photoResult.error;
  }

  return {
    ...(report as DailyReport),
    site: (report as { sites: Site | null }).sites,
    work_items: mapJoinedItems(
      (workResult.data ?? []) as unknown as Array<Record<string, JoinRow | JoinRow[] | null>>,
      "work_items",
    ) as MasterItem[],
    waste_items: mapJoinedItems(
      (wasteResult.data ?? []) as unknown as Array<Record<string, JoinRow | JoinRow[] | null>>,
      "waste_items",
    ) as MasterItem[],
    safety_items: mapJoinedItems(
      (safetyResult.data ?? []) as unknown as Array<Record<string, JoinRow | JoinRow[] | null>>,
      "safety_items",
    ) as MasterItem[],
    workers: mapJoinedItems(
      (workerResult.data ?? []) as unknown as Array<Record<string, JoinRow | JoinRow[] | null>>,
      "workers",
    ) as MasterItem[],
    machines: mapJoinedItems(
      (machineResult.data ?? []) as unknown as Array<Record<string, JoinRow | JoinRow[] | null>>,
      "machines",
    ) as MasterItem[],
    vehicles: mapJoinedItems(
      (vehicleResult.data ?? []) as unknown as Array<Record<string, JoinRow | JoinRow[] | null>>,
      "vehicles",
    ) as MasterItem[],
    partner_companies: mapJoinedItems(
      (partnerResult.data ?? []) as unknown as Array<Record<string, JoinRow | JoinRow[] | null>>,
      "partner_companies",
    ) as MasterItem[],
    photos: (photoResult.data ?? []) as ReportPhoto[],
  };
}

async function replaceReportRelations(reportId: string, table: string, columnName: string, ids: string[]) {
  const { error: deleteError } = await supabase.from(table).delete().eq("report_id", reportId);
  if (deleteError) {
    throw deleteError;
  }

  if (ids.length === 0) {
    return;
  }

  const { error: insertError } = await supabase
    .from(table)
    .insert(ids.map((itemId) => ({ report_id: reportId, [columnName]: itemId })));

  if (insertError) {
    throw insertError;
  }
}

export async function saveReport(
  values: ReportFormValues,
  userId: string,
  reportId?: string,
  newFiles: File[] = [],
) {
  const payload = {
    id: reportId,
    site_id: values.site_id,
    report_date: values.report_date,
    worker_count: values.worker_count,
    tomorrow_plan: values.tomorrow_plan || null,
    note: values.note || null,
    created_by: userId,
  };

  const { data, error } = await supabase.from("daily_reports").upsert(payload, { onConflict: "id" }).select().single();
  if (error) {
    throw error;
  }

  const savedReportId = data.id as string;

  await Promise.all([
    replaceReportRelations(savedReportId, "daily_report_work_items", "work_item_id", values.work_item_ids),
    replaceReportRelations(savedReportId, "daily_report_waste_items", "waste_item_id", values.waste_item_ids),
    replaceReportRelations(savedReportId, "daily_report_safety_items", "safety_item_id", values.safety_item_ids),
    replaceReportRelations(savedReportId, "daily_report_workers", "worker_id", values.worker_ids),
    replaceReportRelations(savedReportId, "daily_report_machines", "machine_id", values.machine_ids),
    replaceReportRelations(savedReportId, "daily_report_vehicles", "vehicle_id", values.vehicle_ids),
    replaceReportRelations(
      savedReportId,
      "daily_report_partner_companies",
      "partner_company_id",
      values.partner_company_ids,
    ),
  ]);

  if (newFiles.length > 0) {
    const uploadedPaths = await Promise.all(
      newFiles.map((file) => storageService.uploadReportPhoto(file, savedReportId)),
    );
    const { error: photoInsertError } = await supabase.from("report_photos").insert(
      uploadedPaths.map((image_path) => ({
        report_id: savedReportId,
        image_path,
      })),
    );
    if (photoInsertError) {
      throw photoInsertError;
    }
  }

  return savedReportId;
}

export async function deletePhoto(photo: ReportPhoto) {
  await storageService.removePhoto(photo.image_path);
  const { error } = await supabase.from("report_photos").delete().eq("id", photo.id);
  if (error) {
    throw error;
  }
}

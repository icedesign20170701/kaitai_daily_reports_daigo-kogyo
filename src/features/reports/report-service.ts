import { supabase } from "@/lib/supabase";
import { storageService } from "@/lib/storage-service";
import type {
  DailyReport,
  DailyReportDetail,
  MasterItem,
  OtherVehicleEntry,
  ReportExternalWorkerEntry,
  ReportEditLog,
  ReportFormValues,
  ReportListFilters,
  ReportPhoto,
  ReportWorker,
  Site,
} from "@/types/database";

export type SaveReportResult = {
  reportId: string;
  uploadErrors: string[];
};

function normalizeJoinedItem(value: MasterItem | MasterItem[] | null | undefined) {
  if (!value) {
    return null;
  }
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function normalizeReportSaveError(error: unknown) {
  if (!error || typeof error !== "object") {
    return error;
  }

  const status = "status" in error ? error.status : undefined;
  const code = "code" in error ? error.code : undefined;
  const message = "message" in error && typeof error.message === "string" ? error.message : "";

  if (
    status === 404 ||
    code === "PGRST202" ||
    message.includes("save_daily_report") ||
    message.includes("Could not find the function public.save_daily_report")
  ) {
    return new Error("保存処理の Supabase 関数が未反映です。最新の src/supabase.sql を再実行してください。");
  }

  return error;
}

function displayReportSiteName(report: { site?: Site | null; site_name?: string | null }) {
  return report.site_name?.trim() || report.site?.name || "";
}

export async function listReports(filters: ReportListFilters = {}) {
  let query = supabase
    .from("daily_reports")
    .select("*, sites(*), work_categories(*)")
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
  if (filters.workCategoryId) {
    query = query.eq("work_category_id", filters.workCategoryId);
  }
  if (filters.createdBy) {
    query = query.eq("created_by", filters.createdBy);
  }

  const { data, error } = await query;
  if (error) {
    throw error;
  }

  const creatorIds = Array.from(new Set((data ?? []).map((row) => (row as { created_by: string }).created_by)));
  const { data: appUsers } =
    creatorIds.length > 0
      ? await supabase.from("app_users").select("user_id, display_name").in("user_id", creatorIds)
      : { data: [] as Array<{ user_id: string; display_name: string | null }> };
  const displayNameMap = new Map((appUsers ?? []).map((item) => [item.user_id, item.display_name ?? null]));

  return (data ?? []).map((row) => ({
    ...(row as Omit<DailyReport, "other_vehicle_entries">),
    other_vehicle_entries: (((row as { other_vehicle_entries?: OtherVehicleEntry[] | null }).other_vehicle_entries ?? []) as OtherVehicleEntry[]),
    site: (row as { sites: Site | null }).sites,
    site_name: (row as { site_name?: string | null }).site_name ?? null,
    work_category: (row as { work_categories?: MasterItem | null }).work_categories ?? null,
    reporter_name: (row as { reporter_name?: string | null }).reporter_name ?? null,
    creator_display_name: displayNameMap.get((row as { created_by: string }).created_by) ?? null,
  })) as Array<DailyReport & { site: Site | null; creator_display_name?: string | null }>;
}

export async function getReportDetail(id: string): Promise<DailyReportDetail> {
  const [reportResult, workerResult, externalWorkerResult, leaseResult, disposalResult, transportResult, photoResult, editLogResult] = await Promise.all([
    supabase.from("daily_reports").select("*, sites(*), work_categories(*)").eq("id", id).single(),
    supabase.from("daily_report_workers").select("label_snapshot, unit_price_snapshot, workers(*)").eq("report_id", id),
    supabase.from("daily_report_external_workers").select("id, worker_label_id, label_snapshot, count, unit_price_snapshot, worker_labels(*)").eq("report_id", id),
    supabase.from("daily_report_lease_items").select("id, lease_item_id, item_name, count, lease_items(*)").eq("report_id", id).order("created_at"),
    supabase
      .from("daily_report_disposal_items")
      .select("id, disposal_item_id, waste_type, other_label, ton_count, ton_unit, truck_count, disposal_items(*)")
      .eq("report_id", id)
      .order("created_at"),
    supabase
      .from("daily_report_transport_items")
      .select("id, transport_item_id, count, transport_items(*)")
      .eq("report_id", id)
      .order("created_at"),
    supabase.from("report_photos").select("*").eq("report_id", id).order("created_at"),
    supabase.from("report_edit_logs").select("*").eq("report_id", id).order("edited_at", { ascending: false }).limit(3),
  ]);

  if (reportResult.error) throw reportResult.error;
  if (workerResult.error) throw workerResult.error;
  if (externalWorkerResult.error) throw externalWorkerResult.error;
  if (leaseResult.error) throw leaseResult.error;
  if (disposalResult.error) throw disposalResult.error;
  if (transportResult.error) throw transportResult.error;
  if (photoResult.error) throw photoResult.error;
  if (editLogResult.error) throw editLogResult.error;

  const report = reportResult.data as Omit<DailyReport, "other_vehicle_entries"> & { sites: Site | null; work_categories?: MasterItem | null; other_vehicle_entries?: OtherVehicleEntry[] | null };
  const editorIds = Array.from(new Set([report.created_by, ...((editLogResult.data ?? []) as Array<{ edited_by: string }>).map((log) => log.edited_by)]));
  const { data: appUsers } = await supabase.from("app_users").select("user_id, display_name").in("user_id", editorIds);
  const displayNameMap = new Map((appUsers ?? []).map((user) => [user.user_id, user.display_name ?? null]));

  return {
    ...report,
    other_vehicle_entries: (report.other_vehicle_entries ?? []) as OtherVehicleEntry[],
    site: report.sites,
    site_name: report.site_name ?? null,
    work_category: report.work_categories ?? null,
    reporter_name: report.reporter_name ?? null,
    creator_display_name: displayNameMap.get(report.created_by) ?? null,
    workers: ((workerResult.data ?? []) as Array<{
      label_snapshot: string | null;
      unit_price_snapshot: number | null;
      workers: MasterItem | MasterItem[] | null;
    }>)
      .map((row) => {
        const worker = normalizeJoinedItem(row.workers);
        if (!worker) {
          return null;
        }
        return {
          ...worker,
          label_snapshot: row.label_snapshot,
          unit_price_snapshot: row.unit_price_snapshot,
        } satisfies ReportWorker;
      })
      .filter(Boolean) as ReportWorker[],
    external_worker_entries: ((externalWorkerResult.data ?? []) as Array<{
      id: string;
      worker_label_id: string;
      label_snapshot: string;
      count: number;
      unit_price_snapshot: number;
      worker_labels: MasterItem | MasterItem[] | null;
    }>).map((row) => ({
      id: row.id,
      worker_label_id: row.worker_label_id,
      label_snapshot: row.label_snapshot,
      count: row.count,
      unit_price_snapshot: row.unit_price_snapshot,
      item: normalizeJoinedItem(row.worker_labels),
    })) as ReportExternalWorkerEntry[],
    lease_entries: ((leaseResult.data ?? []) as Array<{ id: string; lease_item_id: string | null; item_name: string | null; count: number; lease_items: MasterItem | MasterItem[] | null }>).map((row) => ({
      id: row.id,
      lease_item_id: row.lease_item_id,
      label: row.item_name ?? normalizeJoinedItem(row.lease_items)?.name ?? "",
      count: row.count,
      item: normalizeJoinedItem(row.lease_items),
    })),
    disposal_entries: ((disposalResult.data ?? []) as Array<{
      id: string;
      disposal_item_id: string;
      waste_type: "wood" | "board" | "rubble" | "scrap" | "mixed" | "asbestos" | "other";
      other_label: string | null;
      ton_count: number;
      ton_unit: string | null;
      truck_count: number;
      disposal_items: MasterItem | MasterItem[] | null;
    }>).map((row) => ({
      id: row.id,
      disposal_item_id: row.disposal_item_id,
      waste_type: row.waste_type,
      other_label: row.other_label ?? "",
      ton_count: row.ton_count,
      ton_unit: row.ton_unit ?? "TC",
      truck_count: row.truck_count,
      item: normalizeJoinedItem(row.disposal_items),
    })),
    transport_entries: ((transportResult.data ?? []) as Array<{
      id: string;
      transport_item_id: string;
      count: number;
      transport_items: MasterItem | MasterItem[] | null;
    }>).map((row) => ({
      id: row.id,
      transport_item_id: row.transport_item_id,
      count: row.count,
      item: normalizeJoinedItem(row.transport_items),
    })),
    photos: (photoResult.data ?? []) as ReportPhoto[],
    edit_logs: ((editLogResult.data ?? []) as Array<{ id: string; report_id: string; edited_by: string; edited_at: string }>).map(
      (log) =>
        ({
          ...log,
          editor_display_name: displayNameMap.get(log.edited_by) ?? null,
        }) satisfies ReportEditLog,
    ),
  };
}

export async function saveReport(values: ReportFormValues, _userId: string, reportId?: string, newFiles: File[] = []): Promise<SaveReportResult> {
  const otherVehicleEntries = values.other_vehicle_entries.filter((entry) => entry.label.trim() && entry.count > 0);
  const disposalEntries = values.disposal_entries.map((entry) => ({
    ...entry,
    ton_unit: entry.ton_unit?.trim() || "TC",
  }));
  const siteId = values.site_id === "__manual__" ? null : values.site_id || null;

  const { data, error } = await supabase.rpc("save_daily_report", {
    p_report_id: reportId ?? null,
    p_site_id: siteId,
    p_site_name: values.site_name || null,
    p_work_category_id: values.work_category_id,
    p_report_date: values.report_date,
    p_reporter_name: values.reporter_name || null,
    p_worker_count: values.worker_count,
    p_work_shift: values.work_shift,
    p_contract_type: values.contract_type,
    p_miscellaneous_costs: values.miscellaneous_costs || null,
    p_other_vehicle_entries: otherVehicleEntries,
    p_work_description: values.work_description || null,
    p_other_workers_note: values.other_workers_note || null,
    p_remarks: values.remarks || null,
    p_progress_status: values.progress_status,
    p_worker_ids: values.worker_ids,
    p_external_worker_entries: values.external_worker_entries,
    p_lease_entries: values.lease_entries,
    p_disposal_entries: disposalEntries,
    p_transport_entries: values.transport_entries,
  });
  if (error) throw normalizeReportSaveError(error);

  const savedReportId = data as string;
  const uploadErrors: string[] = [];

  if (newFiles.length > 0) {
    const uploadResults = await Promise.allSettled(newFiles.map((file) => storageService.uploadReportPhoto(file, savedReportId)));
    const uploadedUrls = uploadResults.flatMap((result) => (result.status === "fulfilled" ? [result.value] : []));
    const failedCount = uploadResults.length - uploadedUrls.length;

    if (uploadedUrls.length > 0) {
      const { error: photoInsertError } = await supabase.from("report_photos").insert(
        uploadedUrls.map((image_path) => ({
          report_id: savedReportId,
          image_path,
        })),
      );
      if (photoInsertError) {
        uploadErrors.push("写真URLの保存に失敗しました");
      }
    }

    if (failedCount > 0) {
      const errorMessages = Array.from(
        new Set(
          uploadResults.flatMap((result) =>
            result.status === "rejected" && result.reason instanceof Error ? [result.reason.message] : [],
          ),
        ),
      );
      uploadErrors.push(`${failedCount}件の写真アップロードに失敗しました${errorMessages.length > 0 ? `: ${errorMessages.join(" / ")}` : ""}`);
    }
  }

  return { reportId: savedReportId, uploadErrors };
}

export { displayReportSiteName };

export async function deletePhoto(photo: ReportPhoto) {
  const { error } = await supabase.from("report_photos").delete().eq("id", photo.id);
  if (error) throw error;

  try {
    await storageService.removePhoto(photo.image_path);
  } catch {
    throw new Error("DBから写真を削除しましたが、外部ファイルの削除に失敗しました。");
  }
}

export async function deleteReport(reportId: string) {
  const detail = await getReportDetail(reportId);

  const { error } = await supabase.from("daily_reports").delete().eq("id", reportId);
  if (error) throw error;

  const removeResults = await Promise.allSettled(detail.photos.map((photo) => storageService.removePhoto(photo.image_path)));
  if (removeResults.some((result) => result.status === "rejected")) {
    throw new Error("日報は削除しましたが、一部の外部画像削除に失敗しました。");
  }
}

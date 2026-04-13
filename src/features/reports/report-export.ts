import { getReportDetail } from "@/features/reports/report-service";
import { downloadTextFile, formatDate } from "@/lib/utils";
import type { DailyReport, Site } from "@/types/database";

function csvEscape(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

function vehicleSummary(report: Awaited<ReturnType<typeof getReportDetail>>) {
  return [
    ...report.transport_entries.filter((entry) => entry.count > 0).map((entry) => `${entry.item?.name ?? "未設定"}:${entry.count}台`),
    ...report.other_vehicle_entries.filter((entry) => entry.label.trim() && entry.count > 0).map((entry) => `${entry.label}:${entry.count}台`),
  ].join(" / ");
}

function disposalTypeLabel(value: "wood" | "board" | "rubble" | "scrap" | "mixed" | "other") {
  switch (value) {
    case "wood":
      return "木類";
    case "board":
      return "ボード";
    case "rubble":
      return "ガラ";
    case "scrap":
      return "スクラップ";
    case "mixed":
      return "混載";
    case "other":
      return "その他";
  }
}

export async function exportReportsCsv(reports: Array<DailyReport & { site: Site | null }>) {
  const details = await Promise.all(reports.map((report) => getReportDetail(report.id)));
  const lines = [
    [
      "作業日",
      "現場名",
      "工事分類",
      "勤務区分",
      "契約区分",
      "作業人数",
      "作業進行",
      "作業員",
      "上記以外の従業員",
      "諸経費",
      "リース",
      "ゴミ処分",
      "車両・運搬",
      "備考",
    ].join(","),
    ...details.map((report) =>
      [
        formatDate(report.report_date),
        csvEscape(report.site?.name ?? ""),
        csvEscape(report.work_category?.name ?? ""),
        csvEscape(report.work_shift === "night" ? "夜勤" : "昼勤"),
        csvEscape(report.contract_type === "regular" ? "常用" : "請負"),
        report.worker_count.toString(),
        csvEscape(report.progress_status === "completed" ? "終了" : "継続"),
        csvEscape(report.workers.map((item) => `${item.group_label || "未分類"}:${item.name}`).join(" / ")),
        csvEscape(report.other_workers_note ?? ""),
        csvEscape(report.miscellaneous_costs ?? ""),
        csvEscape(
          report.lease_entries
            .filter((entry) => entry.count > 0)
            .map((entry) => `${entry.item?.name ?? "未設定"} / ${entry.label || "車両未設定"}:${entry.count}台`)
            .join("\n"),
        ),
        csvEscape(
          report.disposal_entries
            .filter((entry) => entry.ton_count > 0 || entry.truck_count > 0)
            .map((entry) => `${entry.item?.name ?? "未設定"} / ${entry.waste_type === "other" ? entry.other_label || "その他" : disposalTypeLabel(entry.waste_type)}:${entry.ton_count}T${entry.truck_count}台`)
            .join("\n"),
        ),
        csvEscape(vehicleSummary(report)),
        csvEscape(report.remarks ?? ""),
      ].join(","),
    ),
  ];

  downloadTextFile(`daily-reports-${new Date().toISOString().slice(0, 10)}.csv`, `\uFEFF${lines.join("\n")}`, "text/csv;charset=utf-8;");
}

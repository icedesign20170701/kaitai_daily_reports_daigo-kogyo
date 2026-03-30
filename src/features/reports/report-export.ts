import { formatDate, downloadTextFile } from "@/lib/utils";
import type { DailyReport, Site } from "@/types/database";
import { getReportDetail } from "@/features/reports/report-service";

export async function exportReportsCsv(reports: Array<DailyReport & { site: Site | null }>) {
  const details = await Promise.all(reports.map((report) => getReportDetail(report.id)));
  const lines = [
    ["日付", "現場名", "作業人数", "明日の予定", "補足メモ", "作業員", "重機", "車両", "協力会社"].join(","),
    ...details.map((report) =>
      [
        formatDate(report.report_date),
        csvEscape(report.site?.name ?? ""),
        report.worker_count.toString(),
        csvEscape(report.tomorrow_plan ?? ""),
        csvEscape(report.note ?? ""),
        csvEscape(report.workers.map((item) => item.name).join(" / ")),
        csvEscape(report.machines.map((item) => item.name).join(" / ")),
        csvEscape(report.vehicles.map((item) => item.name).join(" / ")),
        csvEscape(report.partner_companies.map((item) => item.name).join(" / ")),
      ].join(","),
    ),
  ];

  downloadTextFile(`daily-reports-${new Date().toISOString().slice(0, 10)}.csv`, `\uFEFF${lines.join("\n")}`, "text/csv;charset=utf-8;");
}

function csvEscape(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

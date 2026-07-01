import { displayReportSiteName, getReportDetail } from "@/features/reports/report-service";
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

function disposalTypeLabel(value: "wood" | "board" | "rubble" | "scrap" | "mixed" | "asbestos" | "other") {
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
    case "asbestos":
      return "アスベスト";
    case "other":
      return "その他";
  }
}

function workerSummary(report: Awaited<ReturnType<typeof getReportDetail>>) {
  return [
    ...report.workers.map((item) => `${item.label_snapshot || item.group_label || "未分類"}:${item.name}`),
    ...report.external_worker_entries.map((item) => `${item.label_snapshot || item.item?.name || "未分類"}:${item.count}人`),
  ].join(" / ");
}

function workerCostSummary(report: Awaited<ReturnType<typeof getReportDetail>>) {
  const grouped = new Map<string, { count: number; unitPrice: number }>();

  report.workers.forEach((worker) => {
    const label = worker.label_snapshot || worker.group_label || "未分類";
    const unitPrice = worker.unit_price_snapshot ?? 0;
    const current = grouped.get(label) ?? { count: 0, unitPrice };
    current.count += 1;
    grouped.set(label, current);
  });

  report.external_worker_entries.forEach((entry) => {
    const label = entry.label_snapshot || entry.item?.name || "未分類";
    const unitPrice = entry.unit_price_snapshot ?? entry.item?.unit_price ?? 0;
    const current = grouped.get(label) ?? { count: 0, unitPrice };
    current.count += entry.count;
    grouped.set(label, current);
  });

  return Array.from(grouped.entries()).map(([label, value]) => ({
    label,
    count: value.count,
    unitPrice: value.unitPrice,
    subtotal: value.count * value.unitPrice,
  }));
}

function workerCostTotal(report: Awaited<ReturnType<typeof getReportDetail>>) {
  return workerCostSummary(report).reduce((sum, row) => sum + row.subtotal, 0);
}

export async function exportReportsCsv(
  reports: Array<DailyReport & { site: Site | null }>,
  options?: { includeCosts?: boolean },
) {
  const details = await Promise.all(reports.map((report) => getReportDetail(report.id)));
  const includeCosts = options?.includeCosts === true;
  const periodWorkerTotal = details.reduce((sum, report) => sum + report.worker_count, 0);
  const periodLaborCostTotal = details.reduce((sum, report) => sum + workerCostTotal(report), 0);
  const periodLaborCostBreakdown = Array.from(
    details.reduce((map, report) => {
      workerCostSummary(report).forEach((row) => {
        const current = map.get(row.label) ?? { count: 0, subtotal: 0 };
        current.count += row.count;
        current.subtotal += row.subtotal;
        map.set(row.label, current);
      });
      return map;
    }, new Map<string, { count: number; subtotal: number }>()),
  );

  const headers = [
    "記入者名",
    "作業日",
    "現場名",
    "工事分類",
    "勤務区分",
    "契約区分",
    "諸経費",
    "リース関係",
    "ゴミ処分",
    "車両・運搬",
    "作業員",
    "作業人数",
    "上記以外の従業員",
    "作業内容",
    "備考",
    "作業進行",
  ];

  if (includeCosts) {
    headers.splice(12, 0, "作業員単価内訳", "作業員単価合計");
  }

  const lines = [
    headers.join(","),
    ...details.map((report) => {
      const row = [
        csvEscape(report.reporter_name ?? report.creator_display_name ?? "未設定"),
        formatDate(report.report_date),
        csvEscape(displayReportSiteName(report)),
        csvEscape(report.work_category?.name ?? ""),
        csvEscape(report.work_shift === "night" ? "夜勤" : "昼勤"),
        csvEscape(report.contract_type === "regular" ? "常用" : "請負"),
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
        csvEscape(workerSummary(report)),
        report.worker_count.toString(),
        csvEscape(report.other_workers_note ?? ""),
        csvEscape(report.work_description ?? ""),
        csvEscape(report.remarks ?? ""),
        csvEscape(report.progress_status === "completed" ? "終了" : "継続"),
      ];

      if (includeCosts) {
        row.splice(
          12,
          0,
          csvEscape(workerCostSummary(report).map((item) => `${item.label}:${item.count}人×${item.unitPrice}円=${item.subtotal}円`).join("\n")),
          workerCostTotal(report).toString(),
        );
      }

      return row.join(",");
    }),
    "",
    `${csvEscape("出力期間合計")},${csvEscape("")}`,
    `${csvEscape("対象日報件数")},${reports.length}`,
    `${csvEscape("延べ人数")},${periodWorkerTotal}`,
    ...(includeCosts
      ? [
          `${csvEscape("作業員原価内訳")},${csvEscape("人数")},${csvEscape("金額")}`,
          ...periodLaborCostBreakdown.map(
            ([label, value]) => `${csvEscape(label)},${csvEscape(`${value.count.toLocaleString()}人`)},${csvEscape(`${value.subtotal.toLocaleString()}円`)}`,
          ),
          `${csvEscape("作業員原価合計")},${csvEscape(`${periodWorkerTotal.toLocaleString()}人`)},${csvEscape(`${periodLaborCostTotal.toLocaleString()}円`)}`,
        ]
      : []),
  ];

  downloadTextFile(`daily-reports-${new Date().toISOString().slice(0, 10)}.csv`, `\uFEFF${lines.join("\n")}`, "text/csv;charset=utf-8;");
}

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, Download, Plus } from "lucide-react";
import { toast } from "sonner";
import { endOfMonth, format, startOfMonth, subMonths, addMonths } from "date-fns";
import { ja } from "date-fns/locale";
import { PageHeader } from "@/components/app/page-header";
import { PageShell } from "@/components/app/page-shell";
import { EmptyState, ErrorState } from "@/components/app/states";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { exportReportsCsv } from "@/features/reports/report-export";
import { listReports } from "@/features/reports/report-service";
import { listSites } from "@/features/sites/site-service";
import { cn, formatDate, toDateInputValue } from "@/lib/utils";
import type { DailyReport, Site } from "@/types/database";

type ReportListRow = DailyReport & { site: Site | null };

function DateFilterField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="min-w-0 space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <label className="relative block overflow-hidden rounded-xl border bg-card px-3 py-3 shadow-sm">
        <input
          id={id}
          type="date"
          className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-medium">{formatDate(value)}</span>
          <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
        </div>
      </label>
    </div>
  );
}

export function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reports, setReports] = useState<ReportListRow[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    from: toDateInputValue(startOfMonth(new Date())),
    to: toDateInputValue(endOfMonth(new Date())),
    siteId: "all",
  });

  useEffect(() => {
    void listSites(true).then(setSites).catch(() => undefined);
  }, []);

  useEffect(() => {
    setFilters((current) => ({
      ...current,
      from: toDateInputValue(startOfMonth(currentMonth)),
      to: toDateInputValue(endOfMonth(currentMonth)),
    }));
  }, [currentMonth]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await listReports({
          from: filters.from || undefined,
          to: filters.to || undefined,
          siteId: filters.siteId === "all" ? undefined : filters.siteId,
        });
        setReports(data);
      } catch (nextError) {
        setError(nextError instanceof Error ? nextError.message : "日報一覧の取得に失敗しました");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [filters]);

  const summary = useMemo(() => {
    const totalWorkers = reports.reduce((sum, report) => sum + report.worker_count, 0);
    return {
      count: reports.length,
      workers: totalWorkers,
    };
  }, [reports]);

  const groupedReports = useMemo(() => {
    const groups = new Map<string, ReportListRow[]>();
    reports.forEach((report) => {
      const key = report.report_date;
      const group = groups.get(key) ?? [];
      group.push(report);
      groups.set(key, group);
    });
    return Array.from(groups.entries()).map(([date, items]) => ({
      date,
      items,
    }));
  }, [reports]);

  const monthInputValue = format(currentMonth, "yyyy-MM-dd");
  const filterSummary = `${formatDate(filters.from)}〜${formatDate(filters.to)} / ${
    filters.siteId === "all" ? "すべての現場" : sites.find((site) => site.id === filters.siteId)?.name ?? "現場未選択"
  }`;

  const handleExportCsv = async () => {
    try {
      await exportReportsCsv(reports);
      toast.success("CSVを出力しました");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "CSV出力に失敗しました");
    }
  };

  return (
    <PageShell>
      <PageHeader
        title="日報一覧"
        description="月ごとに日報を確認し、日付単位でまとまりを見られます。"
        action={
          <>
            <Button variant="outline" onClick={() => void handleExportCsv()} disabled={reports.length === 0}>
              <Download className="h-4 w-4" />
              CSV出力
            </Button>
            <Link to="/reports/new" className={cn(buttonVariants(), "inline-flex items-center gap-2")}>
              <Plus className="h-4 w-4" />
              新規入力
            </Link>
          </>
        }
      />

      <Card className="mb-4">
        <CardContent className="space-y-4 pt-5">
          <div className="grid gap-4 md:grid-cols-[auto_1fr_auto_auto]">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => setCurrentMonth((current) => subMonths(current, 1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={() => setCurrentMonth((current) => addMonths(current, 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <label className="relative block cursor-pointer rounded-2xl bg-secondary px-4 py-3 transition hover:bg-accent">
              <input
                type="date"
                className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                value={monthInputValue}
                onChange={(event) => {
                  if (!event.target.value) {
                    return;
                  }
                  setCurrentMonth(startOfMonth(new Date(`${event.target.value}T00:00:00`)));
                }}
              />
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground">表示月</p>
                  <p className="mt-1 text-xl font-extrabold">{format(currentMonth, "yyyy年M月", { locale: ja })}</p>
                </div>
                <div className="rounded-xl border border-border/70 bg-background/70 p-2 text-primary">
                  <CalendarDays className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">タップしてカレンダーから月を選択</p>
            </label>
            <div className="rounded-2xl bg-secondary px-4 py-3">
              <p className="text-xs font-semibold text-muted-foreground">件数</p>
              <p className="mt-1 text-2xl font-extrabold">{summary.count}</p>
            </div>
            <div className="rounded-2xl bg-secondary px-4 py-3">
              <p className="text-xs font-semibold text-muted-foreground">延べ人数</p>
              <p className="mt-1 text-2xl font-extrabold">{summary.workers}</p>
            </div>
          </div>

          <button
            type="button"
            className="flex w-full items-center justify-between rounded-2xl border bg-background px-4 py-3 text-left transition hover:bg-accent/50"
            onClick={() => setShowFilters((current) => !current)}
          >
            <div>
              <p className="text-sm font-semibold">絞り込み</p>
              <p className="text-xs text-muted-foreground">{filterSummary}</p>
            </div>
            <ChevronDown className={cn("h-4 w-4 transition-transform", showFilters && "rotate-180")} />
          </button>

          <div
            className={cn(
              "grid overflow-hidden transition-all duration-300 ease-out",
              showFilters ? "mt-0 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
            )}
          >
            <div className="min-h-0">
            <div className="grid gap-4 rounded-2xl border bg-background p-4 md:grid-cols-[1fr_1fr_1.2fr]">
              <DateFilterField
                id="filter-from"
                label="開始日"
                value={filters.from}
                onChange={(value) => setFilters((current) => ({ ...current, from: value }))}
              />
              <DateFilterField
                id="filter-to"
                label="終了日"
                value={filters.to}
                onChange={(value) => setFilters((current) => ({ ...current, to: value }))}
              />
              <div className="min-w-0 space-y-2">
                <Label>現場</Label>
                <Select value={filters.siteId} onValueChange={(value) => setFilters((current) => ({ ...current, siteId: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">すべての現場</SelectItem>
                    {sites.map((site) => (
                      <SelectItem key={site.id} value={site.id}>
                        {site.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      ) : error ? (
        <ErrorState message={error} />
      ) : reports.length === 0 ? (
        <EmptyState title="日報がありません" description="条件を変えるか、新しい日報を登録してください。" />
      ) : (
        <div className="space-y-5">
          {groupedReports.map((group) => (
            <section key={group.date} className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold">{formatDate(group.date)}</h2>
                  <p className="text-sm text-muted-foreground">{group.items.length}件の日報</p>
                </div>
              </div>

              <Card className="md:hidden">
                <CardContent className="space-y-3 pt-5">
                  {group.items.map((report) => (
                    <Link key={report.id} to={`/reports/${report.id}`} className="block rounded-2xl border bg-background p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-bold">{report.site?.name ?? "現場未設定"}</p>
                          <p className="text-sm text-muted-foreground">{report.worker_count}人 / {report.site?.address ?? "住所未登録"}</p>
                        </div>
                        <Badge>{report.worker_count}人</Badge>
                      </div>
                      <p className="mt-3 text-sm text-muted-foreground">{report.tomorrow_plan || "明日の予定なし"}</p>
                    </Link>
                  ))}
                </CardContent>
              </Card>

              <Card className="hidden md:block">
                <CardContent className="pt-5">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>現場</TableHead>
                        <TableHead>人数</TableHead>
                        <TableHead>明日の予定</TableHead>
                        <TableHead className="w-[120px]">詳細</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {group.items.map((report, index) => (
                        <TableRow key={report.id} className={cn(index % 2 === 1 && "bg-secondary/20")}>
                          <TableCell>{report.site?.name ?? "-"}</TableCell>
                          <TableCell>{report.worker_count}人</TableCell>
                          <TableCell className="max-w-sm truncate">{report.tomorrow_plan ?? "-"}</TableCell>
                          <TableCell>
                            <Link
                              to={`/reports/${report.id}`}
                              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                            >
                              表示
                            </Link>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </section>
          ))}
        </div>
      )}
    </PageShell>
  );
}

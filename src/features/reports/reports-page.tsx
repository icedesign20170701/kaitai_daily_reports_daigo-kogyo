import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, Download, Plus } from "lucide-react";
import { toast } from "sonner";
import { endOfMonth, format, startOfMonth, subMonths, addMonths } from "date-fns";
import { ja } from "date-fns/locale";
import { PageHeader } from "@/components/app/page-header";
import { PageShell } from "@/components/app/page-shell";
import { LoadingState } from "@/components/app/loading-state";
import { EmptyState, ErrorState } from "@/components/app/states";
import { Button, buttonVariants } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { exportReportsCsv } from "@/features/reports/report-export";
import { useAuth } from "@/features/auth/auth-context";
import { listAppUsers } from "@/features/auth/auth-service";
import { listReports } from "@/features/reports/report-service";
import { listSites } from "@/features/sites/site-service";
import { cn, formatDate, toDateInputValue, withSupabaseRecovery } from "@/lib/utils";
import type { AppUser, DailyReport, MasterItem, Site } from "@/types/database";

type ReportListRow = DailyReport & { site: Site | null; work_category?: MasterItem | null; creator_display_name?: string | null };

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
  const selectedDate = value ? new Date(`${value}T00:00:00`) : undefined;
  const [open, setOpen] = useState(false);

  return (
    <div className="min-w-0 space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            id={id}
            type="button"
            className="flex w-full items-center justify-between gap-2 overflow-hidden rounded-xl border bg-card px-3 py-3 text-left shadow-sm"
          >
            <span className="truncate text-sm font-medium">{selectedDate ? formatDate(value) : "日付を選択してください"}</span>
            <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto p-3">
          <Calendar
            mode="single"
            selected={selectedDate}
            defaultMonth={selectedDate}
            onSelect={(date) => {
              if (!date) return;
              onChange(toDateInputValue(date));
              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

function MonthPicker({
  value,
  onChange,
}: {
  value: Date;
  onChange: (value: Date) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className="block w-full cursor-pointer rounded-2xl bg-secondary px-4 py-3 text-left transition hover:bg-accent">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-muted-foreground">表示月</p>
              <p className="mt-1 text-xl font-extrabold md:text-lg">{format(value, "yyyy年M月", { locale: ja })}</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-background/70 p-2 text-primary">
              <CalendarDays className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-1 text-xs text-muted-foreground md:text-[11px]">クリックして月変更</p>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-3">
        <Calendar
          mode="single"
          selected={value}
          defaultMonth={value}
          onSelect={(date) => {
            if (!date) return;
            onChange(startOfMonth(date));
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

function ProgressBadge({ status }: { status: DailyReport["progress_status"] }) {
  const isCompleted = status === "completed";
  return (
    <span
      className={cn(
        "inline-flex min-w-[68px] items-center justify-center rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap",
        isCompleted ? "bg-red-100 text-red-700" : "bg-sky-100 text-sky-700",
      )}
    >
      {isCompleted ? "終了" : "継続"}
    </span>
  );
}

export function ReportsPage() {
  const { user, appUser, isMaster } = useAuth();
  const hiddenAtRef = useRef<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reports, setReports] = useState<ReportListRow[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [appUsers, setAppUsers] = useState<AppUser[]>([]);
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    from: toDateInputValue(startOfMonth(new Date())),
    to: toDateInputValue(endOfMonth(new Date())),
    siteId: "all",
    createdBy: "all",
  });

  const loadReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await withSupabaseRecovery(
        () => listReports({
          from: filters.from || undefined,
          to: filters.to || undefined,
          siteId: filters.siteId === "all" ? undefined : filters.siteId,
          createdBy: filters.createdBy === "all" ? undefined : filters.createdBy,
        }),
        8000,
        "日報一覧の読み込みがタイムアウトしました。再度お試しください。",
      );
      setReports(data);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "日報一覧の取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const loadFilterOptions = useCallback(() => {
    void withSupabaseRecovery(() => listSites(true), 6000).then(setSites).catch(() => undefined);
    void withSupabaseRecovery(() => listAppUsers(), 6000).then(setAppUsers).catch(() => undefined);
  }, []);

  useEffect(() => {
    loadFilterOptions();
  }, [loadFilterOptions]);

  useEffect(() => {
    setFilters((current) => ({
      ...current,
      from: toDateInputValue(startOfMonth(currentMonth)),
      to: toDateInputValue(endOfMonth(currentMonth)),
    }));
  }, [currentMonth]);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  useEffect(() => {
    const reloadAfterResume = () => {
      if (document.visibilityState === "hidden") {
        return;
      }
      const hiddenAt = hiddenAtRef.current;
      const resumedAfterMs = hiddenAt ? Date.now() - hiddenAt : 0;
      if (!loading && !error && resumedAfterMs < 1500) {
        return;
      }
      hiddenAtRef.current = null;
      loadFilterOptions();
      void loadReports();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        hiddenAtRef.current = Date.now();
        return;
      }
      reloadAfterResume();
    };

    window.addEventListener("focus", reloadAfterResume);
    window.addEventListener("pageshow", reloadAfterResume);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", reloadAfterResume);
      window.removeEventListener("pageshow", reloadAfterResume);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [error, loadFilterOptions, loadReports, loading]);

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

  const filterSummary = `${formatDate(filters.from)}〜${formatDate(filters.to)} / ${
    filters.siteId === "all" ? "すべての現場" : sites.find((site) => site.id === filters.siteId)?.name ?? "現場未選択"
  } / ${filters.createdBy === "all" ? "全員" : appUsers.find((item) => item.user_id === filters.createdBy)?.display_name ?? "未設定"}`;
  const greetingName = appUser?.display_name || user?.email || "ユーザー";

  const handleExportCsv = async () => {
    try {
      await exportReportsCsv(reports, { includeCosts: isMaster });
      toast.success("CSVを出力しました");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "CSV出力に失敗しました");
    }
  };

  return (
    <PageShell>
      <p className="mb-4 text-sm font-medium text-muted-foreground">{greetingName}さん、お疲れ様です。</p>
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
          <div className="grid gap-4 md:hidden">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => setCurrentMonth((current) => subMonths(current, 1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={() => setCurrentMonth((current) => addMonths(current, 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <MonthPicker value={currentMonth} onChange={setCurrentMonth} />
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-2xl bg-secondary px-4 py-3 text-center">
                <p className="text-xs font-semibold text-muted-foreground">件数</p>
                <p className="mt-1 text-2xl font-extrabold">{summary.count}</p>
              </div>
              <div className="rounded-2xl bg-secondary px-4 py-3 text-center">
                <p className="text-xs font-semibold text-muted-foreground">延べ人数</p>
                <p className="mt-1 text-2xl font-extrabold">{summary.workers}</p>
              </div>
            </div>
          </div>

          <div className="hidden gap-4 md:grid md:grid-cols-[auto_minmax(220px,0.8fr)_minmax(120px,auto)_minmax(120px,auto)]">
            <div className="flex items-center md:justify-center gap-2">
              <Button variant="outline" size="icon" onClick={() => setCurrentMonth((current) => subMonths(current, 1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={() => setCurrentMonth((current) => addMonths(current, 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <MonthPicker value={currentMonth} onChange={setCurrentMonth} />
            <div className="rounded-2xl bg-secondary px-4 py-3 text-center">
              <p className="text-xs font-semibold text-muted-foreground">件数</p>
              <p className="mt-1 text-2xl font-extrabold">{summary.count}</p>
            </div>
            <div className="rounded-2xl bg-secondary px-4 py-3 text-center">
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
            <div className="grid gap-4 rounded-2xl border bg-background p-4 md:grid-cols-[1fr_1fr_1.1fr_1.1fr]">
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
                <div className="relative">
                  <select
                    className="flex h-11 w-full appearance-none rounded-xl border bg-card px-3 py-2 pr-10 text-left text-base shadow-sm outline-none md:text-sm"
                    value={filters.siteId}
                    onChange={(event) => setFilters((current) => ({ ...current, siteId: event.target.value }))}
                  >
                    <option value="all">すべての現場</option>
                    {sites.map((site) => (
                      <option key={site.id} value={site.id}>
                        {site.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground opacity-70" />
                </div>
              </div>
              <div className="min-w-0 space-y-2">
                <Label>記入者</Label>
                <div className="relative">
                  <select
                    className="flex h-11 w-full appearance-none rounded-xl border bg-card px-3 py-2 pr-10 text-left text-base shadow-sm outline-none md:text-sm"
                    value={filters.createdBy}
                    onChange={(event) => setFilters((current) => ({ ...current, createdBy: event.target.value }))}
                  >
                    <option value="all">全員</option>
                    {appUsers.map((item) => (
                      <option key={item.user_id} value={item.user_id}>
                        {item.display_name || "未設定"}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground opacity-70" />
                </div>
              </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <LoadingState message="日報一覧を読み込んでいます..." showProgress expectedDurationMs={3000} />
      ) : error ? (
        <ErrorState message={error} />
      ) : reports.length === 0 ? (
        <EmptyState title="日報がありません" description="条件を変えるか、新しい日報を登録してください。" />
      ) : (
        <div className="space-y-5">
          {groupedReports.map((group) => (
            <section key={group.date} className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-bold">{formatDate(group.date)}</h2>
                  <p className="text-sm text-muted-foreground">{group.items.length}件の日報</p>
                </div>
              </div>

              <Card className="md:hidden">
                <CardContent className="space-y-3 pt-5">
                  {group.items.map((report) => (
                    <Link key={report.id} to={`/reports/${report.id}`} className="block rounded-xl border bg-background p-4">
                      <div className="space-y-3">
                        <div className="flex items-start gap-2">
                          <ProgressBadge status={report.progress_status} />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-bold">{report.site?.name ?? "現場未設定"}</p>
                          <p className="mt-1 text-sm text-muted-foreground">工事分類: {report.work_category?.name ?? "未設定"}</p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            区分: {report.work_shift === "night" ? "夜勤" : "昼勤"} / {report.contract_type === "regular" ? "常用" : "請負"}
                          </p>
                          <p className="text-sm text-muted-foreground">作成者: {report.reporter_name ?? report.creator_display_name ?? "未設定"}</p>
                          <p className="text-sm text-muted-foreground">人数: {report.worker_count}人</p>
                        </div>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-muted-foreground">{report.remarks ? "備考: 記載あり" : "備考: -"}</p>
                    </Link>
                  ))}
                </CardContent>
              </Card>

              <Card className="hidden md:block rounded-xl">
                <CardContent className="pt-5">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[28%] min-w-[180px]">現場名</TableHead>
                        <TableHead className="w-[14%] min-w-[116px]">工事分類</TableHead>
                        <TableHead className="w-[14%] min-w-[116px]">区分</TableHead>
                        <TableHead className="w-[14%] min-w-[120px]">作成者</TableHead>
                        <TableHead className="w-[10%] min-w-[76px]">人数</TableHead>
                        <TableHead className="w-[10%] min-w-[92px]">進捗</TableHead>
                        <TableHead className="w-[10%] min-w-[92px]">備考</TableHead>
                        <TableHead className="w-[96px] min-w-[96px]">詳細</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {group.items.map((report, index) => (
                        <TableRow key={report.id} className={cn(index % 2 === 1 && "bg-secondary/20")}>
                          <TableCell className="max-w-0">
                            <span className="block truncate">{report.site?.name ?? "-"}</span>
                          </TableCell>
                          <TableCell className="max-w-0">
                            <span className="block truncate">{report.work_category?.name ?? "-"}</span>
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            {report.work_shift === "night" ? "夜勤" : "昼勤"} / {report.contract_type === "regular" ? "常用" : "請負"}
                          </TableCell>
                          <TableCell className="max-w-0">
                            <span className="block truncate">{report.reporter_name ?? report.creator_display_name ?? "未設定"}</span>
                          </TableCell>
                          <TableCell className="whitespace-nowrap">{report.worker_count}人</TableCell>
                          <TableCell className="whitespace-nowrap">
                            <ProgressBadge status={report.progress_status} />
                          </TableCell>
                          <TableCell className="whitespace-nowrap">{report.remarks ? "記載あり" : "-"}</TableCell>
                          <TableCell className="whitespace-nowrap">
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

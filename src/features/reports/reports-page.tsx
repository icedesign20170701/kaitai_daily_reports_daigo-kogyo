import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Download, Plus } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/page-header";
import { PageShell } from "@/components/app/page-shell";
import { EmptyState, ErrorState } from "@/components/app/states";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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

export function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reports, setReports] = useState<ReportListRow[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [filters, setFilters] = useState({
    from: toDateInputValue(new Date(new Date().setDate(new Date().getDate() - 30))),
    to: toDateInputValue(),
    siteId: "all",
  });

  useEffect(() => {
    void listSites(true).then(setSites).catch(() => undefined);
  }, []);

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
        description="管理画面として日報を絞り込み、確認、CSV出力します。"
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
        <CardContent className="grid gap-4 pt-5 md:grid-cols-[1fr_1fr_1.2fr_auto_auto]">
          <div className="space-y-2">
            <Label htmlFor="from">開始日</Label>
            <Input
              id="from"
              type="date"
              value={filters.from}
              onChange={(event) => setFilters((current) => ({ ...current, from: event.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="to">終了日</Label>
            <Input
              id="to"
              type="date"
              value={filters.to}
              onChange={(event) => setFilters((current) => ({ ...current, to: event.target.value }))}
            />
          </div>
          <div className="space-y-2">
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
          <div className="rounded-2xl bg-secondary px-4 py-3">
            <p className="text-xs font-semibold text-muted-foreground">件数</p>
            <p className="mt-1 text-2xl font-extrabold">{summary.count}</p>
          </div>
          <div className="rounded-2xl bg-secondary px-4 py-3">
            <p className="text-xs font-semibold text-muted-foreground">延べ人数</p>
            <p className="mt-1 text-2xl font-extrabold">{summary.workers}</p>
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
        <>
          <Card className="md:hidden">
            <CardContent className="space-y-3 pt-5">
              {reports.map((report) => (
                <Link key={report.id} to={`/reports/${report.id}`} className="block rounded-2xl border bg-background p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-bold">{report.site?.name ?? "現場未設定"}</p>
                      <p className="text-sm text-muted-foreground">{formatDate(report.report_date)}</p>
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
                    <TableHead>日付</TableHead>
                    <TableHead>現場</TableHead>
                    <TableHead>人数</TableHead>
                    <TableHead>明日の予定</TableHead>
                    <TableHead className="w-[120px]">詳細</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell>{formatDate(report.report_date)}</TableCell>
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
        </>
      )}
    </PageShell>
  );
}

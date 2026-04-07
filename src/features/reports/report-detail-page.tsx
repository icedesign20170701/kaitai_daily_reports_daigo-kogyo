import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { PencilLine, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/app/page-header";
import { PageShell } from "@/components/app/page-shell";
import { LoadingState } from "@/components/app/loading-state";
import { EmptyState, ErrorState } from "@/components/app/states";
import { useAuth } from "@/features/auth/auth-context";
import { listMasterItems } from "@/features/masters/master-service";
import { ReportForm } from "@/features/reports/report-form";
import { deletePhoto, deleteReport, getReportDetail, saveReport } from "@/features/reports/report-service";
import { listSites } from "@/features/sites/site-service";
import { supabase } from "@/lib/supabase";
import { storageService } from "@/lib/storage-service";
import { cn, formatDate } from "@/lib/utils";
import type { DailyReportDetail, MasterItem, OtherVehicleEntry, ReportPhoto, Site } from "@/types/database";

function DetailSection({ title, value, emptyLabel = "未入力" }: { title: string; value: string | null | undefined; emptyLabel?: string }) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold">{title}</p>
      <pre className="whitespace-pre-wrap rounded-xl bg-background p-3 text-sm font-sans">{value || emptyLabel}</pre>
    </div>
  );
}

function ListSection({ title, rows }: { title: string; rows: string[] }) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold">{title}</p>
      <div className="rounded-xl bg-background p-3">
        {rows.length === 0 ? <p className="text-sm text-muted-foreground">未入力</p> : rows.map((row) => <p key={row} className="text-sm">{row}</p>)}
      </div>
    </div>
  );
}

function groupedWorkerRows(workers: MasterItem[]) {
  const map = new Map<string, string[]>();
  workers.forEach((worker) => {
    const label = worker.group_label?.trim() || "ラベル未設定";
    const list = map.get(label) ?? [];
    list.push(worker.name);
    map.set(label, list);
  });
  return Array.from(map.entries()).map(([label, names]) => `${label}: ${names.join(" / ")}`);
}

function otherVehicleRows(entries: OtherVehicleEntry[]) {
  return entries.filter((entry) => entry.label.trim()).map((entry) => `${entry.label}: ${entry.count}台`);
}

function formatEditedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function ReportDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user, appUser, isMaster } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [masterOverride, setMasterOverride] = useState(false);
  const [report, setReport] = useState<DailyReportDetail | null>(null);
  const [sites, setSites] = useState<Site[]>([]);
  const [workers, setWorkers] = useState<MasterItem[]>([]);
  const [leaseItems, setLeaseItems] = useState<MasterItem[]>([]);
  const [disposalItems, setDisposalItems] = useState<MasterItem[]>([]);
  const [transportItems, setTransportItems] = useState<MasterItem[]>([]);

  useEffect(() => {
    if (!id) return;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [detail, siteData, workerData, leaseData, disposalData, transportData] = await Promise.all([
          getReportDetail(id),
          listSites(false),
          listMasterItems("worker", false),
          listMasterItems("lease", false),
          listMasterItems("disposal", false),
          listMasterItems("transport", false),
        ]);
        setReport(detail);
        setSites(siteData);
        setWorkers(workerData);
        setLeaseItems(leaseData);
        setDisposalItems(disposalData);
        setTransportItems(transportData);
      } catch (nextError) {
        setError(nextError instanceof Error ? nextError.message : "日報の取得に失敗しました");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [id]);

  useEffect(() => {
    if (!user) {
      setMasterOverride(false);
      return;
    }

    const loadMasterFlag = async () => {
      const { data } = await supabase.from("app_users").select("is_master").eq("user_id", user.id).maybeSingle();
      setMasterOverride(data?.is_master ?? false);
    };

    void loadMasterFlag();
  }, [user]);

  const reload = async () => {
    if (!id) return;
    const detail = await getReportDetail(id);
    setReport(detail);
  };

  const handleSubmit = async (values: Parameters<typeof saveReport>[0], files: File[]) => {
    if (!id || !user) return;
    setSaving(true);
    try {
      const result = await saveReport(values, user.id, id, files);
      toast.success("日報を更新しました");
      if (result.uploadErrors.length > 0) {
        toast.error(result.uploadErrors.join(" / "));
      }
      await reload();
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePhoto = async (photo: ReportPhoto) => {
    try {
      await deletePhoto(photo);
      toast.success("写真を削除しました");
      await reload();
    } catch (nextError) {
      toast.error(nextError instanceof Error ? nextError.message : "写真の削除に失敗しました");
    }
  };

  const handleDeleteReport = async () => {
    if (!id || !canEditReport) return;
    if (!window.confirm("この日報を削除します。元に戻せません。")) return;

    try {
      await deleteReport(id);
      toast.success("日報を削除しました");
      navigate("/reports", { replace: true });
    } catch (nextError) {
      toast.error(nextError instanceof Error ? nextError.message : "日報の削除に失敗しました");
    }
  };

  const canEditReport = Boolean(user && report && (report.created_by === user.id || isMaster || masterOverride));

  const leaseRows = useMemo(
    () => report?.lease_entries.filter((entry) => entry.count > 0).map((entry) => `${entry.item?.name ?? "未設定"}: ${entry.count}台`) ?? [],
    [report],
  );
  const disposalRows = useMemo(
    () =>
      report?.disposal_entries
        .filter((entry) => entry.ton_count > 0 || entry.truck_count > 0)
        .map((entry) => `${entry.item?.name ?? "未設定"}: ${entry.ton_count}T${entry.truck_count}台`) ?? [],
    [report],
  );
  const transportRows = useMemo(
    () => report?.transport_entries.filter((entry) => entry.count > 0).map((entry) => `${entry.item?.name ?? "未設定"}: ${entry.count}台`) ?? [],
    [report],
  );

  return (
    <PageShell>
      <PageHeader
        title="日報詳細"
        description="記録内容の確認と修正ができます。"
        action={
          !loading && report && canEditReport ? (
            <>
              <Button variant={editing ? "secondary" : "default"} onClick={() => setEditing((current) => !current)}>
                <PencilLine className="h-4 w-4" />
                {editing ? "詳細に戻る" : "編集する"}
              </Button>
              {!editing ? (
                <Button variant="destructive" onClick={() => void handleDeleteReport()}>
                  <Trash2 className="h-4 w-4" />
                  削除
                </Button>
              ) : null}
            </>
          ) : null
        }
      />

      {loading ? (
        <LoadingState message="日報データを読み込んでいます..." showProgress expectedDurationMs={5000} />
      ) : error ? (
        <ErrorState message={error} />
      ) : !report ? (
        <EmptyState title="日報が見つかりません" description="一覧に戻って別の日報を選択してください。" />
      ) : editing && canEditReport ? (
        <ReportForm
          sites={sites}
          workers={workers}
          leaseItems={leaseItems}
          disposalItems={disposalItems}
          transportItems={transportItems}
          reporterName={appUser?.display_name ?? null}
          initialReport={report}
          submitting={saving}
          onSubmit={handleSubmit}
          onDeleteExistingPhoto={handleDeletePhoto}
        />
      ) : (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-left break-words">{report.site?.name ?? "現場未設定"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">作業日</p>
                  <p className="mt-1 font-semibold">{formatDate(report.report_date)}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">勤務区分</p>
                  <p className="mt-1 font-semibold">{report.work_shift === "night" ? "夜勤" : "昼勤"}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">契約区分</p>
                  <p className="mt-1 font-semibold">{report.contract_type === "regular" ? "常用" : "請負"}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">作業人数</p>
                  <p className="mt-1 font-semibold">{report.worker_count}人</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">作業進行</p>
                  <p className="mt-1 font-semibold">{report.progress_status === "completed" ? "終了" : "継続"}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">作成者</p>
                  <p className="mt-1 font-semibold">
                    {report.created_by === user?.id
                      ? appUser?.display_name || "未設定"
                      : report.creator_display_name || report.created_by}
                  </p>
                </div>
              </div>

              <DetailSection title="諸経費（消耗品等）" value={report.miscellaneous_costs} />
              <ListSection title="リース関係" rows={leaseRows} />
              <ListSection title="ゴミ処分" rows={disposalRows} />
              <ListSection title="車両・運搬" rows={transportRows} />
              <ListSection title="その他車両" rows={otherVehicleRows(report.other_vehicle_entries)} />
              <ListSection title="作業員" rows={groupedWorkerRows(report.workers)} />
              <DetailSection title="上記以外の従業員" value={report.other_workers_note} />
              <DetailSection title="備考" value={report.remarks} />
            </CardContent>
          </Card>

          {report.edit_logs.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>更新履歴</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {report.edit_logs.map((log) => (
                  <p key={log.id} className="text-sm text-muted-foreground">
                    {log.editor_display_name || "未設定"}さんが {formatEditedAt(log.edited_at)} に編集しました
                  </p>
                ))}
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>写真</CardTitle>
            </CardHeader>
            <CardContent>
              {report.photos.length === 0 ? (
                <p className="text-sm text-muted-foreground">写真は登録されていません。</p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {report.photos.map((photo) => (
                    <div key={photo.id} className="overflow-hidden rounded-2xl border bg-background">
                      <img src={storageService.getPublicUrl(photo.image_path)} alt="日報写真" className="h-44 w-full object-cover" />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Link to="/reports" className={cn(buttonVariants({ variant: "outline" }), "w-full md:w-auto")}>
            一覧へ戻る
          </Link>
        </div>
      )}
    </PageShell>
  );
}

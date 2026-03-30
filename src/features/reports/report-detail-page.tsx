import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { PencilLine } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/app/page-header";
import { PageShell } from "@/components/app/page-shell";
import { EmptyState, ErrorState } from "@/components/app/states";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/features/auth/auth-context";
import { listMasterItems } from "@/features/masters/master-service";
import { ReportForm } from "@/features/reports/report-form";
import { deletePhoto, getReportDetail, saveReport } from "@/features/reports/report-service";
import { listSites } from "@/features/sites/site-service";
import { storageService } from "@/lib/storage-service";
import { cn, formatDate } from "@/lib/utils";
import type { DailyReportDetail, MasterItem, ReportPhoto, Site } from "@/types/database";

function ChipList({ title, items }: { title: string; items: { id: string; name: string }[] }) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold">{title}</p>
      <div className="flex flex-wrap gap-2">
        {items.length > 0 ? items.map((item) => <Badge key={item.id}>{item.name}</Badge>) : <Badge variant="outline">未選択</Badge>}
      </div>
    </div>
  );
}

export function ReportDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<DailyReportDetail | null>(null);
  const [sites, setSites] = useState<Site[]>([]);
  const [workItems, setWorkItems] = useState<MasterItem[]>([]);
  const [wasteItems, setWasteItems] = useState<MasterItem[]>([]);
  const [safetyItems, setSafetyItems] = useState<MasterItem[]>([]);
  const [workers, setWorkers] = useState<MasterItem[]>([]);
  const [machines, setMachines] = useState<MasterItem[]>([]);
  const [vehicles, setVehicles] = useState<MasterItem[]>([]);
  const [partners, setPartners] = useState<MasterItem[]>([]);

  useEffect(() => {
    if (!id) {
      return;
    }

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [detail, siteData, workData, wasteData, safetyData, workerData, machineData, vehicleData, partnerData] = await Promise.all([
          getReportDetail(id),
          listSites(false),
          listMasterItems("work", false),
          listMasterItems("waste", false),
          listMasterItems("safety", false),
          listMasterItems("worker", false),
          listMasterItems("machine", false),
          listMasterItems("vehicle", false),
          listMasterItems("partner", false),
        ]);
        setReport(detail);
        setSites(siteData);
        setWorkItems(workData);
        setWasteItems(wasteData);
        setSafetyItems(safetyData);
        setWorkers(workerData);
        setMachines(machineData);
        setVehicles(vehicleData);
        setPartners(partnerData);
      } catch (nextError) {
        setError(nextError instanceof Error ? nextError.message : "日報の取得に失敗しました");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [id]);

  const reload = async () => {
    if (!id) {
      return;
    }
    const detail = await getReportDetail(id);
    setReport(detail);
  };

  const handleSubmit = async (values: Parameters<typeof saveReport>[0], files: File[]) => {
    if (!id || !user) {
      return;
    }
    setSaving(true);
    try {
      await saveReport(values, user.id, id, files);
      toast.success("日報を更新しました");
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
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "写真の削除に失敗しました");
    }
  };

  return (
    <PageShell>
      <PageHeader
        title="日報詳細"
        description="記録内容の確認と修正ができます。"
        action={
          !loading && report ? (
            <Button variant={editing ? "secondary" : "default"} onClick={() => setEditing((current) => !current)}>
              <PencilLine className="h-4 w-4" />
              {editing ? "詳細に戻る" : "編集する"}
            </Button>
          ) : null
        }
      />

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-52" />
          <Skeleton className="h-64" />
        </div>
      ) : error ? (
        <ErrorState message={error} />
      ) : !report ? (
        <EmptyState title="日報が見つかりません" description="一覧に戻って別の日報を選択してください。" />
      ) : editing ? (
        <ReportForm
          sites={sites}
          workItems={workItems}
          wasteItems={wasteItems}
          safetyItems={safetyItems}
          workers={workers}
          machines={machines}
          vehicles={vehicles}
          partners={partners}
          initialReport={report}
          submitting={saving}
          onSubmit={handleSubmit}
          onDeleteExistingPhoto={handleDeletePhoto}
        />
      ) : (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{report.site?.name ?? "現場未設定"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">日付</p>
                  <p className="mt-1 font-semibold">{formatDate(report.report_date)}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">作業人数</p>
                  <p className="mt-1 font-semibold">{report.worker_count}人</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">住所</p>
                  <p className="mt-1 font-semibold">{report.site?.address ?? "-"}</p>
                </div>
              </div>
              <ChipList title="作業内容" items={report.work_items} />
              <ChipList title="廃材種類" items={report.waste_items} />
              <ChipList title="安全確認" items={report.safety_items} />
              <ChipList title="作業員" items={report.workers} />
              <ChipList title="重機" items={report.machines} />
              <ChipList title="車両" items={report.vehicles} />
              <ChipList title="協力会社" items={report.partner_companies} />
              <div className="space-y-2">
                <p className="text-sm font-semibold">明日の予定</p>
                <p className="rounded-xl bg-background p-3 text-sm">{report.tomorrow_plan || "未入力"}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-semibold">補足メモ</p>
                <p className="rounded-xl bg-background p-3 text-sm">{report.note || "未入力"}</p>
              </div>
            </CardContent>
          </Card>

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
                      <img
                        src={storageService.getPublicUrl(photo.image_path)}
                        alt="日報写真"
                        className="h-44 w-full object-cover"
                      />
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

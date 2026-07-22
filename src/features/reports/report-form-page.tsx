import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/page-header";
import { PageShell } from "@/components/app/page-shell";
import { LoadingState } from "@/components/app/loading-state";
import { ErrorState } from "@/components/app/states";
import { buttonVariants } from "@/components/ui/button";
import { useAuth } from "@/features/auth/auth-context";
import { listMasterItems } from "@/features/masters/master-service";
import { ReportForm } from "@/features/reports/report-form";
import { saveReport } from "@/features/reports/report-service";
import { listSites } from "@/features/sites/site-service";
import { notifyReportCreated } from "@/lib/report-notification-service";
import { cn, withSupabaseRecovery } from "@/lib/utils";
import type { MasterItem, Site } from "@/types/database";

export function ReportFormPage() {
  const navigate = useNavigate();
  const { user, appUser, isSubcontractor } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sites, setSites] = useState<Site[]>([]);
  const [workCategories, setWorkCategories] = useState<MasterItem[]>([]);
  const [workers, setWorkers] = useState<MasterItem[]>([]);
  const [workerLabels, setWorkerLabels] = useState<MasterItem[]>([]);
  const [leaseItems, setLeaseItems] = useState<MasterItem[]>([]);
  const [disposalItems, setDisposalItems] = useState<MasterItem[]>([]);
  const [disposalUnits, setDisposalUnits] = useState<MasterItem[]>([]);
  const [transportItems, setTransportItems] = useState<MasterItem[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [siteData, workCategoryData, workerData, workerLabelData, leaseData, disposalData, disposalUnitData, transportData] = await withSupabaseRecovery(
        () => Promise.all([
          listSites(false),
          listMasterItems("workCategory", false),
          listMasterItems("worker", false),
          listMasterItems("workerLabel", false),
          listMasterItems("lease", false),
          listMasterItems("disposal", false),
          listMasterItems("disposalUnit", false),
          listMasterItems("transport", false),
        ]),
        10000,
        "日報入力の初期データ読み込みがタイムアウトしました。再度お試しください。",
      );
      setSites(siteData);
      setWorkCategories(workCategoryData);
      setWorkers(workerData);
      setWorkerLabels(workerLabelData);
      setLeaseItems(leaseData);
      setDisposalItems(disposalData);
      setDisposalUnits(disposalUnitData);
      setTransportItems(transportData);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "初期データの取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSubmit = async (values: Parameters<typeof saveReport>[0], files: File[]) => {
    if (!user) {
      return;
    }
    setSubmitting(true);
    try {
      const result = await saveReport(values, user.id, undefined, files);
      toast.success("日報を保存しました");
      if (result.uploadErrors.length > 0) {
        toast.error(result.uploadErrors.join(" / "));
      }
      try {
        await notifyReportCreated({
          reportId: result.reportId,
          reportDate: values.report_date,
          siteName: values.site_name || sites.find((site) => site.id === values.site_id)?.name || "現場未設定",
          reporterName: values.reporter_name || "記入者未設定",
          workCategoryId: values.work_category_id,
          workCategoryName: workCategories.find((item) => item.id === values.work_category_id)?.name || "工事分類未設定",
        });
      } catch (notificationError) {
        toast.error(notificationError instanceof Error ? notificationError.message : "通知送信に失敗しました");
      }
      navigate(`/reports/${result.reportId}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageShell>
      <PageHeader
        title="日報入力"
        description=""
        action={
          <Link to="/reports" className={cn(buttonVariants({ variant: "outline" }), "w-full md:w-auto")}>
            一覧へ戻る
          </Link>
        }
      />
      {loading ? (
        <LoadingState message="日報入力に必要なデータを読み込んでいます..." showProgress expectedDurationMs={3000} />
      ) : error ? (
        <ErrorState message={error} onRetry={() => void load()} />
      ) : (
        <ReportForm
          sites={sites}
          workCategories={workCategories}
          workers={workers}
          workerLabels={workerLabels}
          leaseItems={leaseItems}
          disposalItems={disposalItems}
          disposalUnits={disposalUnits}
          transportItems={transportItems}
          reporterName={appUser?.display_name ?? null}
          isSubcontractor={isSubcontractor}
          submitting={submitting}
          onSubmit={handleSubmit}
        />
      )}
    </PageShell>
  );
}

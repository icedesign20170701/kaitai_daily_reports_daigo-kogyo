import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/page-header";
import { PageShell } from "@/components/app/page-shell";
import { LoadingState } from "@/components/app/loading-state";
import { ErrorState } from "@/components/app/states";
import { useAuth } from "@/features/auth/auth-context";
import { listMasterItems } from "@/features/masters/master-service";
import { ReportForm } from "@/features/reports/report-form";
import { saveReport } from "@/features/reports/report-service";
import { listSites } from "@/features/sites/site-service";
import type { MasterItem, Site } from "@/types/database";

export function ReportFormPage() {
  const navigate = useNavigate();
  const { user, appUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sites, setSites] = useState<Site[]>([]);
  const [workers, setWorkers] = useState<MasterItem[]>([]);
  const [leaseItems, setLeaseItems] = useState<MasterItem[]>([]);
  const [disposalItems, setDisposalItems] = useState<MasterItem[]>([]);
  const [transportItems, setTransportItems] = useState<MasterItem[]>([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [siteData, workerData, leaseData, disposalData, transportData] = await Promise.all([
          listSites(false),
          listMasterItems("worker", false),
          listMasterItems("lease", false),
          listMasterItems("disposal", false),
          listMasterItems("transport", false),
        ]);
        setSites(siteData);
        setWorkers(workerData);
        setLeaseItems(leaseData);
        setDisposalItems(disposalData);
        setTransportItems(transportData);
      } catch (nextError) {
        setError(nextError instanceof Error ? nextError.message : "初期データの取得に失敗しました");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

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
      navigate(`/reports/${result.reportId}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageShell>
      <PageHeader title="日報入力" description="" />
      {loading ? (
        <LoadingState message="日報入力に必要なデータを読み込んでいます..." />
      ) : error ? (
        <ErrorState message={error} />
      ) : (
        <ReportForm
          sites={sites}
          workers={workers}
          leaseItems={leaseItems}
          disposalItems={disposalItems}
          transportItems={transportItems}
          reporterName={appUser?.display_name ?? null}
          submitting={submitting}
          onSubmit={handleSubmit}
        />
      )}
    </PageShell>
  );
}

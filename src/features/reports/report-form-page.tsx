import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/page-header";
import { PageShell } from "@/components/app/page-shell";
import { ErrorState } from "@/components/app/states";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/features/auth/auth-context";
import { listMasterItems } from "@/features/masters/master-service";
import { ReportForm } from "@/features/reports/report-form";
import { saveReport } from "@/features/reports/report-service";
import { listSites } from "@/features/sites/site-service";
import type { MasterItem, Site } from "@/types/database";

export function ReportFormPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sites, setSites] = useState<Site[]>([]);
  const [workItems, setWorkItems] = useState<MasterItem[]>([]);
  const [wasteItems, setWasteItems] = useState<MasterItem[]>([]);
  const [safetyItems, setSafetyItems] = useState<MasterItem[]>([]);
  const [workers, setWorkers] = useState<MasterItem[]>([]);
  const [machines, setMachines] = useState<MasterItem[]>([]);
  const [vehicles, setVehicles] = useState<MasterItem[]>([]);
  const [partners, setPartners] = useState<MasterItem[]>([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [siteData, workData, wasteData, safetyData, workerData, machineData, vehicleData, partnerData] = await Promise.all([
          listSites(false),
          listMasterItems("work", false),
          listMasterItems("waste", false),
          listMasterItems("safety", false),
          listMasterItems("worker", false),
          listMasterItems("machine", false),
          listMasterItems("vehicle", false),
          listMasterItems("partner", false),
        ]);
        setSites(siteData);
        setWorkItems(workData);
        setWasteItems(wasteData);
        setSafetyItems(safetyData);
        setWorkers(workerData);
        setMachines(machineData);
        setVehicles(vehicleData);
        setPartners(partnerData);
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
      const reportId = await saveReport(values, user.id, undefined, files);
      toast.success("日報を保存しました");
      navigate(`/reports/${reportId}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageShell>
      <PageHeader title="日報入力" description="作業が終わったらこの画面だけで記録します。" />
      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-40" />
          <Skeleton className="h-56" />
          <Skeleton className="h-56" />
        </div>
      ) : error ? (
        <ErrorState message={error} />
      ) : (
        <ReportForm
          sites={sites}
          workItems={workItems}
          wasteItems={wasteItems}
          safetyItems={safetyItems}
          workers={workers}
          machines={machines}
          vehicles={vehicles}
          partners={partners}
          submitting={submitting}
          onSubmit={handleSubmit}
        />
      )}
    </PageShell>
  );
}

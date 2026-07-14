import { useCallback, useEffect, useState } from "react";
import { MapPinned, Pause, Play, Plus, Route } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/page-header";
import { PageShell } from "@/components/app/page-shell";
import { LoadingState } from "@/components/app/loading-state";
import { EmptyState, ErrorState } from "@/components/app/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { activateSite, archiveSite, listSites, upsertSite } from "@/features/sites/site-service";
import { withSupabaseRecovery } from "@/lib/utils";
import type { Site } from "@/types/database";

const companyRouteOrigins = [
  { area: "kansai", areaLabel: "関西", routeLabel: "会社からの経路(大阪)", address: "大阪府東大阪市高井田西３丁目６−３" },
  { area: "kanto", areaLabel: "関東", routeLabel: "会社からの経路(埼玉)", address: "〒341-0035 埼玉県三郷市鷹野3-469-1" },
] as const;

type SiteArea = (typeof companyRouteOrigins)[number]["area"];

function normalizeMapAddress(value: string) {
  return value
    .normalize("NFKC")
    .replaceAll("丁目", "-")
    .replaceAll("番地", "-")
    .replaceAll("番", "-")
    .replaceAll("号", "")
    .replaceAll(/\s+/g, " ")
    .trim();
}

function getMapLink(address: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(normalizeMapAddress(address))}`;
}

function getDirectionsLink(origin: string, destination: string) {
  return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(normalizeMapAddress(origin))}&destination=${encodeURIComponent(normalizeMapAddress(destination))}&travelmode=driving`;
}

function getRouteOrigin(siteArea: SiteArea) {
  return companyRouteOrigins.find((origin) => origin.area === siteArea) ?? companyRouteOrigins[0];
}

const siteSchema = z.object({
  name: z.string().min(1, "現場名を入力してください"),
  address: z.string(),
  site_area: z.enum(["kansai", "kanto"]),
  is_active: z.boolean(),
});

type SiteFormValues = z.infer<typeof siteSchema>;

export function SitesPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editingSite, setEditingSite] = useState<Site | null>(null);
  const [sites, setSites] = useState<Site[]>([]);

  const form = useForm<SiteFormValues>({
    resolver: zodResolver(siteSchema),
    defaultValues: {
      name: "",
      address: "",
      site_area: "kansai",
      is_active: true,
    },
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await withSupabaseRecovery(
        () => listSites(true),
        5000,
        "現場一覧の読み込みがタイムアウトしました。再度お試しください。",
      );
      setSites(data);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "現場一覧の取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setEditingSite(null);
    form.reset({ name: "", address: "", site_area: "kansai", is_active: true });
    setOpen(true);
  };

  const openEdit = (site: Site) => {
    setEditingSite(site);
    form.reset({
      name: site.name,
      address: site.address ?? "",
      site_area: site.site_area ?? "kansai",
      is_active: site.is_active,
    });
    setOpen(true);
  };

  const handleSubmit = form.handleSubmit(async (values) => {
    try {
      await upsertSite({
        id: editingSite?.id,
        name: values.name,
        address: values.address || null,
        site_area: values.site_area,
        is_active: values.is_active,
      });
      toast.success(editingSite ? "現場を更新しました" : "現場を追加しました");
      setOpen(false);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "保存に失敗しました");
    }
  });

  const handleArchive = async (siteId: string) => {
    try {
      await archiveSite(siteId);
      toast.success("現場を停止しました");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "停止に失敗しました");
    }
  };

  const handleActivate = async (siteId: string) => {
    try {
      await activateSite(siteId);
      toast.success("現場を稼働中に戻しました");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "稼働への切り替えに失敗しました");
    }
  };

  return (
    <PageShell>
      <PageHeader
        title="現場管理"
        description="現場の追加、編集、稼働停止を行います。"
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreate}>
                <Plus className="h-4 w-4" />
                現場追加
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingSite ? "現場編集" : "現場追加"}</DialogTitle>
                <DialogDescription>現場名は必須です。削除ではなく停止で管理します。</DialogDescription>
              </DialogHeader>
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="site-name">現場名</Label>
                  <Input id="site-name" {...form.register("name")} />
                  {form.formState.errors.name ? (
                    <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="site-address">住所</Label>
                  <Input id="site-address" {...form.register("address")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="site-area">エリア</Label>
                  <select
                    id="site-area"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    {...form.register("site_area")}
                  >
                    {companyRouteOrigins.map((origin) => (
                      <option key={origin.area} value={origin.area}>
                        {origin.areaLabel}
                      </option>
                    ))}
                  </select>
                </div>
                <label className="flex items-center gap-3 rounded-xl bg-secondary px-3 py-3 text-sm font-medium">
                  <input type="checkbox" className="h-4 w-4" {...form.register("is_active")} />
                  稼働中の現場として扱う
                </label>
                <Button type="submit" className="w-full">
                  保存する
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      {loading ? (
        <LoadingState message="現場一覧を読み込んでいます..." showProgress expectedDurationMs={3000} />
      ) : error ? (
        <ErrorState message={error} onRetry={() => void load()} />
      ) : sites.length === 0 ? (
        <EmptyState title="現場がありません" description="最初の現場を追加してください。" />
      ) : (
        <div className="grid gap-3">
          {sites.map((site) => (
            <Card key={site.id}>
              <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 space-y-1">
                  <div className="flex items-start gap-2">
                    <p className="min-w-0 flex-1 break-words font-bold">{site.name}</p>
                    <Badge variant="secondary" className="shrink-0 whitespace-nowrap">
                      {getRouteOrigin(site.site_area ?? "kansai").areaLabel}
                    </Badge>
                    <Badge
                      className={site.is_active ? "shrink-0 whitespace-nowrap bg-emerald-600 text-white" : "shrink-0 whitespace-nowrap bg-destructive text-destructive-foreground"}
                    >
                      {site.is_active ? "稼働中" : "停止中"}
                    </Badge>
                  </div>
                  {site.address ? (
                    <div className="flex flex-wrap items-center gap-3">
                      <a
                        href={getMapLink(site.address)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-sky-700 underline underline-offset-2"
                      >
                        {site.address}
                        <MapPinned className="h-3.5 w-3.5" />
                      </a>
                      <a
                        href={getDirectionsLink(getRouteOrigin(site.site_area ?? "kansai").address, site.address ?? "")}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground underline underline-offset-2 transition hover:text-foreground"
                      >
                        <Route className="h-3.5 w-3.5" />
                        {getRouteOrigin(site.site_area ?? "kansai").routeLabel}
                      </a>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">住所未登録</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => openEdit(site)}>
                    編集
                  </Button>
                  {site.is_active ? (
                    <Button variant="destructive" onClick={() => void handleArchive(site.id)}>
                      <Pause className="h-4 w-4" />
                      停止
                    </Button>
                  ) : (
                    <Button className="bg-emerald-600 text-white hover:bg-emerald-500" onClick={() => void handleActivate(site.id)}>
                      <Play className="h-4 w-4" />
                      稼働
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </PageShell>
  );
}

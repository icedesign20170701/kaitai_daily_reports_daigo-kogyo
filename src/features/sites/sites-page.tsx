import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/page-header";
import { PageShell } from "@/components/app/page-shell";
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
import { Skeleton } from "@/components/ui/skeleton";
import { archiveSite, listSites, upsertSite } from "@/features/sites/site-service";
import type { Site } from "@/types/database";

const siteSchema = z.object({
  name: z.string().min(1, "現場名を入力してください"),
  address: z.string(),
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
      is_active: true,
    },
  });

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listSites(true);
      setSites(data);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "現場一覧の取得に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const openCreate = () => {
    setEditingSite(null);
    form.reset({ name: "", address: "", is_active: true });
    setOpen(true);
  };

  const openEdit = (site: Site) => {
    setEditingSite(site);
    form.reset({
      name: site.name,
      address: site.address ?? "",
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
        <div className="space-y-3">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      ) : error ? (
        <ErrorState message={error} />
      ) : sites.length === 0 ? (
        <EmptyState title="現場がありません" description="最初の現場を追加してください。" />
      ) : (
        <div className="grid gap-3">
          {sites.map((site) => (
            <Card key={site.id}>
              <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-bold">{site.name}</p>
                    <Badge variant={site.is_active ? "default" : "outline"}>{site.is_active ? "稼働中" : "停止"}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{site.address || "住所未登録"}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => openEdit(site)}>
                    編集
                  </Button>
                  {site.is_active ? (
                    <Button variant="destructive" onClick={() => void handleArchive(site.id)}>
                      <Trash2 className="h-4 w-4" />
                      停止
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </PageShell>
  );
}

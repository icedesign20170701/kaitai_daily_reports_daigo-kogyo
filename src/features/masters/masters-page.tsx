import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Plus } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/page-header";
import { PageShell } from "@/components/app/page-shell";
import { EmptyState, ErrorState } from "@/components/app/states";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
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
import { listMasterItems, upsertMasterItem } from "@/features/masters/master-service";
import { cn } from "@/lib/utils";
import type { MasterItem, MasterItemType } from "@/types/database";

const masterSchema = z.object({
  name: z.string().min(1, "項目名を入力してください"),
  sort_order: z.coerce.number().int().min(0),
  is_active: z.boolean(),
});

type MasterFormValues = z.infer<typeof masterSchema>;

const pageLabels: Record<MasterItemType, { title: string; description: string }> = {
  work: { title: "作業項目マスタ", description: "日報入力時の作業内容チェック項目です。" },
  waste: { title: "廃材項目マスタ", description: "日報入力時の廃材種類チェック項目です。" },
  safety: { title: "安全確認項目マスタ", description: "日報入力時の安全確認チェック項目です。" },
  worker: { title: "作業員マスタ", description: "現場に入る作業員の一覧です。" },
  machine: { title: "重機マスタ", description: "現場で利用する重機の一覧です。" },
  vehicle: { title: "車両マスタ", description: "利用する車両の一覧です。" },
  partner: { title: "協力会社マスタ", description: "協力会社の一覧です。" },
};

const routeTypeMap: Record<string, MasterItemType> = {
  "work-items": "work",
  "waste-items": "waste",
  "safety-items": "safety",
  workers: "worker",
  machines: "machine",
  vehicles: "vehicle",
  partners: "partner",
};

export function MastersPage() {
  const { type } = useParams();
  const masterType = (type ? routeTypeMap[type] : null) ?? null;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MasterItem | null>(null);
  const [items, setItems] = useState<MasterItem[]>([]);

  const form = useForm<MasterFormValues>({
    resolver: zodResolver(masterSchema),
    defaultValues: {
      name: "",
      sort_order: 0,
      is_active: true,
    },
  });

  const meta = useMemo(() => (masterType ? pageLabels[masterType] : null), [masterType]);

  const load = useCallback(async () => {
    if (!masterType) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await listMasterItems(masterType, true);
      setItems(data);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "マスタ項目の取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, [masterType]);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setEditingItem(null);
    form.reset({ name: "", sort_order: 0, is_active: true });
    setOpen(true);
  };

  const openEdit = (item: MasterItem) => {
    setEditingItem(item);
    form.reset({ name: item.name, sort_order: item.sort_order, is_active: item.is_active });
    setOpen(true);
  };

  const handleSubmit = form.handleSubmit(async (values) => {
    if (!masterType) {
      return;
    }
    try {
      await upsertMasterItem(masterType, {
        id: editingItem?.id,
        name: values.name,
        sort_order: values.sort_order,
        is_active: values.is_active,
      });
      toast.success(editingItem ? "項目を更新しました" : "項目を追加しました");
      setOpen(false);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "保存に失敗しました");
    }
  });

  if (!masterType || !meta) {
    return (
      <PageShell>
        <ErrorState message="不正なマスタ種別です。" />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        title={meta.title}
        description={meta.description}
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreate}>
                <Plus className="h-4 w-4" />
                項目追加
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingItem ? "項目編集" : "項目追加"}</DialogTitle>
                <DialogDescription>並び順の小さいものが先に表示されます。</DialogDescription>
              </DialogHeader>
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="master-name">項目名</Label>
                  <Input id="master-name" {...form.register("name")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="master-sort">表示順</Label>
                  <Input id="master-sort" type="number" min={0} {...form.register("sort_order")} />
                </div>
                <label className="flex items-center gap-3 rounded-xl bg-secondary px-3 py-3 text-sm font-medium">
                  <input type="checkbox" className="h-4 w-4" {...form.register("is_active")} />
                  有効な項目として表示する
                </label>
                <Button type="submit" className="w-full">
                  保存する
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <Link
          to="/masters/work-items"
          className={cn(buttonVariants({ variant: masterType === "work" ? "default" : "outline", size: "sm" }))}
        >
          作業項目
        </Link>
        <Link
          to="/masters/waste-items"
          className={cn(buttonVariants({ variant: masterType === "waste" ? "default" : "outline", size: "sm" }))}
        >
          廃材項目
        </Link>
        <Link
          to="/masters/safety-items"
          className={cn(buttonVariants({ variant: masterType === "safety" ? "default" : "outline", size: "sm" }))}
        >
          安全確認
        </Link>
        <Link
          to="/masters/workers"
          className={cn(buttonVariants({ variant: masterType === "worker" ? "default" : "outline", size: "sm" }))}
        >
          作業員
        </Link>
        <Link
          to="/masters/machines"
          className={cn(buttonVariants({ variant: masterType === "machine" ? "default" : "outline", size: "sm" }))}
        >
          重機
        </Link>
        <Link
          to="/masters/vehicles"
          className={cn(buttonVariants({ variant: masterType === "vehicle" ? "default" : "outline", size: "sm" }))}
        >
          車両
        </Link>
        <Link
          to="/masters/partners"
          className={cn(buttonVariants({ variant: masterType === "partner" ? "default" : "outline", size: "sm" }))}
        >
          協力会社
        </Link>
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      ) : error ? (
        <ErrorState message={error} />
      ) : items.length === 0 ? (
        <EmptyState title="項目がありません" description="最初の項目を追加してください。" />
      ) : (
        <div className="grid gap-3">
          {items.map((item) => (
            <Card key={item.id}>
              <CardContent className="flex items-center justify-between gap-3 p-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-bold">{item.name}</p>
                    <Badge variant={item.is_active ? "default" : "outline"}>{item.is_active ? "有効" : "無効"}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">表示順: {item.sort_order}</p>
                </div>
                <Button variant="outline" onClick={() => openEdit(item)}>
                  編集
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </PageShell>
  );
}

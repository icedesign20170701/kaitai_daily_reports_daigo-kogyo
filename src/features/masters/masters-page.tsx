import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowDown, ArrowUp, GripVertical, Plus } from "lucide-react";
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
import { listMasterItems, reorderMasterItems, upsertMasterItem } from "@/features/masters/master-service";
import { cn } from "@/lib/utils";
import type { MasterItem, MasterItemType } from "@/types/database";

const masterSchema = z.object({
  name: z.string().min(1, "項目名を入力してください"),
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

const itemLabels: Record<MasterItemType, string> = {
  work: "作業項目",
  waste: "廃材項目",
  safety: "安全確認項目",
  worker: "作業員",
  machine: "重機",
  vehicle: "車両",
  partner: "協力会社",
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
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 100, tolerance: 14 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const form = useForm<MasterFormValues>({
    resolver: zodResolver(masterSchema),
    defaultValues: {
      name: "",
      is_active: true,
    },
  });

  const meta = useMemo(() => (masterType ? pageLabels[masterType] : null), [masterType]);
  const itemLabel = masterType ? itemLabels[masterType] : "";

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
    form.reset({ name: "", is_active: true });
    setOpen(true);
  };

  const openEdit = (item: MasterItem) => {
    setEditingItem(item);
    form.reset({ name: item.name, is_active: item.is_active });
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
        sort_order: editingItem?.sort_order ?? items.length,
        is_active: values.is_active,
      });
      toast.success(editingItem ? "項目を更新しました" : "項目を追加しました");
      setOpen(false);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "保存に失敗しました");
    }
  });

  const persistOrder = async (nextItems: MasterItem[]) => {
    if (!masterType) {
      return;
    }
    const normalizedItems = nextItems.map((item, index) => ({ ...item, sort_order: index }));
    setItems(normalizedItems);
    try {
      await reorderMasterItems(masterType, normalizedItems);
      toast.success("表示順を更新しました");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "表示順の更新に失敗しました");
      await load();
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }

    const currentIndex = items.findIndex((item) => item.id === active.id);
    const targetIndex = items.findIndex((item) => item.id === over.id);
    if (currentIndex === -1 || targetIndex === -1) {
      return;
    }

    await persistOrder(arrayMove(items, currentIndex, targetIndex));
  };

  const moveByArrow = async (itemId: string, direction: -1 | 1) => {
    const currentIndex = items.findIndex((item) => item.id === itemId);
    const targetIndex = currentIndex + direction;
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= items.length) {
      return;
    }

    await persistOrder(arrayMove(items, currentIndex, targetIndex));
  };

  function SortableMasterCard({ item }: { item: MasterItem }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
      id: item.id,
    });
    const index = items.findIndex((currentItem) => currentItem.id === item.id);

    return (
      <div
        ref={setNodeRef}
        style={{
          transform: CSS.Transform.toString(transform),
          transition,
        }}
        className={cn(isDragging && "opacity-60")}
      >
        <Card className={cn(isDragging && "shadow-lg")}>
          <CardContent className="p-4 sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className={cn(
                    "touch-target hidden items-center justify-center cursor-grab rounded-lg border border-transparent p-1 text-muted-foreground transition md:inline-flex",
                    "hover:scale-105 hover:border-border hover:bg-accent hover:text-foreground",
                    "active:cursor-grabbing active:scale-95 active:bg-primary/10",
                    isDragging && "cursor-grabbing border-border bg-accent text-foreground",
                  )}
                  aria-label={`${item.name}を並び替え`}
                  title="ドラッグして並び替え"
                  {...attributes}
                  {...listeners}
                >
                  <GripVertical className="h-4 w-4" />
                </button>
                  <p className="break-all text-base font-bold sm:text-lg">{item.name}</p>
                  <Badge variant={item.is_active ? "default" : "outline"}>{item.is_active ? "有効" : "無効"}</Badge>
                </div>
                <p className="hidden text-sm text-muted-foreground md:block">
                  名前横のアイコンを長押しまたはドラッグして表示順を変更できます
                </p>
                <p className="text-sm leading-6 text-muted-foreground md:hidden">上下ボタンで表示順を変更できます</p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="grid grid-cols-3 gap-2 md:hidden">
                  <Button
                    variant="outline"
                    size="icon"
                    className="w-full"
                    onClick={() => void moveByArrow(item.id, -1)}
                    disabled={index <= 0}
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="w-full"
                    onClick={() => void moveByArrow(item.id, 1)}
                    disabled={index === -1 || index >= items.length - 1}
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" className="w-full" onClick={() => openEdit(item)}>
                    編集
                  </Button>
                </div>
                <Button variant="outline" className="hidden w-full sm:w-auto md:inline-flex" onClick={() => openEdit(item)}>
                  編集
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

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
                <DialogTitle>{editingItem ? `${itemLabel}の編集` : `${itemLabel}の追加`}</DialogTitle>
                <DialogDescription>
                  {editingItem ? `${itemLabel}の登録内容を更新します。` : `新しい${itemLabel}を登録します。`}
                </DialogDescription>
              </DialogHeader>
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="master-name">項目名</Label>
                  <Input id="master-name" {...form.register("name")} />
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
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(event) => void handleDragEnd(event)}>
          <SortableContext items={items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
            <div className="grid gap-3">
              {items.map((item) => (
                <SortableMasterCard key={item.id} item={item} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </PageShell>
  );
}

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { ArrowDown, ArrowUp, ChevronDown, GripVertical, Plus } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/page-header";
import { PageShell } from "@/components/app/page-shell";
import { LoadingState } from "@/components/app/loading-state";
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
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { archiveMasterItem, deleteMasterItem, listMasterItems, reorderMasterItems, upsertMasterItem } from "@/features/masters/master-service";
import { cn, withSupabaseRecovery } from "@/lib/utils";
import type { MasterItem, MasterItemType } from "@/types/database";

function getErrorMessage(error: unknown, fallback: string) {
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
    return error.message;
  }
  return fallback;
}

const masterSchema = z.object({
  name: z.string().min(1, "項目名を入力してください"),
  group_label: z.string().max(100, "100文字以内で入力してください").optional(),
  unit_price: z.coerce.number().min(0, "0以上で入力してください").optional(),
  is_active: z.boolean(),
});

type MasterFormValues = z.infer<typeof masterSchema>;

const pageLabels: Record<MasterItemType, { title: string; description: string }> = {
  worker: { title: "作業員マスタ", description: "従業員一覧です。作業員ラベルに紐づけて管理します。" },
  workerLabel: { title: "作業員ラベルマスタ", description: "所属ラベル、単価、日報入力への有効・無効を管理します。" },
  lease: { title: "リース関係マスタ", description: "ニシコンや城東リースなど、リース先の一覧です。" },
  disposal: { title: "ゴミ処分マスタ", description: "エイシンやRSKなど、処分先の一覧です。" },
  disposalUnit: { title: "ゴミ処分単位マスタ", description: "TC、TL、TPなど、ゴミ処分の数量単位を管理します。" },
  transport: { title: "車両・運搬マスタ", description: "2TC や乗用車など、使用する車両の一覧です。" },
  workCategory: { title: "工事分類マスタ", description: "内装解体工事や土木工事など、工事分類を管理します。" },
};

const itemLabels: Record<MasterItemType, string> = {
  worker: "作業員",
  workerLabel: "作業員ラベル",
  lease: "リース関係",
  disposal: "ゴミ処分",
  disposalUnit: "ゴミ処分単位",
  transport: "車両・運搬",
  workCategory: "工事分類",
};

const routeTypeMap: Record<string, MasterItemType> = {
  workers: "worker",
  "worker-labels": "workerLabel",
  "lease-items": "lease",
  "disposal-items": "disposal",
  "disposal-units": "disposalUnit",
  "transport-items": "transport",
  "work-categories": "workCategory",
};

export function MastersPage() {
  const { type } = useParams();
  const masterType = (type ? routeTypeMap[type] : null) ?? null;
  const formRef = useRef<HTMLFormElement | null>(null);
  const [dialogKey, setDialogKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MasterItem | null>(null);
  const [items, setItems] = useState<MasterItem[]>([]);
  const [workerLabels, setWorkerLabels] = useState<MasterItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<"active" | "inactive">("active");
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 100, tolerance: 14 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const form = useForm<MasterFormValues>({
    resolver: zodResolver(masterSchema),
    defaultValues: {
      name: "",
      group_label: "",
      unit_price: 0,
      is_active: true,
    },
  });

  const meta = useMemo(() => (masterType ? pageLabels[masterType] : null), [masterType]);
  const itemLabel = masterType ? itemLabels[masterType] : "";

  const load = useCallback(async (options?: { silent?: boolean }) => {
    if (!masterType) {
      return;
    }
    if (!options?.silent) {
      setLoading(true);
    }
    setError(null);
    try {
      const data = await withSupabaseRecovery(
        () =>
          masterType === "worker"
            ? Promise.all([listMasterItems(masterType, true), listMasterItems("workerLabel", true)])
            : Promise.all([listMasterItems(masterType, true), Promise.resolve([] as MasterItem[])]),
        5000,
        `${itemLabel || "マスタ"}の読み込みがタイムアウトしました。再度お試しください。`,
      );
      setItems(data[0] ?? []);
      setWorkerLabels(masterType === "worker" ? (data[1] ?? []) : []);
    } catch (nextError) {
      setError(getErrorMessage(nextError, "マスタ項目の取得に失敗しました"));
    } finally {
      if (!options?.silent) {
        setLoading(false);
      }
    }
  }, [itemLabel, masterType]);

  useEffect(() => {
    setStatusFilter("active");
    void load();
  }, [load]);

  const filteredItems = useMemo(() => {
    const activeWorkerLabelNames = new Set(workerLabels.filter((label) => label.is_active).map((label) => label.name.trim()));
    return items.filter((item) => {
      if (statusFilter === "active" ? !item.is_active : item.is_active) {
        return false;
      }

      if (masterType !== "worker") {
        return true;
      }

      const groupLabel = item.group_label?.trim();
      return !groupLabel || activeWorkerLabelNames.has(groupLabel);
    });
  }, [items, masterType, statusFilter, workerLabels]);

  const openCreate = () => {
    setEditingItem(null);
    form.reset({ name: "", group_label: "", unit_price: 0, is_active: true });
    setDialogKey((current) => current + 1);
    setOpen(true);
  };

  const openEdit = (item: MasterItem) => {
    setEditingItem(item);
    form.reset({
      name: item.name,
      group_label: item.group_label ?? "",
      unit_price: item.unit_price ?? 0,
      is_active: item.is_active,
    });
    setDialogKey((current) => current + 1);
    setOpen(true);
  };

  const submitForm = form.handleSubmit(async (values) => {
    if (!masterType) {
      return;
    }
    try {
      await upsertMasterItem(masterType, {
        id: editingItem?.id,
        name: values.name,
        group_label: masterType === "worker" ? values.group_label || null : null,
        unit_price: masterType === "workerLabel" ? values.unit_price ?? 0 : null,
        sort_order: editingItem?.sort_order ?? items.length,
        is_active: values.is_active,
      });
      toast.success(editingItem ? "項目を更新しました" : "項目を追加しました");
      setOpen(false);
      setDialogKey((current) => current + 1);
      form.reset({ name: "", group_label: "", unit_price: 0, is_active: true });
      await load({ silent: true });
    } catch (error) {
      toast.error(getErrorMessage(error, "保存に失敗しました"));
    }
  });

  const triggerSubmit = () => {
    if (form.formState.isSubmitting) {
      return;
    }
    formRef.current?.requestSubmit();
  };

  const handleDelete = async () => {
    if (!masterType || !editingItem) {
      return;
    }

    const isPermanentDelete = !editingItem.is_active;
    const confirmed = window.confirm(
      isPermanentDelete
        ? `「${editingItem.name}」を削除します。\n削除後はマスタ一覧に表示されなくなります。\n過去の日報データにはそのまま残ります。`
        : `「${editingItem.name}」を無効にします。\nこの項目は今後の日報入力では選べなくなります。\n無効タブから確認できます。`,
    );
    if (!confirmed) {
      return;
    }

    try {
      if (isPermanentDelete) {
        await deleteMasterItem(masterType, editingItem);
        toast.success("項目を削除しました");
      } else {
        await archiveMasterItem(masterType, editingItem);
        toast.success("項目を無効にしました");
      }
      setOpen(false);
      setEditingItem(null);
      setDialogKey((current) => current + 1);
      form.reset({ name: "", group_label: "", unit_price: 0, is_active: true });
      await load({ silent: true });
    } catch (error) {
      toast.error(getErrorMessage(error, isPermanentDelete ? "削除に失敗しました" : "無効化に失敗しました"));
    }
  };

  const persistOrder = async (nextFilteredItems: MasterItem[]) => {
    if (!masterType) {
      return;
    }
    const nextFilteredQueue = [...nextFilteredItems];
    const nextItems = items.map((item) => {
      const matchesFilter = statusFilter === "active" ? item.is_active : !item.is_active;
      return matchesFilter ? (nextFilteredQueue.shift() ?? item) : item;
    });
    const normalizedItems = nextItems.map((item, index) => ({ ...item, sort_order: index }));
    setItems(normalizedItems);
    try {
      await reorderMasterItems(masterType, normalizedItems);
      toast.success("表示順を更新しました");
    } catch (error) {
      toast.error(getErrorMessage(error, "表示順の更新に失敗しました"));
      await load({ silent: true });
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }

    const currentIndex = filteredItems.findIndex((item) => item.id === active.id);
    const targetIndex = filteredItems.findIndex((item) => item.id === over.id);
    if (currentIndex === -1 || targetIndex === -1) {
      return;
    }

    await persistOrder(arrayMove(filteredItems, currentIndex, targetIndex));
  };

  const moveByArrow = async (itemId: string, direction: -1 | 1) => {
    const currentIndex = filteredItems.findIndex((item) => item.id === itemId);
    const targetIndex = currentIndex + direction;
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= filteredItems.length) {
      return;
    }

    await persistOrder(arrayMove(filteredItems, currentIndex, targetIndex));
  };

  function SortableMasterCard({ item }: { item: MasterItem }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
      id: item.id,
    });
    const index = filteredItems.findIndex((currentItem) => currentItem.id === item.id);

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
                  {masterType === "worker" && item.group_label ? <Badge variant="outline">{item.group_label}</Badge> : null}
                  {masterType === "workerLabel" ? <Badge variant="outline">単価: {item.unit_price ?? 0}円</Badge> : null}
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
                    disabled={index === -1 || index >= filteredItems.length - 1}
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
          <>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" />
              項目追加
            </Button>
            <Dialog
              open={open}
              onOpenChange={(nextOpen) => {
                setOpen(nextOpen);
                if (!nextOpen) {
                  setDialogKey((current) => current + 1);
                  setEditingItem(null);
                  form.reset({ name: "", group_label: "", unit_price: 0, is_active: true });
                }
              }}
            >
            <DialogContent key={dialogKey}>
              <DialogHeader>
                <DialogTitle>{editingItem ? `${itemLabel}の編集` : `${itemLabel}の追加`}</DialogTitle>
                <DialogDescription>
                  {editingItem ? `${itemLabel}の登録内容を更新します。` : `新しい${itemLabel}を登録します。`}
                </DialogDescription>
              </DialogHeader>
              <form
                ref={formRef}
                className="space-y-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  void submitForm();
                }}
              >
                <div className="space-y-2">
                  <Label htmlFor="master-name">項目名</Label>
                  <Input id="master-name" {...form.register("name")} />
                </div>
                {masterType === "worker" ? (
                  <div className="space-y-2">
                    <Label htmlFor="master-group-label">ラベル</Label>
                    <div className="relative">
                      <select
                        id="master-group-label"
                        className="flex h-11 w-full appearance-none rounded-xl border bg-card px-3 py-2 pr-10 text-left text-base shadow-sm outline-none md:text-sm"
                        value={form.watch("group_label") ?? ""}
                        onChange={(event) => form.setValue("group_label", event.target.value, { shouldDirty: true })}
                      >
                        <option value="">ラベル未設定</option>
                        {workerLabels.filter((label) => label.is_active).map((label) => (
                          <option key={label.id} value={label.name}>
                            {label.name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground opacity-70" />
                    </div>
                    <p className="text-xs text-muted-foreground">※ラベルは「作業員ラベルマスタ」で管理します。</p>
                  </div>
                ) : null}
                {masterType === "workerLabel" ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="master-unit-price">単価</Label>
                      <Input id="master-unit-price" type="number" min={0} step={1} {...form.register("unit_price", { valueAsNumber: true })} />
                    </div>
                  </>
                ) : null}
                <label className="flex items-center gap-3 rounded-xl bg-secondary px-3 py-3 text-sm font-medium">
                  <input type="checkbox" className="h-4 w-4" {...form.register("is_active")} />
                  有効な項目として表示する
                </label>
                <div className="sticky bottom-0 -mx-6 mt-6 px-6 pb-1 pt-4">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Button
                      type="button"
                      className="w-full"
                      size="lg"
                      onClick={triggerSubmit}
                      onTouchEnd={(event) => {
                        event.preventDefault();
                        triggerSubmit();
                      }}
                    >
                      保存する
                    </Button>
                    {editingItem && !editingItem.is_active ? (
                      <Button type="button" variant="destructive" className="w-full" size="lg" onClick={() => void handleDelete()}>
                        削除
                      </Button>
                    ) : null}
                  </div>
                </div>
              </form>
            </DialogContent>
            </Dialog>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <Link
          to="/masters/work-categories"
          className={cn(buttonVariants({ variant: masterType === "workCategory" ? "default" : "outline", size: "sm" }))}
        >
          工事分類
        </Link>
        <Link
          to="/masters/lease-items"
          className={cn(buttonVariants({ variant: masterType === "lease" ? "default" : "outline", size: "sm" }))}
        >
          リース関係
        </Link>
        <Link
          to="/masters/disposal-items"
          className={cn(buttonVariants({ variant: masterType === "disposal" ? "default" : "outline", size: "sm" }))}
        >
          ゴミ処分
        </Link>
        <Link
          to="/masters/disposal-units"
          className={cn(buttonVariants({ variant: masterType === "disposalUnit" ? "default" : "outline", size: "sm" }))}
        >
          ゴミ処分単位
        </Link>
        <Link
          to="/masters/transport-items"
          className={cn(buttonVariants({ variant: masterType === "transport" ? "default" : "outline", size: "sm" }))}
        >
          車両・運搬
        </Link>
        <Link
          to="/masters/worker-labels"
          className={cn(buttonVariants({ variant: masterType === "workerLabel" ? "default" : "outline", size: "sm" }))}
        >
          作業員ラベル
        </Link>
        <Link
          to="/masters/workers"
          className={cn(buttonVariants({ variant: masterType === "worker" ? "default" : "outline", size: "sm" }))}
        >
          作業員
        </Link>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border bg-card p-2">
        <Button
          type="button"
          size="sm"
          variant={statusFilter === "active" ? "default" : "outline"}
          onClick={() => setStatusFilter("active")}
        >
          有効
        </Button>
        <Button
          type="button"
          size="sm"
          variant={statusFilter === "inactive" ? "default" : "outline"}
          onClick={() => setStatusFilter("inactive")}
        >
          無効
        </Button>
      </div>

      {loading ? (
        <LoadingState message={`${itemLabel || "マスタ"}を読み込んでいます...`} showProgress expectedDurationMs={3000} />
      ) : error ? (
        <ErrorState message={error} onRetry={() => void load()} />
      ) : filteredItems.length === 0 ? (
        <EmptyState
          title={statusFilter === "active" ? "有効な項目がありません" : "無効な項目がありません"}
          description={statusFilter === "active" ? "項目を追加するか、無効な項目を有効にしてください。" : "無効にした項目はここに表示されます。"}
        />
      ) : open ? (
        <div className="grid gap-3">
          {filteredItems.map((item) => (
            <SortableMasterCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(event) => void handleDragEnd(event)}>
          <SortableContext items={filteredItems.map((item) => item.id)} strategy={verticalListSortingStrategy}>
            <div className="grid gap-3">
              {filteredItems.map((item) => (
                <SortableMasterCard key={item.id} item={item} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </PageShell>
  );
}

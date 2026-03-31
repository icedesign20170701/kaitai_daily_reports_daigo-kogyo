import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarDays, ImagePlus, LoaderCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { storageService } from "@/lib/storage-service";
import { cn, toDateInputValue } from "@/lib/utils";
import type { DailyReportDetail, MasterItem, ReportFormValues, ReportPhoto, Site } from "@/types/database";

const reportSchema = z.object({
  report_date: z.string().min(1, "日付を入力してください"),
  site_id: z.string().min(1, "現場を選択してください"),
  work_item_ids: z.array(z.string()),
  waste_item_ids: z.array(z.string()),
  safety_item_ids: z.array(z.string()),
  worker_ids: z.array(z.string()).min(1, "作業員を1人以上選択してください"),
  machine_ids: z.array(z.string()),
  vehicle_ids: z.array(z.string()),
  partner_company_ids: z.array(z.string()),
  tomorrow_plan: z.string().max(500, "500文字以内で入力してください"),
  note: z.string().max(1000, "1000文字以内で入力してください"),
});

type ReportSchemaValues = z.infer<typeof reportSchema>;

function ChecklistSection({
  title,
  description,
  items,
  values,
  onToggle,
}: {
  title: string;
  description: string;
  items: MasterItem[];
  values: string[];
  onToggle: (itemId: string, checked: boolean) => void;
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2.5">
        {items.map((item) => (
          <label
            key={item.id}
            className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border bg-background px-3 py-2.5 text-sm font-medium transition hover:bg-accent/50"
          >
            <Checkbox checked={values.includes(item.id)} onCheckedChange={(checked) => onToggle(item.id, checked === true)} />
            <span className="leading-5">{item.name}</span>
          </label>
        ))}
      </CardContent>
    </Card>
  );
}

function PhotoPreview({
  photo,
  onRemove,
}: {
  photo: { id: string; url: string; name: string };
  onRemove: () => void;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border bg-card">
      <img src={photo.url} alt={photo.name} className="h-32 w-full object-cover" />
      <button
        type="button"
        className="absolute right-2 top-2 rounded-full bg-black/60 p-2 text-white"
        onClick={onRemove}
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

function DateField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="relative block overflow-hidden rounded-xl border bg-card px-3 py-3 shadow-sm">
      <input
        type="date"
        className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-sm font-medium">{value}</span>
        <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
      </div>
    </label>
  );
}

export function ReportForm({
  sites,
  workItems,
  wasteItems,
  safetyItems,
  workers,
  machines,
  vehicles,
  partners,
  initialReport,
  submitting,
  onSubmit,
  onDeleteExistingPhoto,
}: {
  sites: Site[];
  workItems: MasterItem[];
  wasteItems: MasterItem[];
  safetyItems: MasterItem[];
  workers: MasterItem[];
  machines: MasterItem[];
  vehicles: MasterItem[];
  partners: MasterItem[];
  initialReport?: DailyReportDetail;
  submitting: boolean;
  onSubmit: (values: ReportFormValues, files: File[]) => Promise<void>;
  onDeleteExistingPhoto?: (photo: ReportPhoto) => Promise<void>;
}) {
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const form = useForm<ReportSchemaValues>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      report_date: initialReport?.report_date ?? toDateInputValue(),
      site_id: initialReport?.site_id ?? "",
      work_item_ids: initialReport?.work_items.map((item) => item.id) ?? [],
      waste_item_ids: initialReport?.waste_items.map((item) => item.id) ?? [],
      safety_item_ids: initialReport?.safety_items.map((item) => item.id) ?? [],
      worker_ids: initialReport?.workers.map((item) => item.id) ?? [],
      machine_ids: initialReport?.machines.map((item) => item.id) ?? [],
      vehicle_ids: initialReport?.vehicles.map((item) => item.id) ?? [],
      partner_company_ids: initialReport?.partner_companies.map((item) => item.id) ?? [],
      tomorrow_plan: initialReport?.tomorrow_plan ?? "",
      note: initialReport?.note ?? "",
    },
  });

  const selectedWorkerCount = form.watch("worker_ids").length;

  const previewPhotos = useMemo(
    () =>
      pendingFiles.map((file, index) => ({
        id: `${file.name}-${index}`,
        index,
        name: file.name,
        url: URL.createObjectURL(file),
      })),
    [pendingFiles],
  );

  const existingPhotos = initialReport?.photos.map((photo) => ({
    ...photo,
    url: storageService.getPublicUrl(photo.image_path),
  })) ?? [];

  const updateMultiSelect = (
    name:
      | "work_item_ids"
      | "waste_item_ids"
      | "safety_item_ids"
      | "worker_ids"
      | "machine_ids"
      | "vehicle_ids"
      | "partner_company_ids",
    itemId: string,
    checked: boolean,
  ) => {
    const current = form.getValues(name);
    form.setValue(
      name,
      checked ? [...current, itemId] : current.filter((value) => value !== itemId),
      { shouldDirty: true },
    );
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) {
      return;
    }
    setPendingFiles((current) => [...current, ...files]);
    event.target.value = "";
  };

  const submit = form.handleSubmit(async (values) => {
    try {
      await onSubmit(
        {
          ...values,
          worker_count: values.worker_ids.length,
        },
        pendingFiles,
      );
      setPendingFiles([]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "保存に失敗しました");
    }
  });

  return (
    <form className="space-y-4" onSubmit={submit}>
      <Card>
        <CardHeader>
          <CardTitle>{initialReport ? "日報を編集" : "日報を入力"}</CardTitle>
          <CardDescription>1画面で完結する入力に絞っています。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="report_date">日付</Label>
              <DateField
                value={form.watch("report_date")}
                onChange={(value) => form.setValue("report_date", value, { shouldDirty: true })}
              />
              {form.formState.errors.report_date ? (
                <p className="text-sm text-destructive">{form.formState.errors.report_date.message}</p>
              ) : null}
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>現場</Label>
              <Select value={form.watch("site_id")} onValueChange={(value) => form.setValue("site_id", value, { shouldDirty: true })}>
                <SelectTrigger>
                  <SelectValue placeholder="現場を選択してください" />
                </SelectTrigger>
                <SelectContent>
                  {sites.map((site) => (
                    <SelectItem key={site.id} value={site.id}>
                      {site.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.site_id ? (
                <p className="text-sm text-destructive">{form.formState.errors.site_id.message}</p>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>

      <ChecklistSection
        title="作業内容"
        description="実施した作業を選択してください"
        items={workItems}
        values={form.watch("work_item_ids")}
        onToggle={(itemId, checked) => updateMultiSelect("work_item_ids", itemId, checked)}
      />

      <ChecklistSection
        title="廃材種類"
        description="発生した廃材を選択してください"
        items={wasteItems}
        values={form.watch("waste_item_ids")}
        onToggle={(itemId, checked) => updateMultiSelect("waste_item_ids", itemId, checked)}
      />

      <ChecklistSection
        title="安全確認"
        description="確認した安全項目を選択してください"
        items={safetyItems}
        values={form.watch("safety_item_ids")}
        onToggle={(itemId, checked) => updateMultiSelect("safety_item_ids", itemId, checked)}
      />

      <ChecklistSection
        title="作業員"
        description="本日入場した作業員を選択してください"
        items={workers}
        values={form.watch("worker_ids")}
        onToggle={(itemId, checked) => updateMultiSelect("worker_ids", itemId, checked)}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">作業人数</CardTitle>
          <CardDescription>選択した作業員数から自動計算します。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 pt-0">
          <p className="rounded-xl bg-secondary px-4 py-3 text-sm font-medium text-secondary-foreground">
            現在の作業人数: {selectedWorkerCount}人
          </p>
          {form.formState.errors.worker_ids ? (
            <p className="text-sm text-destructive">{form.formState.errors.worker_ids.message}</p>
          ) : null}
        </CardContent>
      </Card>

      <ChecklistSection
        title="重機"
        description="使用した重機を選択してください"
        items={machines}
        values={form.watch("machine_ids")}
        onToggle={(itemId, checked) => updateMultiSelect("machine_ids", itemId, checked)}
      />

      <ChecklistSection
        title="車両"
        description="使用した車両を選択してください"
        items={vehicles}
        values={form.watch("vehicle_ids")}
        onToggle={(itemId, checked) => updateMultiSelect("vehicle_ids", itemId, checked)}
      />

      <ChecklistSection
        title="協力会社"
        description="関わった協力会社を選択してください"
        items={partners}
        values={form.watch("partner_company_ids")}
        onToggle={(itemId, checked) => updateMultiSelect("partner_company_ids", itemId, checked)}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">備考</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tomorrow_plan">明日の予定</Label>
            <Textarea id="tomorrow_plan" placeholder="例: 2階内装解体、廃材搬出" {...form.register("tomorrow_plan")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="note">補足メモ</Label>
            <Textarea id="note" placeholder="注意点や申し送りを入力" {...form.register("note")} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">写真</CardTitle>
          <CardDescription>作業写真を複数枚アップロードできます。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed bg-background px-4 py-8 text-sm font-medium">
            <ImagePlus className="h-5 w-5" />
            写真を追加
            <input type="file" accept="image/*" multiple className="hidden" onChange={handleFileChange} />
          </label>

          {(existingPhotos.length > 0 || previewPhotos.length > 0) && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {existingPhotos.map((photo) => (
                <PhotoPreview
                  key={photo.id}
                  photo={{ id: photo.id, url: photo.url, name: photo.caption ?? "登録済み写真" }}
                  onRemove={() => {
                    if (!onDeleteExistingPhoto) {
                      return;
                    }
                    void onDeleteExistingPhoto(photo);
                  }}
                />
              ))}
              {previewPhotos.map((photo) => (
                <PhotoPreview
                  key={photo.id}
                  photo={photo}
                  onRemove={() => setPendingFiles((current) => current.filter((_, index) => index !== photo.index))}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Button type="submit" className="w-full md:w-auto" size="lg" disabled={submitting}>
        {submitting ? (
          <>
            <LoaderCircle className="h-4 w-4 animate-spin" />
            保存中...
          </>
        ) : initialReport ? (
          "更新する"
        ) : (
          "保存する"
        )}
      </Button>

      <Link
        to="/reports"
        className={cn(buttonVariants({ variant: "outline", size: "lg" }), "w-full md:hidden")}
      >
        一覧に戻る
      </Link>
    </form>
  );
}

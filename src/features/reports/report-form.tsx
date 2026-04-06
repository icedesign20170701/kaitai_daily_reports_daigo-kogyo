import { useMemo, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarDays, ChevronDown, ImagePlus, LoaderCircle, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Button, buttonVariants } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { storageService } from "@/lib/storage-service";
import { cn, formatDate, toDateInputValue } from "@/lib/utils";
import type {
  DailyReportDetail,
  MasterItem,
  OtherVehicleEntry,
  ReportDisposalEntry,
  ReportFormValues,
  ReportLeaseEntry,
  ReportPhoto,
  ReportTransportEntry,
  Site,
} from "@/types/database";

const numberOptions = Array.from({ length: 11 }, (_, index) => index);

const reportSchema = z.object({
  report_date: z.string().min(1, "作業日を入力してください"),
  site_id: z.string().min(1, "現場名を選択してください"),
  worker_ids: z.array(z.string()).min(1, "作業員を1人以上選択してください"),
  work_shift: z.enum(["day", "night"]),
  contract_type: z.enum(["contract", "regular"]),
  miscellaneous_costs: z.string().max(3000, "3000文字以内で入力してください"),
  lease_entries: z.array(
    z.object({
      lease_item_id: z.string().min(1),
      count: z.coerce.number().min(0),
    }),
  ),
  disposal_entries: z.array(
    z.object({
      disposal_item_id: z.string().min(1),
      ton_count: z.coerce.number().min(0),
      truck_count: z.coerce.number().min(0),
    }),
  ),
  transport_entries: z.array(
    z.object({
      transport_item_id: z.string().min(1),
      count: z.coerce.number().min(0),
    }),
  ),
  other_vehicle_entries: z.array(
    z.object({
      label: z.string().max(100, "100文字以内で入力してください"),
      count: z.coerce.number().min(0),
    }),
  ),
  other_workers_note: z.string().max(1000, "1000文字以内で入力してください"),
  remarks: z.string().max(2000, "2000文字以内で入力してください"),
  progress_status: z.enum(["continuing", "completed"]),
});

type ReportSchemaValues = z.infer<typeof reportSchema>;

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
      <button type="button" className="absolute right-2 top-2 rounded-full bg-black/60 p-2 text-white" onClick={onRemove}>
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

function DateField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const selectedDate = value ? new Date(`${value}T00:00:00`) : undefined;
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className="flex w-full items-center justify-between gap-2 overflow-hidden rounded-xl border bg-card px-3 py-3 text-left shadow-sm">
          <span className="truncate text-sm font-medium">{selectedDate ? formatDate(value) : "日付を選択してください"}</span>
          <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-3">
        <Calendar
          mode="single"
          selected={selectedDate}
          defaultMonth={selectedDate}
          onSelect={(date) => {
            if (!date) return;
            onChange(format(date, "yyyy-MM-dd"));
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

function ChoiceButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "min-h-12 rounded-xl border px-4 py-3 text-sm font-semibold transition",
        active ? "border-primary bg-primary text-primary-foreground shadow-soft" : "bg-background hover:bg-accent/50",
      )}
    >
      {label}
    </button>
  );
}

function FieldBlock({ title, required, children }: { title: string; required?: boolean; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">
          {title}
          {required ? <span className="ml-1 text-destructive">*</span> : null}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">{children}</CardContent>
    </Card>
  );
}

function WorkerGroup({
  title,
  items,
  values,
  onToggle,
}: {
  title: string;
  items: MasterItem[];
  values: string[];
  onToggle: (itemId: string, checked: boolean) => void;
}) {
  if (items.length === 0) return null;

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold">{title}</p>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => {
          const checked = values.includes(item.id);
          return (
            <label
              key={item.id}
              className={cn(
                "inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium transition",
                checked ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-accent/50",
              )}
            >
              <Checkbox checked={checked} onCheckedChange={(next) => onToggle(item.id, next === true)} />
              <span>{item.name}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

function QuantitySelect({
  value,
  onChange,
  placeholder = "0",
}: {
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
}) {
  return (
    <Select value={String(value)} onValueChange={(next) => onChange(Number(next))}>
      <SelectTrigger className="w-[88px]">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {numberOptions.map((option) => (
          <SelectItem key={option} value={String(option)}>
            {option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function LeaseItemRows({
  item,
  rows,
  onAdd,
  onRemove,
  onChange,
}: {
  item: MasterItem;
  rows: Array<{ fieldIndex: number; entry: ReportLeaseEntry }>;
  onAdd: () => void;
  onRemove: (index: number) => void;
  onChange: (index: number, value: number) => void;
}) {
  return (
    <div className="rounded-2xl border bg-background p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="font-semibold">{item.name}</p>
        <Button type="button" variant="outline" size="sm" onClick={onAdd}>
          <Plus className="h-4 w-4" />
          追加
        </Button>
      </div>
      <div className="space-y-2">
        {rows.length === 0 ? <p className="text-sm text-muted-foreground">追加ボタンで入力欄を増やせます。</p> : null}
        {rows.map(({ fieldIndex, entry }, index) => (
          <div key={`${item.id}-${fieldIndex}`} className="flex items-center gap-2 rounded-xl border px-3 py-2">
            <span className="text-sm font-medium">{index + 1}.</span>
            <QuantitySelect value={entry.count} onChange={(value) => onChange(fieldIndex, value)} />
            <span className="text-sm">台</span>
            <Button type="button" variant="ghost" size="icon" className="ml-auto" onClick={() => onRemove(fieldIndex)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

function DisposalItemRows({
  item,
  rows,
  onAdd,
  onRemove,
  onChangeTon,
  onChangeTruck,
}: {
  item: MasterItem;
  rows: Array<{ fieldIndex: number; entry: ReportDisposalEntry }>;
  onAdd: () => void;
  onRemove: (index: number) => void;
  onChangeTon: (index: number, value: number) => void;
  onChangeTruck: (index: number, value: number) => void;
}) {
  return (
    <div className="rounded-2xl border bg-background p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="font-semibold">{item.name}</p>
        <Button type="button" variant="outline" size="sm" onClick={onAdd}>
          <Plus className="h-4 w-4" />
          追加
        </Button>
      </div>
      <div className="space-y-2">
        {rows.length === 0 ? <p className="text-sm text-muted-foreground">追加ボタンで入力欄を増やせます。</p> : null}
        {rows.map(({ fieldIndex, entry }, index) => (
          <div key={`${item.id}-${fieldIndex}`} className="flex flex-wrap items-center gap-2 rounded-xl border px-3 py-2">
            <span className="text-sm font-medium">{index + 1}.</span>
            <QuantitySelect value={entry.ton_count} onChange={(value) => onChangeTon(fieldIndex, value)} />
            <span className="text-sm">T</span>
            <QuantitySelect value={entry.truck_count} onChange={(value) => onChangeTruck(fieldIndex, value)} />
            <span className="text-sm">台</span>
            <Button type="button" variant="ghost" size="icon" className="ml-auto" onClick={() => onRemove(fieldIndex)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

function TransportItemRows({
  item,
  rows,
  onAdd,
  onRemove,
  onChange,
}: {
  item: MasterItem;
  rows: Array<{ fieldIndex: number; entry: ReportTransportEntry }>;
  onAdd: () => void;
  onRemove: (index: number) => void;
  onChange: (index: number, value: number) => void;
}) {
  return (
    <div className="rounded-2xl border bg-background p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="font-semibold">{item.name}</p>
        <Button type="button" variant="outline" size="sm" onClick={onAdd}>
          <Plus className="h-4 w-4" />
          追加
        </Button>
      </div>
      <div className="space-y-2">
        {rows.length === 0 ? <p className="text-sm text-muted-foreground">追加ボタンで入力欄を増やせます。</p> : null}
        {rows.map(({ fieldIndex, entry }, index) => (
          <div key={`${item.id}-${fieldIndex}`} className="flex items-center gap-2 rounded-xl border px-3 py-2">
            <span className="text-sm font-medium">{index + 1}.</span>
            <QuantitySelect value={entry.count} onChange={(value) => onChange(fieldIndex, value)} />
            <span className="text-sm">台</span>
            <Button type="button" variant="ghost" size="icon" className="ml-auto" onClick={() => onRemove(fieldIndex)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

function OtherVehicleRows({
  rows,
  onAdd,
  onRemove,
  onChangeLabel,
  onChangeCount,
}: {
  rows: Array<{ fieldIndex: number; entry: OtherVehicleEntry }>;
  onAdd: () => void;
  onRemove: (index: number) => void;
  onChangeLabel: (index: number, value: string) => void;
  onChangeCount: (index: number, value: number) => void;
}) {
  return (
    <div className="rounded-2xl border bg-background p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="font-semibold">その他車両</p>
        <Button type="button" variant="outline" size="sm" onClick={onAdd}>
          <Plus className="h-4 w-4" />
          追加
        </Button>
      </div>
      <div className="space-y-2">
        {rows.length === 0 ? <p className="text-sm text-muted-foreground">追加ボタンで自由入力の車両欄を増やせます。</p> : null}
        {rows.map(({ fieldIndex, entry }) => (
          <div key={`other-vehicle-${fieldIndex}`} className="grid gap-2 rounded-xl border p-3 sm:grid-cols-[1fr_auto_auto] sm:items-center">
            <Input value={entry.label} onChange={(event) => onChangeLabel(fieldIndex, event.target.value)} placeholder="車両名を入力" />
            <div className="flex items-center gap-2">
              <QuantitySelect value={entry.count} onChange={(value) => onChangeCount(fieldIndex, value)} />
              <span className="text-sm">台</span>
            </div>
            <Button type="button" variant="ghost" size="icon" className="justify-self-end" onClick={() => onRemove(fieldIndex)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ReportForm({
  sites,
  workers,
  leaseItems,
  disposalItems,
  transportItems,
  reporterName,
  initialReport,
  submitting,
  onSubmit,
  onDeleteExistingPhoto,
}: {
  sites: Site[];
  workers: MasterItem[];
  leaseItems: MasterItem[];
  disposalItems: MasterItem[];
  transportItems: MasterItem[];
  reporterName?: string | null;
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
      worker_ids: initialReport?.workers.map((item) => item.id) ?? [],
      work_shift: initialReport?.work_shift ?? "day",
      contract_type: initialReport?.contract_type ?? "contract",
      miscellaneous_costs: initialReport?.miscellaneous_costs ?? "",
      lease_entries: initialReport?.lease_entries.map((entry) => ({ lease_item_id: entry.lease_item_id, count: entry.count })) ?? [],
      disposal_entries:
        initialReport?.disposal_entries.map((entry) => ({
          disposal_item_id: entry.disposal_item_id,
          ton_count: entry.ton_count,
          truck_count: entry.truck_count,
        })) ?? [],
      transport_entries:
        initialReport?.transport_entries.map((entry) => ({
          transport_item_id: entry.transport_item_id,
          count: entry.count,
        })) ?? [],
      other_vehicle_entries: initialReport?.other_vehicle_entries ?? [],
      other_workers_note: initialReport?.other_workers_note ?? "",
      remarks: initialReport?.remarks ?? "",
      progress_status: initialReport?.progress_status ?? "continuing",
    },
  });

  const leaseArray = useFieldArray({ control: form.control, name: "lease_entries" });
  const disposalArray = useFieldArray({ control: form.control, name: "disposal_entries" });
  const transportArray = useFieldArray({ control: form.control, name: "transport_entries" });
  const otherVehicleArray = useFieldArray({ control: form.control, name: "other_vehicle_entries" });

  const selectedWorkerCount = form.watch("worker_ids").length;
  const workerIds = form.watch("worker_ids");
  const leaseEntries = form.watch("lease_entries");
  const disposalEntries = form.watch("disposal_entries");
  const transportEntries = form.watch("transport_entries");
  const otherVehicleEntries = form.watch("other_vehicle_entries");

  const workerGroups = useMemo(() => {
    const groups = new Map<string, MasterItem[]>();
    workers.forEach((worker) => {
      const label = worker.group_label?.trim() || "ラベル未設定";
      const list = groups.get(label) ?? [];
      list.push(worker);
      groups.set(label, list);
    });
    return Array.from(groups.entries()).map(([label, items]) => ({ label, items }));
  }, [workers]);

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

  const existingPhotos =
    initialReport?.photos.map((photo) => ({
      ...photo,
      url: storageService.getPublicUrl(photo.image_path),
    })) ?? [];

  const updateWorkerSelection = (itemId: string, checked: boolean) => {
    form.setValue("worker_ids", checked ? [...workerIds, itemId] : workerIds.filter((value) => value !== itemId), {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;
    setPendingFiles((current) => [...current, ...files]);
    event.target.value = "";
  };

  const submit = form.handleSubmit(async (values) => {
    try {
      await onSubmit({ ...values, worker_count: values.worker_ids.length }, pendingFiles);
      setPendingFiles([]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "保存に失敗しました");
    }
  });

  return (
    <form className="space-y-4" onSubmit={submit}>
      <Card>
        <CardHeader>
          <CardTitle>{initialReport ? "大吾興業工事作業日報の編集" : "大吾興業工事作業日報"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>記入者名</Label>
            <div className="rounded-xl border bg-background px-3 py-3">
              <p className="text-sm font-semibold">{reporterName || "未設定"}</p>
              {!reporterName ? <p className="mt-1 text-xs text-muted-foreground">名前が未設定です。設定画面の「表示名」から記入者名を登録してください。</p> : null}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
            <div className="space-y-2">
              <Label htmlFor="report_date">
                作業日<span className="ml-1 text-destructive">*</span>
              </Label>
              <DateField value={form.watch("report_date")} onChange={(value) => form.setValue("report_date", value, { shouldDirty: true, shouldValidate: true })} />
              {form.formState.errors.report_date ? <p className="text-sm text-destructive">{form.formState.errors.report_date.message}</p> : null}
            </div>
            <div className="min-w-0 space-y-2">
              <Label>
                現場名<span className="ml-1 text-destructive">*</span>
              </Label>
              <div className="relative">
                <select
                  className="flex h-11 w-full appearance-none rounded-xl border bg-card px-3 py-2 pr-10 text-left text-base shadow-sm outline-none md:text-sm"
                  value={form.watch("site_id")}
                  onChange={(event) => form.setValue("site_id", event.target.value, { shouldDirty: true, shouldValidate: true })}
                >
                  <option value="">現場を選択してください</option>
                  {sites.map((site) => (
                    <option key={site.id} value={site.id}>
                      {site.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground opacity-70" />
              </div>
              {form.formState.errors.site_id ? <p className="text-sm text-destructive">{form.formState.errors.site_id.message}</p> : null}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <FieldBlock title="勤務区分" required>
              <div className="grid grid-cols-2 gap-2">
                <ChoiceButton label="昼勤" active={form.watch("work_shift") === "day"} onClick={() => form.setValue("work_shift", "day", { shouldDirty: true })} />
                <ChoiceButton label="夜勤" active={form.watch("work_shift") === "night"} onClick={() => form.setValue("work_shift", "night", { shouldDirty: true })} />
              </div>
            </FieldBlock>
            <FieldBlock title="契約区分" required>
              <div className="grid grid-cols-2 gap-2">
                <ChoiceButton label="請負" active={form.watch("contract_type") === "contract"} onClick={() => form.setValue("contract_type", "contract", { shouldDirty: true })} />
                <ChoiceButton label="常用" active={form.watch("contract_type") === "regular"} onClick={() => form.setValue("contract_type", "regular", { shouldDirty: true })} />
              </div>
            </FieldBlock>
          </div>

          <FieldBlock title="諸経費（消耗品等）">
            <Textarea rows={7} placeholder="高速代金 : 台 円 などを入力" {...form.register("miscellaneous_costs")} />
          </FieldBlock>

          {leaseItems.length > 0 ? (
            <FieldBlock title="リース関係">
              <div className="grid gap-3 xl:grid-cols-3">
                {leaseItems.map((item) => (
                  <LeaseItemRows
                    key={item.id}
                    item={item}
                    rows={leaseEntries
                      .map((entry, index) => ({ fieldIndex: index, entry }))
                      .filter(({ entry }) => entry.lease_item_id === item.id)}
                    onAdd={() => leaseArray.append({ lease_item_id: item.id, count: 0 })}
                    onRemove={(index) => leaseArray.remove(index)}
                    onChange={(index, value) => form.setValue(`lease_entries.${index}.count`, value, { shouldDirty: true })}
                  />
                ))}
              </div>
            </FieldBlock>
          ) : null}

          {disposalItems.length > 0 ? (
            <FieldBlock title="ゴミ処分">
              <div className="grid gap-3 xl:grid-cols-2">
                {disposalItems.map((item) => (
                  <DisposalItemRows
                    key={item.id}
                    item={item}
                    rows={disposalEntries
                      .map((entry, index) => ({ fieldIndex: index, entry }))
                      .filter(({ entry }) => entry.disposal_item_id === item.id)}
                    onAdd={() => disposalArray.append({ disposal_item_id: item.id, ton_count: 0, truck_count: 0 })}
                    onRemove={(index) => disposalArray.remove(index)}
                    onChangeTon={(index, value) => form.setValue(`disposal_entries.${index}.ton_count`, value, { shouldDirty: true })}
                    onChangeTruck={(index, value) => form.setValue(`disposal_entries.${index}.truck_count`, value, { shouldDirty: true })}
                  />
                ))}
              </div>
            </FieldBlock>
          ) : null}

          {transportItems.length > 0 ? (
            <FieldBlock title="車両・運搬">
              <div className="grid gap-3 xl:grid-cols-2">
                {transportItems.map((item) => (
                  <TransportItemRows
                    key={item.id}
                    item={item}
                    rows={transportEntries
                      .map((entry, index) => ({ fieldIndex: index, entry }))
                      .filter(({ entry }) => entry.transport_item_id === item.id)}
                    onAdd={() => transportArray.append({ transport_item_id: item.id, count: 0 })}
                    onRemove={(index) => transportArray.remove(index)}
                    onChange={(index, value) => form.setValue(`transport_entries.${index}.count`, value, { shouldDirty: true })}
                  />
                ))}
              </div>
              <OtherVehicleRows
                rows={otherVehicleEntries.map((entry, index) => ({ fieldIndex: index, entry }))}
                onAdd={() => otherVehicleArray.append({ label: "", count: 0 })}
                onRemove={(index) => otherVehicleArray.remove(index)}
                onChangeLabel={(index, value) => form.setValue(`other_vehicle_entries.${index}.label`, value, { shouldDirty: true })}
                onChangeCount={(index, value) => form.setValue(`other_vehicle_entries.${index}.count`, value, { shouldDirty: true })}
              />
            </FieldBlock>
          ) : null}

          <FieldBlock title="作業員・その他備考" required>
            <div className="rounded-xl bg-secondary/60 px-3 py-2 text-sm font-medium">作業人数: {selectedWorkerCount}人</div>
            {workerGroups.map((group) => (
              <WorkerGroup key={group.label} title={group.label} items={group.items} values={workerIds} onToggle={updateWorkerSelection} />
            ))}
            {form.formState.errors.worker_ids ? <p className="text-sm text-destructive">{form.formState.errors.worker_ids.message}</p> : null}
            <div className="space-y-2">
              <Label htmlFor="other_workers_note">上記以外の従業員</Label>
              <Textarea id="other_workers_note" rows={4} placeholder="マスタに未登録の従業員がいれば入力" {...form.register("other_workers_note")} />
            </div>
          </FieldBlock>

          <FieldBlock title="備考">
            <Textarea id="remarks" rows={5} placeholder="備考を入力してください" {...form.register("remarks")} />
          </FieldBlock>

          <FieldBlock title="作業進行" required>
            <div className="grid grid-cols-2 gap-2">
              <ChoiceButton label="継続" active={form.watch("progress_status") === "continuing"} onClick={() => form.setValue("progress_status", "continuing", { shouldDirty: true })} />
              <ChoiceButton label="終了" active={form.watch("progress_status") === "completed"} onClick={() => form.setValue("progress_status", "completed", { shouldDirty: true })} />
            </div>
          </FieldBlock>

          <FieldBlock title="写真">
            <label className="flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed bg-secondary/40 text-center">
              <ImagePlus className="mb-2 h-6 w-6 text-primary" />
              <span className="text-sm font-medium">写真を追加</span>
              <span className="text-xs text-muted-foreground">複数選択できます</span>
              <input type="file" multiple accept="image/*" className="hidden" onChange={handleFileChange} />
            </label>

            {existingPhotos.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm font-semibold">登録済み写真</p>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {existingPhotos.map((photo) => (
                    <PhotoPreview key={photo.id} photo={{ id: photo.id, url: photo.url, name: "登録済み写真" }} onRemove={() => void onDeleteExistingPhoto?.(photo)} />
                  ))}
                </div>
              </div>
            ) : null}

            {previewPhotos.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm font-semibold">アップロード予定</p>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {previewPhotos.map((photo) => (
                    <PhotoPreview key={photo.id} photo={photo} onRemove={() => setPendingFiles((current) => current.filter((_, index) => index !== photo.index))} />
                  ))}
                </div>
              </div>
            ) : null}
          </FieldBlock>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? (
            <>
              <LoaderCircle className="h-4 w-4 animate-spin" />
              保存中...
            </>
          ) : (
            "保存する"
          )}
        </Button>
        <Link to="/reports" className={cn(buttonVariants({ variant: "outline" }), "w-full md:hidden")}>
          一覧に戻る
        </Link>
      </div>
    </form>
  );
}

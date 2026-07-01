import { useEffect, useMemo, useRef, useState } from "react";
import { type FieldErrors, useFieldArray, useForm } from "react-hook-form";
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
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/features/auth/auth-context";
import { storageService } from "@/lib/storage-service";
import { cn, formatDate, toDateInputValue } from "@/lib/utils";
import type {
  DailyReportDetail,
  MasterItem,
  OtherVehicleEntry,
  ReportDisposalEntry,
  ReportExternalWorkerEntry,
  ReportFormValues,
  ReportLeaseEntry,
  ReportPhoto,
  ReportTransportEntry,
  ReportWorker,
  Site,
} from "@/types/database";

const numberOptions = Array.from({ length: 11 }, (_, index) => index);
const subcontractorCountOptions = Array.from({ length: 21 }, (_, index) => index);
const MANUAL_SITE_OPTION = "__manual__";
const disposalTypeOptions = [
  { value: "wood", label: "木類" },
  { value: "board", label: "ボード" },
  { value: "rubble", label: "ガラ" },
  { value: "scrap", label: "スクラップ" },
  { value: "mixed", label: "混載" },
  { value: "asbestos", label: "アスベスト" },
  { value: "other", label: "その他" },
] as const;

const reportSchema = z
  .object({
    report_date: z.string().min(1, "作業日を入力してください"),
    reporter_name: z.string().trim().min(1, "記入者名を入力してください").max(100, "100文字以内で入力してください"),
    site_id: z.string().min(1, "現場名を選択してください"),
    site_name: z.string().trim().max(100, "100文字以内で入力してください"),
    work_category_id: z.string().min(1, "工事分類を選択してください"),
    worker_ids: z.array(z.string()),
    external_worker_entries: z.array(
      z.object({
        worker_label_id: z.string().min(1),
        label_snapshot: z.string().trim().min(1),
        count: z.coerce.number().min(0),
      }),
    ),
    work_shift: z.enum(["day", "night"]),
    contract_type: z.enum(["contract", "regular"]),
    miscellaneous_costs: z.string().max(3000, "3000文字以内で入力してください"),
    lease_entries: z.array(
      z.object({
        lease_item_id: z.string().min(1),
        label: z.string().trim().max(100, "100文字以内で入力してください"),
        count: z.coerce.number().min(0),
      }),
    ),
    disposal_entries: z.array(
      z.object({
        disposal_item_id: z.string().min(1),
        waste_type: z.enum(["wood", "board", "rubble", "scrap", "mixed", "asbestos", "other"]),
        other_label: z.string().trim().max(100, "100文字以内で入力してください"),
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
    work_description: z.string().max(2000, "2000文字以内で入力してください"),
    other_workers_note: z.string().max(1000, "1000文字以内で入力してください"),
    remarks: z.string().max(2000, "2000文字以内で入力してください"),
    progress_status: z.enum(["continuing", "completed"]),
  })
  .superRefine((values, ctx) => {
    if (values.site_id === MANUAL_SITE_OPTION) {
      if (!values.site_name.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["site_name"],
          message: "現場名を入力してください",
        });
      }
    }

    const totalWorkerCount = values.worker_ids.length + values.external_worker_entries.reduce((sum, entry) => sum + entry.count, 0);
    if (totalWorkerCount <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["worker_ids"],
        message: "作業員を1人以上選択してください",
      });
    }

    values.lease_entries.forEach((entry, index) => {
      if (!entry.label.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["lease_entries", index, "label"],
          message: "リース車両を入力してください",
        });
      }
      if (entry.count <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["lease_entries", index, "count"],
          message: "台数を1以上にしてください",
        });
      }
    });

    values.disposal_entries.forEach((entry, index) => {
      if (entry.waste_type === "other" && !entry.other_label.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["disposal_entries", index, "other_label"],
          message: "その他のゴミ名称を入力してください",
        });
      }
      if (entry.ton_count <= 0 && entry.truck_count <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["disposal_entries", index, "ton_count"],
          message: "T または 台数のどちらかを1以上にしてください",
        });
      }
    });

    values.transport_entries.forEach((entry, index) => {
      if (entry.count <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["transport_entries", index, "count"],
          message: "台数を1以上にしてください",
        });
      }
    });

    values.other_vehicle_entries.forEach((entry, index) => {
      if (!entry.label.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["other_vehicle_entries", index, "label"],
          message: "車両名を入力してください",
        });
      }
      if (entry.count <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["other_vehicle_entries", index, "count"],
          message: "台数を1以上にしてください",
        });
      }
    });
  });

type ReportSchemaValues = z.infer<typeof reportSchema>;

function findFirstErrorPath(errors: FieldErrors<ReportSchemaValues>, prefix = ""): string | null {
  for (const [key, value] of Object.entries(errors)) {
    if (!value) {
      continue;
    }

    const path = prefix ? `${prefix}.${key}` : key;

    if (Array.isArray(value)) {
      for (let index = 0; index < value.length; index += 1) {
        const nested = value[index];
        if (!nested) {
          continue;
        }
        const nestedPath = findFirstErrorPath(nested as FieldErrors<ReportSchemaValues>, `${path}.${index}`);
        if (nestedPath) {
          return nestedPath;
        }
      }
      continue;
    }

    if (typeof value === "object") {
      if ("message" in value && value.message) {
        return path;
      }
      const nestedPath = findFirstErrorPath(value as FieldErrors<ReportSchemaValues>, path);
      if (nestedPath) {
        return nestedPath;
      }
    }
  }

  return null;
}

function scrollToError(path: string) {
  const target =
    document.querySelector<HTMLElement>(`[data-field-path="${path}"]`) ??
    document.querySelector<HTMLElement>(`[name="${path}"]`);

  if (!target) {
    return;
  }

  target.scrollIntoView({ behavior: "smooth", block: "center" });
  window.setTimeout(() => {
    target.focus?.();
  }, 120);
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
      <button type="button" className="absolute right-2 top-2 rounded-full bg-black/60 p-2 text-white" onClick={onRemove}>
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

function DateField({ value, onChange, fieldPath }: { value: string; onChange: (value: string) => void; fieldPath?: string }) {
  const selectedDate = value ? new Date(`${value}T00:00:00`) : undefined;
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button data-field-path={fieldPath} type="button" className="flex w-full items-center justify-between gap-2 overflow-hidden rounded-xl border bg-card px-3 py-3 text-left shadow-sm">
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
  externalCount,
  onToggle,
  onChangeCount,
}: {
  title: string;
  items: MasterItem[];
  values: string[];
  externalCount?: number;
  onToggle: (itemId: string, checked: boolean) => void;
  onChangeCount?: (count: number) => void;
}) {
  if (items.length === 0) return null;

  const isDaigoGroup = title.includes("大吾興業");

  if (!isDaigoGroup && onChangeCount) {
    const selectedCount = externalCount ?? 0;

    return (
      <div className="grid grid-cols-[minmax(0,1.5fr)_auto] items-center gap-3 rounded-xl border bg-background px-3 py-3">
        <p className="min-w-0 text-sm font-semibold">{title}</p>
        <div className="flex items-center gap-2">
          <div className="relative">
            <select
              className="flex h-11 w-[84px] appearance-none rounded-xl border bg-card px-3 py-2 pr-10 text-left text-base shadow-sm outline-none md:w-[96px] md:text-sm"
              value={String(selectedCount)}
              onChange={(event) => onChangeCount(Number(event.target.value))}
            >
              {subcontractorCountOptions.map((option) => (
                <option key={option} value={String(option)}>
                  {option}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground opacity-70" />
          </div>
          <span className="text-sm">人</span>
        </div>
      </div>
    );
  }

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

function WorkerCostSummary({
  rows,
}: {
  rows: Array<{ label: string; count: number; unitPrice: number; subtotal: number }>;
}) {
  const total = rows.reduce((sum, row) => sum + row.subtotal, 0);

  if (rows.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl border bg-background p-3">
      <p className="mb-2 text-sm font-semibold">ラベル別集計</p>
      <div className="space-y-2">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-3 text-sm">
            <span className="min-w-0 truncate">{row.label}</span>
            <span className="shrink-0 text-muted-foreground">
              {row.count}人 × {row.unitPrice.toLocaleString()}円 = {row.subtotal.toLocaleString()}円
            </span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between border-t pt-3 text-sm font-semibold">
        <span>合計</span>
        <span>{total.toLocaleString()}円</span>
      </div>
    </div>
  );
}

function buildWorkerCostSummaryRows(workers: ReportWorker[], workerIds: string[], workerLabels: MasterItem[]) {
  const labelPriceMap = new Map(workerLabels.map((item) => [item.name.trim(), item.unit_price ?? 0]));
  const grouped = new Map<string, { count: number; unitPrice: number }>();

  workers
    .filter((worker) => workerIds.includes(worker.id))
    .forEach((worker) => {
      const label = worker.label_snapshot?.trim() || worker.group_label?.trim() || "ラベル未設定";
      const unitPrice = worker.unit_price_snapshot ?? labelPriceMap.get(label) ?? 0;
      const current = grouped.get(label) ?? { count: 0, unitPrice };
      current.count += 1;
      grouped.set(label, current);
    });

  return Array.from(grouped.entries()).map(([label, value]) => ({
    label,
    count: value.count,
    unitPrice: value.unitPrice,
    subtotal: value.count * value.unitPrice,
  }));
}

function mergeWorkerCostRows(
  rows: Array<{ label: string; count: number; unitPrice: number; subtotal: number }>,
  externalEntries: ReportExternalWorkerEntry[],
) {
  const grouped = new Map(rows.map((row) => [row.label, { ...row }]));

  externalEntries.forEach((entry) => {
    const label = entry.label_snapshot.trim() || entry.item?.name?.trim() || "未分類";
    const unitPrice = entry.unit_price_snapshot ?? entry.item?.unit_price ?? 0;
    const current = grouped.get(label) ?? { label, count: 0, unitPrice, subtotal: 0 };
    current.count += entry.count;
    current.unitPrice = unitPrice;
    current.subtotal += entry.count * unitPrice;
    grouped.set(label, current);
  });

  return Array.from(grouped.values());
}

function QuantitySelect({
  value,
  onChange,
  placeholder = "0",
  fieldPath,
}: {
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
  fieldPath?: string;
}) {
  return (
    <div className="relative">
      <select
        data-field-path={fieldPath}
        className="flex h-11 w-[96px] appearance-none rounded-xl border bg-card px-3 py-2 pr-10 text-left text-base shadow-sm outline-none md:text-sm"
        value={String(value)}
        aria-label={placeholder}
        onChange={(event) => onChange(Number(event.target.value))}
      >
        {numberOptions.map((option) => (
          <option key={option} value={String(option)}>
            {option}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground opacity-70" />
    </div>
  );
}

function LeaseItemRows({
  item,
  rows,
  errors,
  onAdd,
  onRemove,
  onChangeLabel,
  onChange,
}: {
  item: MasterItem;
  rows: Array<{ fieldIndex: number; entry: ReportLeaseEntry }>;
  errors?: Record<number, { label?: string; count?: string }>;
  onAdd: () => void;
  onRemove: (index: number) => void;
  onChangeLabel: (index: number, value: string) => void;
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
          <div key={`lease-${fieldIndex}`} className="space-y-2 rounded-xl border px-3 py-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium">{index + 1}.</span>
              <Input
                data-field-path={`lease_entries.${fieldIndex}.label`}
                className="min-w-[180px] flex-1"
                value={entry.label}
                onChange={(event) => onChangeLabel(fieldIndex, event.target.value)}
                placeholder="リース車両を入力"
              />
              <div className="flex items-center gap-2">
                <QuantitySelect fieldPath={`lease_entries.${fieldIndex}.count`} value={entry.count} onChange={(value) => onChange(fieldIndex, value)} />
                <span className="text-sm">台</span>
              </div>
              <Button type="button" variant="ghost" size="icon" className="ml-auto" onClick={() => onRemove(fieldIndex)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            {errors?.[fieldIndex]?.label ? <p className="text-sm text-destructive">{errors[fieldIndex]?.label}</p> : null}
            {errors?.[fieldIndex]?.count ? <p className="text-sm text-destructive">{errors[fieldIndex]?.count}</p> : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function DisposalItemRows({
  item,
  rows,
  errors,
  onAdd,
  onRemove,
  onChangeType,
  onChangeOtherLabel,
  onChangeTon,
  onChangeTruck,
}: {
  item: MasterItem;
  rows: Array<{ fieldIndex: number; entry: ReportDisposalEntry }>;
  errors?: Record<number, { waste_type?: string; other_label?: string; ton_count?: string; truck_count?: string }>;
  onAdd: () => void;
  onRemove: (index: number) => void;
  onChangeType: (index: number, value: ReportDisposalEntry["waste_type"]) => void;
  onChangeOtherLabel: (index: number, value: string) => void;
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
          <div key={`${item.id}-${fieldIndex}`} className="space-y-2 rounded-xl border px-3 py-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium">{index + 1}.</span>
              <div className="relative">
                <select
                  data-field-path={`disposal_entries.${fieldIndex}.waste_type`}
                  className="flex h-11 w-[160px] appearance-none rounded-xl border bg-card px-3 py-2 pr-10 text-left text-base shadow-sm outline-none md:text-sm"
                  value={entry.waste_type}
                  onChange={(event) => onChangeType(fieldIndex, event.target.value as ReportDisposalEntry["waste_type"])}
                >
                  {disposalTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground opacity-70" />
              </div>
              {entry.waste_type === "other" ? (
                <Input
                  data-field-path={`disposal_entries.${fieldIndex}.other_label`}
                  className="min-w-[160px] flex-1"
                  value={entry.other_label}
                  onChange={(event) => onChangeOtherLabel(fieldIndex, event.target.value)}
                  placeholder="ゴミ名称を入力"
                />
              ) : null}
              <QuantitySelect fieldPath={`disposal_entries.${fieldIndex}.ton_count`} value={entry.ton_count} onChange={(value) => onChangeTon(fieldIndex, value)} />
              <span className="text-sm">T</span>
              <QuantitySelect fieldPath={`disposal_entries.${fieldIndex}.truck_count`} value={entry.truck_count} onChange={(value) => onChangeTruck(fieldIndex, value)} />
              <span className="text-sm">台</span>
              <Button type="button" variant="ghost" size="icon" className="ml-auto" onClick={() => onRemove(fieldIndex)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            {errors?.[fieldIndex]?.other_label ? <p className="text-sm text-destructive">{errors[fieldIndex]?.other_label}</p> : null}
            {errors?.[fieldIndex]?.ton_count ? <p className="text-sm text-destructive">{errors[fieldIndex]?.ton_count}</p> : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function TransportItemRows({
  item,
  rows,
  errors,
  onAdd,
  onRemove,
  onChange,
}: {
  item: MasterItem;
  rows: Array<{ fieldIndex: number; entry: ReportTransportEntry }>;
  errors?: Record<number, { count?: string }>;
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
          <div key={`${item.id}-${fieldIndex}`} className="space-y-2 rounded-xl border px-3 py-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{index + 1}.</span>
              <QuantitySelect fieldPath={`transport_entries.${fieldIndex}.count`} value={entry.count} onChange={(value) => onChange(fieldIndex, value)} />
              <span className="text-sm">台</span>
              <Button type="button" variant="ghost" size="icon" className="ml-auto" onClick={() => onRemove(fieldIndex)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            {errors?.[fieldIndex]?.count ? <p className="text-sm text-destructive">{errors[fieldIndex]?.count}</p> : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function OtherVehicleRows({
  rows,
  errors,
  onAdd,
  onRemove,
  onChangeLabel,
  onChangeCount,
}: {
  rows: Array<{ fieldIndex: number; entry: OtherVehicleEntry }>;
  errors?: Record<number, { label?: string; count?: string }>;
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
          <div key={`other-vehicle-${fieldIndex}`} className="space-y-2 rounded-xl border p-3">
            <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto] sm:items-center">
              <Input data-field-path={`other_vehicle_entries.${fieldIndex}.label`} value={entry.label} onChange={(event) => onChangeLabel(fieldIndex, event.target.value)} placeholder="車両名を入力" />
              <div className="flex items-center gap-2">
                <QuantitySelect fieldPath={`other_vehicle_entries.${fieldIndex}.count`} value={entry.count} onChange={(value) => onChangeCount(fieldIndex, value)} />
                <span className="text-sm">台</span>
              </div>
              <Button type="button" variant="ghost" size="icon" className="justify-self-end" onClick={() => onRemove(fieldIndex)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            {errors?.[fieldIndex]?.label ? <p className="text-sm text-destructive">{errors[fieldIndex]?.label}</p> : null}
            {errors?.[fieldIndex]?.count ? <p className="text-sm text-destructive">{errors[fieldIndex]?.count}</p> : null}
          </div>
        ))}
      </div>
    </div>
  );
}

export function ReportForm({
  sites,
  workCategories,
  workers,
  workerLabels,
  leaseItems,
  disposalItems,
  transportItems,
  reporterName,
  isSubcontractor = false,
  initialReport,
  submitting,
  onSubmit,
  onDeleteExistingPhoto,
}: {
  sites: Site[];
  workCategories: MasterItem[];
  workers: MasterItem[];
  workerLabels: MasterItem[];
  leaseItems: MasterItem[];
  disposalItems: MasterItem[];
  transportItems: MasterItem[];
  reporterName?: string | null;
  isSubcontractor?: boolean;
  initialReport?: DailyReportDetail;
  submitting: boolean;
  onSubmit: (values: ReportFormValues, files: File[]) => Promise<void>;
  onDeleteExistingPhoto?: (photo: ReportPhoto) => Promise<void>;
}) {
  const { isMaster } = useAuth();
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const draftKey = initialReport ? `report-form-draft:${initialReport.id}` : "report-form-draft:new";
  const scrollKey = `${draftKey}:scroll`;
  const restoredDraftKeyRef = useRef<string | null>(null);
  const canPersistDraftRef = useRef(false);
  const defaultValues = useMemo<ReportSchemaValues>(
    () => ({
      report_date: initialReport?.report_date ?? toDateInputValue(),
      reporter_name: initialReport?.reporter_name ?? (isSubcontractor ? "" : reporterName ?? ""),
      site_id: initialReport?.site_id ?? (initialReport?.site_name ? MANUAL_SITE_OPTION : ""),
      site_name: initialReport?.site_name ?? "",
      work_category_id: initialReport?.work_category_id ?? "",
      worker_ids: initialReport?.workers.map((item) => item.id) ?? [],
      external_worker_entries:
        initialReport?.external_worker_entries.map((entry) => ({
          worker_label_id: entry.worker_label_id,
          label_snapshot: entry.label_snapshot,
          count: entry.count,
        })) ?? [],
      work_shift: initialReport?.work_shift ?? "day",
      contract_type: initialReport?.contract_type ?? "contract",
      miscellaneous_costs: initialReport?.miscellaneous_costs ?? "",
      lease_entries:
        initialReport?.lease_entries.map((entry) => ({
          lease_item_id: entry.lease_item_id ?? "",
          label: entry.label || "",
          count: entry.count,
        })) ?? [],
      disposal_entries:
        initialReport?.disposal_entries.map((entry) => ({
          disposal_item_id: entry.disposal_item_id,
          waste_type: entry.waste_type,
          other_label: entry.other_label,
          ton_count: entry.ton_count,
          truck_count: entry.truck_count,
        })) ?? [],
      transport_entries:
        initialReport?.transport_entries.map((entry) => ({
          transport_item_id: entry.transport_item_id,
          count: entry.count,
        })) ?? [],
      other_vehicle_entries: initialReport?.other_vehicle_entries ?? [],
      work_description: initialReport?.work_description ?? "",
      other_workers_note: initialReport?.other_workers_note ?? "",
      remarks: initialReport?.remarks ?? "",
      progress_status: initialReport?.progress_status ?? "continuing",
    }),
    [initialReport, isSubcontractor, reporterName],
  );
  const form = useForm<ReportSchemaValues>({
    resolver: zodResolver(reportSchema),
    defaultValues,
  });

  useEffect(() => {
    if (typeof window === "undefined" || restoredDraftKeyRef.current === draftKey) {
      return;
    }

    restoredDraftKeyRef.current = draftKey;
    canPersistDraftRef.current = false;

    const rawDraft = window.sessionStorage.getItem(draftKey);
    if (!rawDraft) {
      form.reset(defaultValues);
      canPersistDraftRef.current = true;
      return;
    }

    try {
      const parsedDraft = JSON.parse(rawDraft) as Partial<ReportSchemaValues>;
      form.reset({
        ...defaultValues,
        ...parsedDraft,
        worker_ids: Array.isArray(parsedDraft.worker_ids) ? parsedDraft.worker_ids : defaultValues.worker_ids,
        external_worker_entries: Array.isArray(parsedDraft.external_worker_entries)
          ? parsedDraft.external_worker_entries
          : defaultValues.external_worker_entries,
        lease_entries: Array.isArray(parsedDraft.lease_entries) ? parsedDraft.lease_entries : defaultValues.lease_entries,
        disposal_entries: Array.isArray(parsedDraft.disposal_entries) ? parsedDraft.disposal_entries : defaultValues.disposal_entries,
        transport_entries: Array.isArray(parsedDraft.transport_entries) ? parsedDraft.transport_entries : defaultValues.transport_entries,
        other_vehicle_entries: Array.isArray(parsedDraft.other_vehicle_entries)
          ? parsedDraft.other_vehicle_entries
          : defaultValues.other_vehicle_entries,
      });
    } catch {
      window.sessionStorage.removeItem(draftKey);
      form.reset(defaultValues);
    } finally {
      canPersistDraftRef.current = true;
    }
  }, [defaultValues, draftKey, form]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const restoreScroll = () => {
      const rawScroll = window.sessionStorage.getItem(scrollKey);
      if (!rawScroll) {
        return;
      }
      const scrollY = Number(rawScroll);
      if (!Number.isFinite(scrollY) || scrollY <= 0) {
        return;
      }
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          window.scrollTo({ top: scrollY, behavior: "auto" });
        });
      });
    };

    restoreScroll();
  }, [scrollKey]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const subscription = form.watch((value) => {
      if (!canPersistDraftRef.current) {
        return;
      }

      window.sessionStorage.setItem(
        draftKey,
        JSON.stringify({
          ...defaultValues,
          ...value,
          worker_ids: value.worker_ids ?? [],
          external_worker_entries: value.external_worker_entries ?? [],
          lease_entries: value.lease_entries ?? [],
          disposal_entries: value.disposal_entries ?? [],
          transport_entries: value.transport_entries ?? [],
          other_vehicle_entries: value.other_vehicle_entries ?? [],
        }),
      );
    });

    return () => subscription.unsubscribe();
  }, [defaultValues, draftKey, form]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const persistScroll = () => {
      window.sessionStorage.setItem(scrollKey, String(window.scrollY));
    };

    persistScroll();
    window.addEventListener("scroll", persistScroll, { passive: true });
    window.addEventListener("pagehide", persistScroll);
    document.addEventListener("visibilitychange", persistScroll);

    return () => {
      window.removeEventListener("scroll", persistScroll);
      window.removeEventListener("pagehide", persistScroll);
      document.removeEventListener("visibilitychange", persistScroll);
    };
  }, [scrollKey]);

  const leaseArray = useFieldArray({ control: form.control, name: "lease_entries" });
  const disposalArray = useFieldArray({ control: form.control, name: "disposal_entries" });
  const transportArray = useFieldArray({ control: form.control, name: "transport_entries" });
  const otherVehicleArray = useFieldArray({ control: form.control, name: "other_vehicle_entries" });

  const externalWorkerEntries = form.watch("external_worker_entries");
  const selectedWorkerCount =
    form.watch("worker_ids").length + externalWorkerEntries.reduce((sum, entry) => sum + entry.count, 0);
  const workerIds = form.watch("worker_ids");
  const leaseEntries = form.watch("lease_entries");
  const disposalEntries = form.watch("disposal_entries");
  const transportEntries = form.watch("transport_entries");
  const otherVehicleEntries = form.watch("other_vehicle_entries");

  const workerGroups = useMemo(() => {
    return workerLabels
      .map((label) => ({
        label: label.name.trim().includes("大吾興業")
          ? (label.name.trim().includes("従業員") ? label.name.trim() : `${label.name.trim()}従業員`)
          : label.name.trim(),
        labelId: label.id,
        isDaigo: label.name.trim().includes("大吾興業"),
        items: workers.filter((worker) => worker.group_label?.trim() === label.name.trim()),
      }))
      .filter((group) => group.label);
  }, [workerLabels, workers]);

  const workerCostSummary = useMemo(
    () =>
      isMaster
        ? mergeWorkerCostRows(
            buildWorkerCostSummaryRows(workers as ReportWorker[], workerIds, workerLabels),
            externalWorkerEntries as ReportExternalWorkerEntry[],
          )
        : [],
    [externalWorkerEntries, isMaster, workerIds, workerLabels, workers],
  );

  const [previewPhotos, setPreviewPhotos] = useState<Array<{ id: string; index: number; name: string; url: string }>>([]);

  useEffect(() => {
    const photos = pendingFiles.map((file, index) => ({
      id: `${file.name}-${index}`,
      index,
      name: file.name,
      url: URL.createObjectURL(file),
    }));
    setPreviewPhotos(photos);

    return () => {
      photos.forEach((photo) => URL.revokeObjectURL(photo.url));
    };
  }, [pendingFiles]);

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

  const updateWorkerGroupCount = (groupItems: MasterItem[], count: number) => {
    const groupIds = new Set(groupItems.map((item) => item.id));
    const nextIds = workerIds.filter((value) => !groupIds.has(value));
    const selectedIds = groupItems.slice(0, Math.min(count, groupItems.length)).map((item) => item.id);

    form.setValue("worker_ids", [...nextIds, ...selectedIds], {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const updateExternalWorkerCount = (labelId: string, label: string, count: number) => {
    const nextEntries = (externalWorkerEntries as ReportExternalWorkerEntry[]).filter((entry) => entry.worker_label_id !== labelId);
    if (count > 0) {
      nextEntries.push({ worker_label_id: labelId, label_snapshot: label, count });
    }

    form.setValue("external_worker_entries", nextEntries, {
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

  const leaseEntryErrors = (form.formState.errors.lease_entries ?? []) as Array<{ label?: { message?: string }; count?: { message?: string } } | undefined>;
  const disposalEntryErrors = (form.formState.errors.disposal_entries ?? []) as Array<
    { waste_type?: { message?: string }; other_label?: { message?: string }; ton_count?: { message?: string }; truck_count?: { message?: string } } | undefined
  >;
  const transportEntryErrors = (form.formState.errors.transport_entries ?? []) as Array<{ count?: { message?: string } } | undefined>;
  const otherVehicleEntryErrors = (form.formState.errors.other_vehicle_entries ?? []) as Array<{ label?: { message?: string }; count?: { message?: string } } | undefined>;

  const leaseErrors = Object.fromEntries(
    leaseEntryErrors.flatMap((entryError, index) =>
      entryError
        ? [[index, { label: entryError.label?.message, count: entryError.count?.message }]]
        : [],
    ),
  ) as Record<number, { label?: string; count?: string }>;

  const disposalErrors = Object.fromEntries(
    disposalEntryErrors.flatMap((entryError, index) =>
      entryError
        ? [[index, { waste_type: entryError.waste_type?.message, other_label: entryError.other_label?.message, ton_count: entryError.ton_count?.message, truck_count: entryError.truck_count?.message }]]
        : [],
    ),
  ) as Record<number, { waste_type?: string; other_label?: string; ton_count?: string; truck_count?: string }>;

  const transportErrors = Object.fromEntries(
    transportEntryErrors.flatMap((entryError, index) =>
      entryError ? [[index, { count: entryError.count?.message }]] : [],
    ),
  ) as Record<number, { count?: string }>;

  const otherVehicleErrors = Object.fromEntries(
    otherVehicleEntryErrors.flatMap((entryError, index) =>
      entryError ? [[index, { label: entryError.label?.message, count: entryError.count?.message }]] : [],
    ),
  ) as Record<number, { label?: string; count?: string }>;

  const submit = form.handleSubmit(
    async (values) => {
      try {
        const externalCount = values.external_worker_entries.reduce((sum, entry) => sum + entry.count, 0);
        if (isSubcontractor && !values.reporter_name.trim()) {
          form.setError("reporter_name", { type: "manual", message: "記入者名を入力してください" });
          scrollToError("reporter_name");
          toast.error("記入者名を入力してください");
          return;
        }
                        await onSubmit(
          {
            ...values,
            reporter_name: isSubcontractor ? values.reporter_name.trim() : reporterName?.trim() ?? values.reporter_name.trim(),
            site_name: values.site_id === MANUAL_SITE_OPTION ? values.site_name.trim() : "",
            worker_count: values.worker_ids.length + externalCount,
          },
          pendingFiles,
        );
        if (typeof window !== "undefined") {
          window.sessionStorage.removeItem(draftKey);
          window.sessionStorage.removeItem(scrollKey);
        }
        setPendingFiles([]);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "保存に失敗しました");
      }
    },
    (errors) => {
      const firstErrorPath = findFirstErrorPath(errors);
      if (firstErrorPath) {
        scrollToError(firstErrorPath);
      }
      toast.error("未入力または不正な入力があります。内容を確認してください。");
    },
  );

  return (
    <form className="space-y-4" onSubmit={submit}>
      <Card>
        <CardHeader>
          <CardTitle>{initialReport ? "大吾興業工事作業日報の編集" : "大吾興業工事作業日報"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>
              記入者名<span className="ml-1 text-destructive">*</span>
            </Label>
            <div className="rounded-xl border bg-background px-3 py-3">
              {isSubcontractor ? (
                <div className="space-y-2">
                  <Input
                    data-field-path="reporter_name"
                    className="bg-white"
                    value={form.watch("reporter_name")}
                    onChange={(event) => form.setValue("reporter_name", event.target.value, { shouldDirty: true, shouldValidate: true })}
                    placeholder="会社名 + 名前を入力"
                  />
                  <p className="text-xs text-muted-foreground">会社名+名前を入力してください。</p>
                  {form.formState.errors.reporter_name ? <p className="text-sm text-destructive">{form.formState.errors.reporter_name.message}</p> : null}
                </div>
              ) : (
                <>
                  <p className="text-sm font-semibold">{reporterName || "未設定"}</p>
                  {form.formState.errors.reporter_name ? <p className="mt-2 text-sm text-destructive">{form.formState.errors.reporter_name.message}</p> : null}
                  {!reporterName ? <p className="mt-1 text-xs text-muted-foreground">名前が未設定です。設定画面の「表示名」から記入者名を登録してください。</p> : null}
                </>
              )}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
            <div className="space-y-2">
              <Label htmlFor="report_date">
                作業日<span className="ml-1 text-destructive">*</span>
              </Label>
              <DateField fieldPath="report_date" value={form.watch("report_date")} onChange={(value) => form.setValue("report_date", value, { shouldDirty: true, shouldValidate: true })} />
              {form.formState.errors.report_date ? <p className="text-sm text-destructive">{form.formState.errors.report_date.message}</p> : null}
            </div>
            <div className="min-w-0 space-y-2">
              <Label>
                現場名<span className="ml-1 text-destructive">*</span>
              </Label>
              <div className="relative">
                <select
                  data-field-path="site_id"
                  className="flex h-11 w-full appearance-none rounded-xl border bg-card px-3 py-2 pr-10 text-left text-base shadow-sm outline-none md:text-sm"
                  value={form.watch("site_id")}
                  onChange={(event) => {
                    const nextValue = event.target.value;
                    form.setValue("site_id", nextValue, { shouldDirty: true, shouldValidate: true });
                    if (nextValue !== MANUAL_SITE_OPTION) {
                      form.setValue("site_name", "", { shouldDirty: true, shouldValidate: true });
                    }
                  }}
                >
                  <option value="">現場を選択してください</option>
                  <option value={MANUAL_SITE_OPTION}>現場名を手入力</option>
                  {sites.map((site) => (
                    <option key={site.id} value={site.id}>
                      {site.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground opacity-70" />
              </div>
              {form.formState.errors.site_id ? <p className="text-sm text-destructive">{form.formState.errors.site_id.message}</p> : null}
              {form.watch("site_id") === MANUAL_SITE_OPTION ? (
                <div className="mt-2 space-y-2">
                  <Input
                    data-field-path="site_name"
                    value={form.watch("site_name")}
                    onChange={(event) => form.setValue("site_name", event.target.value, { shouldDirty: true, shouldValidate: true })}
                    placeholder="現場名を入力してください"
                  />
                  {form.formState.errors.site_name ? <p className="text-sm text-destructive">{form.formState.errors.site_name.message}</p> : null}
                </div>
              ) : null}
            </div>
          </div>

          <div className="space-y-2">
            <Label>
              工事分類<span className="ml-1 text-destructive">*</span>
            </Label>
            <div className="relative">
              <select
                data-field-path="work_category_id"
                className="flex h-11 w-full appearance-none rounded-xl border bg-card px-3 py-2 pr-10 text-left text-base shadow-sm outline-none md:text-sm"
                value={form.watch("work_category_id")}
                onChange={(event) => form.setValue("work_category_id", event.target.value, { shouldDirty: true, shouldValidate: true })}
              >
                <option value="">工事分類を選択してください</option>
                {workCategories.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground opacity-70" />
            </div>
            {form.formState.errors.work_category_id ? <p className="text-sm text-destructive">{form.formState.errors.work_category_id.message}</p> : null}
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
            <div className="grid gap-3 xl:grid-cols-2">
              {leaseItems.map((item) => (
                <LeaseItemRows
                  key={item.id}
                  item={item}
                  errors={leaseErrors}
                  rows={leaseEntries
                    .map((entry, index) => ({ fieldIndex: index, entry }))
                    .filter(({ entry }) => entry.lease_item_id === item.id)}
                    onAdd={() => leaseArray.append({ lease_item_id: item.id, label: "", count: 0 })}
                    onRemove={(index) => leaseArray.remove(index)}
                    onChangeLabel={(index, value) => form.setValue(`lease_entries.${index}.label`, value, { shouldDirty: true })}
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
                    errors={disposalErrors}
                    rows={disposalEntries
                      .map((entry, index) => ({ fieldIndex: index, entry }))
                      .filter(({ entry }) => entry.disposal_item_id === item.id)}
                    onAdd={() => disposalArray.append({ disposal_item_id: item.id, waste_type: "wood", other_label: "", ton_count: 0, truck_count: 0 })}
                    onRemove={(index) => disposalArray.remove(index)}
                    onChangeType={(index, value) => form.setValue(`disposal_entries.${index}.waste_type`, value, { shouldDirty: true })}
                    onChangeOtherLabel={(index, value) => form.setValue(`disposal_entries.${index}.other_label`, value, { shouldDirty: true })}
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
                    errors={transportErrors}
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
                errors={otherVehicleErrors}
                rows={otherVehicleEntries.map((entry, index) => ({ fieldIndex: index, entry }))}
                onAdd={() => otherVehicleArray.append({ label: "", count: 0 })}
                onRemove={(index) => otherVehicleArray.remove(index)}
                onChangeLabel={(index, value) => form.setValue(`other_vehicle_entries.${index}.label`, value, { shouldDirty: true })}
                onChangeCount={(index, value) => form.setValue(`other_vehicle_entries.${index}.count`, value, { shouldDirty: true })}
              />
            </FieldBlock>
          ) : null}

          <FieldBlock title="作業員・その他備考" required>
            <div data-field-path="worker_ids" className="rounded-xl bg-secondary/60 px-3 py-2 text-sm font-medium">作業人数: {selectedWorkerCount}人</div>
            {form.formState.errors.worker_ids ? <p className="text-sm text-destructive">{form.formState.errors.worker_ids.message}</p> : null}
            {workerGroups.map((group) => (
              <WorkerGroup
                key={group.label}
                title={group.label}
                items={group.items}
                values={workerIds}
                externalCount={externalWorkerEntries.find((entry) => entry.worker_label_id === group.labelId)?.count ?? 0}
                onToggle={updateWorkerSelection}
                onChangeCount={(count) =>
                  group.isDaigo
                    ? updateWorkerGroupCount(group.items, count)
                    : updateExternalWorkerCount(group.labelId, group.label, count)
                }
              />
            ))}
            {isMaster ? <WorkerCostSummary rows={workerCostSummary} /> : null}
            <div className="space-y-2">
              <Label htmlFor="other_workers_note">上記以外の従業員</Label>
              <Textarea id="other_workers_note" rows={4} placeholder="マスタに未登録の従業員がいれば入力" {...form.register("other_workers_note")} />
            </div>
          </FieldBlock>

          <FieldBlock title="作業内容">
            <Textarea id="work_description" rows={5} placeholder="本日の作業内容を入力してください" {...form.register("work_description")} />
            {form.formState.errors.work_description ? <p className="text-sm text-destructive">{form.formState.errors.work_description.message}</p> : null}
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

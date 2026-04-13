import { supabase } from "@/lib/supabase";
import type { MasterItem, MasterItemType } from "@/types/database";

const tableMap: Record<MasterItemType, string> = {
  worker: "workers",
  workerLabel: "worker_labels",
  lease: "lease_items",
  disposal: "disposal_items",
  transport: "transport_items",
  workCategory: "work_categories",
};

const masterCache = new Map<string, MasterItem[]>();

function getCacheKey(type: MasterItemType, includeInactive: boolean) {
  return `${type}:${includeInactive ? "all" : "active"}`;
}

function invalidateMasterCache(type: MasterItemType) {
  masterCache.delete(getCacheKey(type, true));
  masterCache.delete(getCacheKey(type, false));
}

export async function listMasterItems(type: MasterItemType, includeInactive = true) {
  const cacheKey = getCacheKey(type, includeInactive);
  const cached = masterCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  let query = supabase
    .from(tableMap[type])
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (!includeInactive) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query;
  if (error) {
    throw error;
  }
  const items = (data ?? []) as MasterItem[];
  masterCache.set(cacheKey, items);
  return items;
}

export async function upsertMasterItem(
  type: MasterItemType,
  payload: Partial<MasterItem> & Pick<MasterItem, "name" | "sort_order" | "is_active">,
) {
  const normalizedPayload =
    type === "worker"
      ? {
          id: payload.id,
          name: payload.name,
          group_label: payload.group_label ?? null,
          sort_order: payload.sort_order,
          is_active: payload.is_active,
        }
      : type === "workerLabel"
        ? {
            id: payload.id,
            name: payload.name,
            unit_price: payload.unit_price ?? 0,
            sort_order: payload.sort_order,
            is_active: payload.is_active,
          }
      : {
          id: payload.id,
          name: payload.name,
          sort_order: payload.sort_order,
          is_active: payload.is_active,
        };

  const query = payload.id
    ? supabase.from(tableMap[type]).update(normalizedPayload).eq("id", payload.id).select().single()
    : supabase.from(tableMap[type]).insert(normalizedPayload).select().single();

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  invalidateMasterCache(type);
  return data as MasterItem;
}

export async function reorderMasterItems(type: MasterItemType, items: MasterItem[]) {
  const updates = items.map((item, index) =>
    type === "worker"
      ? {
          id: item.id,
          name: item.name,
          group_label: item.group_label ?? null,
          sort_order: index,
          is_active: item.is_active,
        }
      : type === "workerLabel"
        ? {
            id: item.id,
            name: item.name,
            unit_price: item.unit_price ?? 0,
            sort_order: index,
            is_active: item.is_active,
          }
      : {
          id: item.id,
          name: item.name,
          sort_order: index,
          is_active: item.is_active,
        },
  );

  const { error } = await supabase.from(tableMap[type]).upsert(updates, { onConflict: "id" });
  if (error) {
    throw error;
  }

  invalidateMasterCache(type);
}

export async function archiveMasterItem(type: MasterItemType, item: MasterItem) {
  const payload =
    type === "worker"
      ? {
          id: item.id,
          name: item.name,
          group_label: item.group_label ?? null,
          sort_order: item.sort_order,
          is_active: false,
        }
      : type === "workerLabel"
        ? {
            id: item.id,
            name: item.name,
            unit_price: item.unit_price ?? 0,
            sort_order: item.sort_order,
            is_active: false,
          }
      : {
          id: item.id,
          name: item.name,
          sort_order: item.sort_order,
          is_active: false,
        };

  const { error } = await supabase.from(tableMap[type]).update(payload).eq("id", item.id);
  if (error) {
    throw error;
  }

  invalidateMasterCache(type);
}

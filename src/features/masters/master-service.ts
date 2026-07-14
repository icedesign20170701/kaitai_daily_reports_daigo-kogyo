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
    .eq("is_deleted", false)
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
          is_deleted: payload.is_deleted ?? false,
        }
      : type === "workerLabel"
        ? {
            id: payload.id,
            name: payload.name,
            unit_price: payload.unit_price ?? 0,
            sort_order: payload.sort_order,
            is_active: payload.is_active,
            is_deleted: payload.is_deleted ?? false,
          }
      : {
          id: payload.id,
          name: payload.name,
          sort_order: payload.sort_order,
          is_active: payload.is_active,
          is_deleted: payload.is_deleted ?? false,
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
          is_deleted: item.is_deleted ?? false,
        }
      : type === "workerLabel"
        ? {
            id: item.id,
            name: item.name,
            unit_price: item.unit_price ?? 0,
            sort_order: index,
            is_active: item.is_active,
            is_deleted: item.is_deleted ?? false,
          }
      : {
          id: item.id,
          name: item.name,
          sort_order: index,
          is_active: item.is_active,
          is_deleted: item.is_deleted ?? false,
        },
  );

  const { error } = await supabase.from(tableMap[type]).upsert(updates, { onConflict: "id" });
  if (error) {
    throw error;
  }

  invalidateMasterCache(type);
}

export async function archiveMasterItem(type: MasterItemType, item: MasterItem) {
  const { data, error } = await supabase.from(tableMap[type]).update({ is_active: false }).eq("id", item.id).select("id, is_active").single();
  if (error) {
    throw error;
  }
  if (!data || data.is_active !== false) {
    throw new Error("項目を無効化できませんでした");
  }

  invalidateMasterCache(type);
}

export async function deleteMasterItem(type: MasterItemType, item: MasterItem) {
  const { data, error } = await supabase
    .from(tableMap[type])
    .update({ is_active: false, is_deleted: true })
    .eq("id", item.id)
    .select("id, is_deleted")
    .single();
  if (error) {
    throw error;
  }
  if (!data || data.is_deleted !== true) {
    throw new Error("項目を削除できませんでした");
  }

  invalidateMasterCache(type);
}

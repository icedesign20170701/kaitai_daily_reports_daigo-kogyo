import { supabase } from "@/lib/supabase";
import type { MasterItem, MasterItemType } from "@/types/database";

const tableMap: Record<MasterItemType, string> = {
  work: "work_items",
  waste: "waste_items",
  safety: "safety_items",
  worker: "workers",
  machine: "machines",
  vehicle: "vehicles",
  partner: "partner_companies",
};

export async function listMasterItems(type: MasterItemType, includeInactive = true) {
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
  return (data ?? []) as MasterItem[];
}

export async function upsertMasterItem(
  type: MasterItemType,
  payload: Partial<MasterItem> & Pick<MasterItem, "name" | "sort_order" | "is_active">,
) {
  const { data, error } = await supabase
    .from(tableMap[type])
    .upsert(payload, { onConflict: "id" })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as MasterItem;
}

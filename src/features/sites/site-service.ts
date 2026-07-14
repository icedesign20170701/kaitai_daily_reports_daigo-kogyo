import { supabase } from "@/lib/supabase";
import type { Site } from "@/types/database";

export async function listSites(includeInactive = true) {
  let query = supabase.from("sites").select("*").order("is_active", { ascending: false }).order("name");

  if (!includeInactive) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query;
  if (error) {
    throw error;
  }

  return (data ?? []) as Site[];
}

export async function upsertSite(payload: Partial<Site> & Pick<Site, "name" | "address" | "site_area" | "is_active">) {
  const { data, error } = await supabase.from("sites").upsert(payload, { onConflict: "id" }).select().single();
  if (error) {
    throw error;
  }
  return data as Site;
}

export async function archiveSite(id: string) {
  const { error } = await supabase.from("sites").update({ is_active: false }).eq("id", id);
  if (error) {
    throw error;
  }
}

export async function activateSite(id: string) {
  const { error } = await supabase.from("sites").update({ is_active: true }).eq("id", id);
  if (error) {
    throw error;
  }
}

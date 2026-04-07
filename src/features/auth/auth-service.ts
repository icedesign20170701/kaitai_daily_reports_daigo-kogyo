import { isSupabaseConfigured, supabase, supabaseConfigError } from "@/lib/supabase";
import type { AppUser } from "@/types/database";

export async function signInWithPassword(email: string, password: string) {
  if (!isSupabaseConfigured) {
    throw new Error(supabaseConfigError ?? "Supabase configuration is missing.");
  }
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    throw error;
  }
}

export async function signOut() {
  if (!isSupabaseConfigured) {
    return;
  }
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw error;
  }
}

export async function listAppUsers() {
  if (!isSupabaseConfigured) {
    return [];
  }

  const { data, error } = await supabase
    .from("app_users")
    .select("user_id, display_name, is_master, created_at")
    .order("display_name", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as AppUser[];
}

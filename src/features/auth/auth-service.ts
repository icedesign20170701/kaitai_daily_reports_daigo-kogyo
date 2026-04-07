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
    .select("user_id, display_name, is_master, sort_order, created_at")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as AppUser[];
}

export async function reorderAppUsers(users: AppUser[]) {
  const updates = users.map((user, index) => ({
    user_id: user.user_id,
    display_name: user.display_name,
    is_master: user.is_master,
    sort_order: index,
  }));

  const { error } = await supabase.from("app_users").upsert(updates, { onConflict: "user_id" });
  if (error) {
    throw error;
  }
}

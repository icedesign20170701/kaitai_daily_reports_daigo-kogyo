import { isSupabaseConfigured, supabase, supabaseConfigError } from "@/lib/supabase";

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

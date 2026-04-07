import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseConfigError = !supabaseUrl || !supabaseAnonKey ? "Supabase environment variables are missing." : null;
export const isSupabaseConfigured = !supabaseConfigError;

function buildSupabaseClient() {
  return createClient(supabaseUrl ?? "https://placeholder.invalid", supabaseAnonKey ?? "placeholder-anon-key", {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  });
}

export let supabase = buildSupabaseClient();

export function resetSupabaseClient() {
  supabase = buildSupabaseClient();
  return supabase;
}

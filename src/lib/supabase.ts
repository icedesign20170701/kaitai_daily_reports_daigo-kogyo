import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseConfigError = !supabaseUrl || !supabaseAnonKey ? "Supabase environment variables are missing." : null;
export const isSupabaseConfigured = !supabaseConfigError;

declare global {
  interface Window {
    __kaitaiSupabaseClient?: SupabaseClient;
  }
}

export const BACKGROUND_SIGN_OUT_MS = 5 * 60 * 1000;
export const BACKGROUND_SIGN_OUT_REQUEST_KEY = "kaitai-background-signout-requested";

// ─── Client ──────────────────────────────────────────────────────────────────
function buildSupabaseClient() {
  return createClient(supabaseUrl ?? "https://placeholder.invalid", supabaseAnonKey ?? "placeholder-anon-key", {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  });
}

export const supabase =
  window.__kaitaiSupabaseClient ??
  (() => {
    const client = buildSupabaseClient();
    window.__kaitaiSupabaseClient = client;
    return client;
  })();

export async function recoverSupabaseConnection() {
  const { error } = await supabase.auth.getSession();
  if (error) throw error;
}

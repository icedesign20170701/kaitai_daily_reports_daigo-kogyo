import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { LockFunc } from "@supabase/auth-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseConfigError = !supabaseUrl || !supabaseAnonKey ? "Supabase environment variables are missing." : null;
export const isSupabaseConfigured = !supabaseConfigError;

declare global {
  interface Window {
    __kaitaiSupabaseClient?: SupabaseClient;
    __kaitaiSupabaseLocks?: Record<string, Promise<unknown>>;
  }
}

const browserLocks = window.__kaitaiSupabaseLocks ?? (window.__kaitaiSupabaseLocks = {});

const serialAuthLock: LockFunc = async <R>(name: string, _acquireTimeout: number, fn: () => Promise<R>) => {
  const previous = browserLocks[name] ?? Promise.resolve();
  let release!: () => void;

  const current = new Promise<void>((resolve) => {
    release = resolve;
  });

  const queued = previous.finally(() => current);
  browserLocks[name] = queued;

  try {
    await previous;
    return await fn();
  } finally {
    release();

    queued.finally(() => {
      if (browserLocks[name] === queued) {
        delete browserLocks[name];
      }
    });
  }
};

function buildSupabaseClient() {
  return createClient(supabaseUrl ?? "https://placeholder.invalid", supabaseAnonKey ?? "placeholder-anon-key", {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      lock: serialAuthLock,
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

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseConfigError = !supabaseUrl || !supabaseAnonKey ? "Supabase environment variables are missing." : null;
export const isSupabaseConfigured = !supabaseConfigError;

declare global {
  interface Window {
    __kaitaiSupabaseClient?: SupabaseClient;
    __kaitaiSupabaseLocks?: Record<string, Promise<void>>;
  }
}

// Shared lock state — persisted on window so HMR reloads don't lose it
const browserLocks: Record<string, Promise<void>> = window.__kaitaiSupabaseLocks ?? {};
window.__kaitaiSupabaseLocks = browserLocks;

// Tracks the last time the app became visible after being backgrounded
let lastResumedAt = 0;

function handleAppResume() {
  lastResumedAt = Date.now();
  // Drop all pending lock chains so the next acquisition starts fresh
  for (const key of Object.keys(browserLocks)) {
    delete browserLocks[key];
  }
}

// Module-level registration fires BEFORE any useEffect in page components,
// so lastResumedAt is set before the page's data-fetch handlers run.
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    handleAppResume();
  }
});
window.addEventListener("pageshow", handleAppResume);

// How long after resume to treat any lock acquisition as "fresh" (bypass stuck lock)
const RESUME_GRACE_MS = 3000;
// Fallback timeout for a lock that gets stuck for reasons other than iOS freeze
const LOCK_STUCK_TIMEOUT_MS = 5000;

async function serialAuthLock<T>(name: string, _acquireTimeout: number, fn: () => Promise<T>): Promise<T> {
  const previous = browserLocks[name] ?? Promise.resolve();
  let release!: () => void;
  const current = new Promise<void>((resolve) => {
    release = resolve;
  });

  // If the app just resumed, skip waiting for the previous lock — it may be
  // frozen from before the app was backgrounded and will never release on its own.
  const resumedRecently = lastResumedAt > 0 && Date.now() - lastResumedAt < RESUME_GRACE_MS;

  const gate = resumedRecently
    ? Promise.resolve()
    : Promise.race([previous, new Promise<void>((resolve) => window.setTimeout(resolve, LOCK_STUCK_TIMEOUT_MS))]);

  // queued settles only after gate settles AND release() is called,
  // so the next lock acquisition waits for the current holder to finish.
  const queued = gate.finally(() => current);
  browserLocks[name] = queued;

  try {
    await gate;
    return await fn();
  } finally {
    release();
    void queued.finally(() => {
      if (browserLocks[name] === queued) {
        delete browserLocks[name];
      }
    });
  }
}

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

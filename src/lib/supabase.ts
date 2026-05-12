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

// ─── Auth lock ───────────────────────────────────────────────────────────────
// Shared across HMR reloads by persisting on window.
const browserLocks: Record<string, Promise<void>> = window.__kaitaiSupabaseLocks ?? {};
window.__kaitaiSupabaseLocks = browserLocks;

let lastResumedAt = 0;

function clearLocks() {
  lastResumedAt = Date.now();
  for (const key of Object.keys(browserLocks)) {
    delete browserLocks[key];
  }
}

const RESUME_GRACE_MS = 3000;
const LOCK_STUCK_TIMEOUT_MS = 5000;

async function serialAuthLock<T>(name: string, _acquireTimeout: number, fn: () => Promise<T>): Promise<T> {
  const previous = browserLocks[name] ?? Promise.resolve();
  let release!: () => void;
  const current = new Promise<void>((resolve) => {
    release = resolve;
  });

  const resumedRecently = lastResumedAt > 0 && Date.now() - lastResumedAt < RESUME_GRACE_MS;

  const gate = resumedRecently
    ? Promise.resolve()
    : Promise.race([previous, new Promise<void>((resolve) => window.setTimeout(resolve, LOCK_STUCK_TIMEOUT_MS))]);

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

// ─── iOS resume handling ─────────────────────────────────────────────────────
// iOS freezes all JS when a PWA goes to the background. When it resumes, the
// Supabase client's internal state (timers, session, pending fetches) can be
// in an inconsistent state. The only fully reliable recovery is a page reload.
//
// Strategy:
//   - Background ≥ RELOAD_THRESHOLD → force a clean page reload
//   - Background < RELOAD_THRESHOLD → just clear stuck locks (serialAuthLock handles the rest)
//
// The reload cooldown prevents reload loops if the user repeatedly backgrounds
// and foregrounds the app.

const RELOAD_THRESHOLD_MS = 10_000;       // 10 s in background → reload
const RELOAD_COOLDOWN_KEY = "kaitai-resume-reload-at";
const RELOAD_COOLDOWN_MS = 60_000;        // at most one reload per minute

let hiddenSince = 0;

function onAppHidden() {
  hiddenSince = Date.now();
}

function onAppVisible() {
  const hiddenMs = hiddenSince > 0 ? Date.now() - hiddenSince : 0;
  hiddenSince = 0;

  if (hiddenMs >= RELOAD_THRESHOLD_MS) {
    const lastAt = Number(sessionStorage.getItem(RELOAD_COOLDOWN_KEY) ?? 0);
    if (Date.now() - lastAt > RELOAD_COOLDOWN_MS) {
      sessionStorage.setItem(RELOAD_COOLDOWN_KEY, String(Date.now()));
      window.location.reload();
      return;
    }
  }

  // Short background or already reloaded recently — clear stuck locks instead.
  clearLocks();
}

// visibilitychange covers most iOS PWA resume cases.
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") {
    onAppHidden();
  } else {
    onAppVisible();
  }
});

// pagehide fires before bfcache freezes the page (complements visibilitychange).
window.addEventListener("pagehide", onAppHidden);

// pageshow with persisted:true fires when iOS restores from bfcache.
window.addEventListener("pageshow", (event) => {
  if (event.persisted) {
    onAppVisible();
  }
});

// ─── Client ──────────────────────────────────────────────────────────────────
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

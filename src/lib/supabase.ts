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

// ─── Resume recovery ─────────────────────────────────────────────────────────
// Browsers can leave unresolved fetch/auth state alive after background resume,
// especially on mobile and long-suspended desktop tabs. Restart after a real
// background so the app returns with a clean Supabase client.

let hiddenSince = 0;
const RESUME_RELOAD_THRESHOLD_MS = 1500;
const BACKGROUND_SIGN_OUT_MS = 5 * 60 * 1000;
const RESUME_RELOAD_COOLDOWN_MS = 8000;
const RESUME_RELOAD_COOLDOWN_KEY = "kaitai-resume-reload-at";
export const BACKGROUND_SIGN_OUT_REQUEST_KEY = "kaitai-background-signout-requested";

function reloadAfterResume(hiddenDuration: number) {
  if (hiddenDuration < RESUME_RELOAD_THRESHOLD_MS) {
    return false;
  }

  const lastReloadAt = Number(sessionStorage.getItem(RESUME_RELOAD_COOLDOWN_KEY) ?? 0);
  if (Date.now() - lastReloadAt < RESUME_RELOAD_COOLDOWN_MS) {
    return false;
  }

  if (hiddenDuration >= BACKGROUND_SIGN_OUT_MS) {
    localStorage.setItem(BACKGROUND_SIGN_OUT_REQUEST_KEY, "1");
  }

  sessionStorage.setItem(RESUME_RELOAD_COOLDOWN_KEY, String(Date.now()));
  window.location.reload();
  return true;
}

function onAppHidden() {
  hiddenSince = Date.now();
}

function onAppVisible() {
  if (hiddenSince === 0) {
    // Not returning from background (e.g. initial pageshow) — just clear locks.
    clearLocks();
    return;
  }
  const hiddenDuration = Date.now() - hiddenSince;
  hiddenSince = 0;

  clearLocks();
  if (reloadAfterResume(hiddenDuration)) {
    return;
  }
  window.dispatchEvent(new CustomEvent("kaitai:supabase-resume", { detail: { hiddenDuration } }));
}

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") {
    onAppHidden();
  } else {
    onAppVisible();
  }
});

window.addEventListener("pagehide", onAppHidden);

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

export async function recoverSupabaseConnection() {
  clearLocks();
  await supabase.auth.getSession().catch(() => undefined);
}

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

// ─── Resume recovery: reload only after long backgrounding ───────────────────
// Mobile browsers can leave auth/session state stale after background resume.
// We only force a reload when the app stayed hidden long enough to justify a
// clean restart, so short app switches remain uninterrupted.
//
// Loop prevention: after a reload the page needs a few seconds to boot. The
// cooldown key in sessionStorage stops a second reload from firing during that
// window. sessionStorage is cleared when the tab is closed, so the cooldown
// never carries over to a fresh launch.

const RELOAD_COOLDOWN_KEY = "kaitai-resume-reload-at";
const RELOAD_COOLDOWN_MS = 8_000; // comfortably longer than a typical reload
const BACKGROUND_RELOAD_THRESHOLD_MS = 60_000;

// Set on module init so the very first pageshow never triggers a reload.
sessionStorage.setItem(RELOAD_COOLDOWN_KEY, String(Date.now()));

let hiddenSince = 0;

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

  if (hiddenDuration < BACKGROUND_RELOAD_THRESHOLD_MS) {
    clearLocks();
    return;
  }

  const lastAt = Number(sessionStorage.getItem(RELOAD_COOLDOWN_KEY) ?? 0);
  if (Date.now() - lastAt < RELOAD_COOLDOWN_MS) {
    // Page was just reloaded — skip to avoid a reload loop.
    clearLocks();
    return;
  }

  sessionStorage.setItem(RELOAD_COOLDOWN_KEY, String(Date.now()));
  window.location.reload();
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

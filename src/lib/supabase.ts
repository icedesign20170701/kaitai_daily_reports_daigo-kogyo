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

// iOS バックグラウンド復帰時、凍結された fetch で詰まったロック待ちを即時解放するためのシグナル。
// visibilitychange → visible のタイミングで全リゾルバを呼び出す。
const lockResumeResolvers = new Set<() => void>();

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    for (const resolve of lockResumeResolvers) {
      resolve();
    }
    lockResumeResolvers.clear();
  }
});

const serialAuthLock: LockFunc = async <R>(name: string, _acquireTimeout: number, fn: () => Promise<R>) => {
  const previous = browserLocks[name] ?? Promise.resolve();
  let release!: () => void;
  let resumeResolver: (() => void) | undefined;

  const current = new Promise<void>((resolve) => {
    release = resolve;
  });

  const resumeGate = new Promise<void>((resolve) => {
    resumeResolver = resolve;
    lockResumeResolvers.add(resolve);
  });

  // 前のロック完了 / 復帰シグナル / 3秒タイムアウト のいずれか早い方で進む。
  // iOS で凍結された fetch が永久に完了しない場合でも確実に詰まりを解消する。
  const gate = Promise.race([
    previous,
    resumeGate,
    new Promise<void>((resolve) => window.setTimeout(resolve, 3000)),
  ]);

  const queued = gate.finally(() => current);
  browserLocks[name] = queued;

  try {
    await gate;
    return await fn();
  } finally {
    release();
    if (resumeResolver !== undefined) {
      lockResumeResolvers.delete(resumeResolver);
    }
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

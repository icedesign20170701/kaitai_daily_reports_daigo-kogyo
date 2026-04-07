import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { resetSupabaseClient, supabase } from "@/lib/supabase";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function toDateInputValue(value = new Date()) {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function downloadTextFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function withTimeout<T>(promise: PromiseLike<T>, timeoutMs: number, message = "読み込みがタイムアウトしました"): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error(message));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
  }
}

function isRecoverableLoadError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return (
    message.includes("timeout") ||
    message.includes("タイムアウト") ||
    message.includes("fetch") ||
    message.includes("network") ||
    message.includes("load failed") ||
    message.includes("failed to fetch")
  );
}

export async function withSupabaseRecovery<T>(
  loader: () => PromiseLike<T>,
  timeoutMs: number,
  message = "読み込みがタイムアウトしました",
): Promise<T> {
  try {
    return await withTimeout(Promise.resolve(loader()), timeoutMs, message);
  } catch (error) {
    if (!isRecoverableLoadError(error)) {
      throw error;
    }

    resetSupabaseClient();

    try {
      await supabase.auth.getSession();
    } catch {
      // Session restore is best-effort. A second failure will be surfaced by the retried loader.
    }

    return withTimeout(Promise.resolve(loader()), timeoutMs, message);
  }
}

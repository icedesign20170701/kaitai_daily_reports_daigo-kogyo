import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

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
  let visibilityListener: (() => void) | null = null;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        const rejectAfterVisibleTimeout = () => {
          timeoutId = setTimeout(() => {
            if (typeof document !== "undefined" && document.visibilityState === "hidden") {
              visibilityListener = () => {
                document.removeEventListener("visibilitychange", visibilityListener as EventListener);
                visibilityListener = null;
                rejectAfterVisibleTimeout();
              };
              document.addEventListener("visibilitychange", visibilityListener);
              return;
            }

            reject(new Error(message));
          }, timeoutMs);
        };

        rejectAfterVisibleTimeout();
      }),
    ]);
  } finally {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
    if (visibilityListener !== null && typeof document !== "undefined") {
      document.removeEventListener("visibilitychange", visibilityListener);
    }
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
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
    await sleep(250);
    return withTimeout(Promise.resolve(loader()), timeoutMs, message);
  }
}

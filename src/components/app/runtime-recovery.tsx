import { useEffect } from "react";

const AUTH_LOCK_RECOVERY_KEY = "kaitai-auth-lock-recovery-at";
const AUTH_LOCK_RECOVERY_COOLDOWN_MS = 15000;

type RecoveryWindow = Window & {
  __kaitaiSupabaseClient?: unknown;
  __kaitaiSupabaseLocks?: Record<string, Promise<unknown>>;
};

function shouldRecoverFromError(message: string) {
  return (
    message.includes('Lock "lock:sb-') &&
    (message.includes("stole it") || message.includes("steal option") || message.includes("was not released within"))
  );
}

function canTriggerRecovery() {
  const lastTriggeredAt = Number(sessionStorage.getItem(AUTH_LOCK_RECOVERY_KEY) ?? 0);
  return !lastTriggeredAt || Date.now() - lastTriggeredAt > AUTH_LOCK_RECOVERY_COOLDOWN_MS;
}

function triggerRecovery() {
  if (!canTriggerRecovery()) {
    return;
  }

  sessionStorage.setItem(AUTH_LOCK_RECOVERY_KEY, String(Date.now()));

  const recoveryWindow = window as RecoveryWindow;
  recoveryWindow.__kaitaiSupabaseClient = undefined;
  recoveryWindow.__kaitaiSupabaseLocks = {};

  window.setTimeout(() => {
    window.location.reload();
  }, 50);
}

export function RuntimeRecovery() {
  useEffect(() => {
    const handleErrorEvent = (event: ErrorEvent) => {
      const message = event.error instanceof Error ? event.error.message : event.message ?? "";
      if (shouldRecoverFromError(message)) {
        triggerRecovery();
      }
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      const message =
        event.reason instanceof Error
          ? event.reason.message
          : typeof event.reason === "string"
            ? event.reason
            : String(event.reason ?? "");

      if (shouldRecoverFromError(message)) {
        triggerRecovery();
      }
    };

    window.addEventListener("error", handleErrorEvent);
    window.addEventListener("unhandledrejection", handleRejection);

    return () => {
      window.removeEventListener("error", handleErrorEvent);
      window.removeEventListener("unhandledrejection", handleRejection);
    };
  }, []);

  return null;
}

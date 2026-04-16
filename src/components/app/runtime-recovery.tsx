import { useEffect } from "react";

const AUTH_LOCK_RECOVERY_KEY = "kaitai-auth-lock-recovery-at";
const AUTH_LOCK_RECOVERY_COOLDOWN_MS = 15000;
const APP_RESUME_RECOVERY_KEY = "kaitai-app-resume-recovery-at";
const APP_HIDDEN_AT_KEY = "kaitai-app-hidden-at";
const APP_RESUME_RECOVERY_COOLDOWN_MS = 10000;
const APP_RESUME_RELOAD_THRESHOLD_MS = 1000;

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

function triggerResumeReload() {
  const lastTriggeredAt = Number(sessionStorage.getItem(APP_RESUME_RECOVERY_KEY) ?? 0);
  if (lastTriggeredAt && Date.now() - lastTriggeredAt <= APP_RESUME_RECOVERY_COOLDOWN_MS) {
    return;
  }

  sessionStorage.setItem(APP_RESUME_RECOVERY_KEY, String(Date.now()));
  window.setTimeout(() => {
    window.location.reload();
  }, 50);
}

export function RuntimeRecovery() {
  useEffect(() => {
    let lastResumeHandledAt = 0;

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

    const markHidden = () => {
      sessionStorage.setItem(APP_HIDDEN_AT_KEY, String(Date.now()));
    };

    const handleResume = () => {
      const hiddenAt = Number(sessionStorage.getItem(APP_HIDDEN_AT_KEY) ?? 0);
      if (!hiddenAt) {
        return;
      }

      const now = Date.now();
      if (now - lastResumeHandledAt < 500) {
        return;
      }

      const hiddenDuration = now - hiddenAt;
      sessionStorage.removeItem(APP_HIDDEN_AT_KEY);
      lastResumeHandledAt = now;

      if (hiddenDuration >= APP_RESUME_RELOAD_THRESHOLD_MS && window.location.pathname !== "/login") {
        triggerResumeReload();
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        markHidden();
        return;
      }

      handleResume();
    };

    window.addEventListener("error", handleErrorEvent);
    window.addEventListener("unhandledrejection", handleRejection);
    window.addEventListener("pagehide", markHidden);
    window.addEventListener("blur", markHidden);
    window.addEventListener("focus", handleResume);
    window.addEventListener("pageshow", handleResume);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    handleResume();

    return () => {
      window.removeEventListener("error", handleErrorEvent);
      window.removeEventListener("unhandledrejection", handleRejection);
      window.removeEventListener("pagehide", markHidden);
      window.removeEventListener("blur", markHidden);
      window.removeEventListener("focus", handleResume);
      window.removeEventListener("pageshow", handleResume);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return null;
}

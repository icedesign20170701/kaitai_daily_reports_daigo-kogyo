import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { BACKGROUND_SIGN_OUT_MS, BACKGROUND_SIGN_OUT_REQUEST_KEY, isSupabaseConfigured, supabase } from "@/lib/supabase";
import { withTimeout } from "@/lib/utils";
import type { AppUser } from "@/types/database";

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  appUser: AppUser | null;
  isMaster: boolean;
  isSubcontractor: boolean;
  loading: boolean;
  error: string | null;
  retry: () => void;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setSession(null);
      setUser(null);
      setAppUser(null);
      setLoading(false);
      return;
    }

    let mounted = true;
    let appUserRequestId = 0;
    let deferredProfile: number | undefined;
    let signingOut = false;
    let activeUserId: string | null = null;
    const hiddenKey = "kaitai-hidden-at";
    const signOutKey = BACKGROUND_SIGN_OUT_REQUEST_KEY;
    let forceSignOut = localStorage.getItem(signOutKey) === "1";
    setLoading(true);
    setError(null);
    const loadingTimeout = window.setTimeout(() => {
      if (!mounted) return;
      ++appUserRequestId;
      setError("認証情報の読み込みがタイムアウトしました。再試行してください。");
      setLoading(false);
    }, 15000);

    const loadAppUser = async (currentUser: User | null) => {
      const requestId = ++appUserRequestId;

      if (!currentUser) {
        if (mounted) {
          setAppUser(null);
        }
        return;
      }

      try {
        const { data, error } = await withTimeout(supabase
          .from("app_users")
          .select("user_id, display_name, is_master, is_subcontractor, sort_order, created_at")
          .eq("user_id", currentUser.id)
          .maybeSingle(), 8000, "ユーザー情報の取得がタイムアウトしました。");

        if (error) throw error;
        if (!mounted || requestId !== appUserRequestId) return;

        if (!data) {
          const { data: inserted, error: insertError } = await withTimeout(supabase
            .from("app_users")
            .insert({
              user_id: currentUser.id,
              display_name: null,
              is_master: false,
              is_subcontractor: false,
            })
            .select("user_id, display_name, is_master, is_subcontractor, sort_order, created_at")
            .maybeSingle(), 8000, "ユーザー情報の登録がタイムアウトしました。");
          if (insertError) throw insertError;

          if (!mounted || requestId !== appUserRequestId) {
            return;
          }
          setAppUser((inserted ?? null) as AppUser | null);
          return;
        }

        if (!mounted || requestId !== appUserRequestId) {
          return;
        }
        setAppUser((data ?? null) as AppUser | null);
      } catch (cause) {
        if (mounted && requestId === appUserRequestId) {
          setError(cause instanceof Error ? cause.message : "ユーザー情報を取得できませんでした。");
        }
      } finally {
        if (mounted && requestId === appUserRequestId) {
          window.clearTimeout(loadingTimeout);
          setLoading(false);
        }
      }
    };

    // Never await a Supabase request inside an auth notification: the SDK
    // may still hold its session lock until this callback returns.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted || forceSignOut) return;
      ++appUserRequestId;
      window.clearTimeout(deferredProfile);
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setError(null);
      if (nextSession?.user.id !== activeUserId) {
        setAppUser(null);
        setLoading(Boolean(nextSession));
      }
      activeUserId = nextSession?.user.id ?? null;
      if (!nextSession) {
        setAppUser(null);
        setLoading(false);
        window.clearTimeout(loadingTimeout);
        return;
      }
      deferredProfile = window.setTimeout(() => {
        if (mounted) void loadAppUser(nextSession.user);
      }, 0);
    });

    const forceLocalSignOut = async () => {
      if (signingOut) return;
      signingOut = true;
      forceSignOut = true;
      localStorage.setItem(signOutKey, "1");
      ++appUserRequestId;
      window.clearTimeout(deferredProfile);
      window.clearTimeout(loadingTimeout);
      setSession(null);
      setUser(null);
      setAppUser(null);
      activeUserId = null;
      setLoading(true);
      setError(null);
      try {
        const { error: signOutError } = await withTimeout(
          supabase.auth.signOut({ scope: "local" }), 5000,
          "ログアウト処理がタイムアウトしました。再試行してください。",
        );
        if (signOutError) throw signOutError;
        if (!mounted) return;
        localStorage.removeItem(signOutKey);
        forceSignOut = false;
      } catch (cause) {
        if (mounted) setError(cause instanceof Error ? cause.message : "ログアウトに失敗しました。");
      } finally {
        signingOut = false;
        if (mounted) setLoading(false);
      }
    };

    const handleHidden = () => {
      // visibilitychange and pagehide can both fire for the same departure.
      if (!sessionStorage.getItem(hiddenKey)) sessionStorage.setItem(hiddenKey, String(Date.now()));
    };
    const handleVisible = () => {
      if (document.visibilityState !== "visible") return;
      const hiddenAt = Number(sessionStorage.getItem(hiddenKey) ?? 0);
      sessionStorage.removeItem(hiddenKey);
      if (forceSignOut || (hiddenAt > 0 && Date.now() - hiddenAt >= BACKGROUND_SIGN_OUT_MS)) {
        void forceLocalSignOut();
      } else if (hiddenAt > 0) {
        // Keep the mounted form (including selected photos) during short absences.
        void withTimeout(supabase.auth.getSession(), 5000, "認証の復旧がタイムアウトしました。再試行してください。")
          .then(({ error: sessionError }) => { if (sessionError) throw sessionError; })
          .catch((cause: unknown) => {
            if (mounted && !forceSignOut) setError(cause instanceof Error ? cause.message : "認証を復旧できませんでした。");
          });
      }
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") handleHidden();
      else handleVisible();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", handleHidden);
    window.addEventListener("pageshow", handleVisible);
    handleVisible();

    return () => {
      mounted = false;
      ++appUserRequestId;
      window.clearTimeout(loadingTimeout);
      window.clearTimeout(deferredProfile);
      subscription.unsubscribe();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", handleHidden);
      window.removeEventListener("pageshow", handleVisible);
    };
  }, [attempt]);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("app_users")
      .select("user_id, display_name, is_master, is_subcontractor, sort_order, created_at")
      .eq("user_id", user.id)
      .maybeSingle();
    if (data) {
      setAppUser(data as AppUser);
    }
  }, [user]);

  const value = useMemo(
    () => ({
      user,
      session,
      appUser,
      isMaster: appUser?.is_master ?? false,
      isSubcontractor: appUser?.is_subcontractor ?? false,
      loading,
      error,
      retry,
      refreshProfile,
    }),
    [user, session, appUser, loading, error, retry, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return value;
}

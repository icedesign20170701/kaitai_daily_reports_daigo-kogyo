import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import type { AppUser } from "@/types/database";

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  appUser: AppUser | null;
  isMaster: boolean;
  isSubcontractor: boolean;
  loading: boolean;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const BACKGROUND_SIGN_OUT_MS = 5 * 60 * 1000;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setSession(null);
      setUser(null);
      setAppUser(null);
      setLoading(false);
      return;
    }

    let mounted = true;
    const loadingTimeout = window.setTimeout(() => {
      if (!mounted) return;
      setLoading(false);
    }, 4000);
    let appUserRequestId = 0;

    const loadAppUser = async (currentUser: User | null) => {
      const requestId = ++appUserRequestId;

      if (!currentUser) {
        if (mounted) {
          setAppUser(null);
        }
        return;
      }

      try {
        const { data, error } = await supabase
          .from("app_users")
          .select("user_id, display_name, is_master, is_subcontractor, sort_order, created_at")
          .eq("user_id", currentUser.id)
          .maybeSingle();

        if (error) {
          if (mounted && requestId === appUserRequestId) {
            setAppUser(null);
          }
          return;
        }

        if (!data) {
          const { data: inserted } = await supabase
            .from("app_users")
            .insert({
              user_id: currentUser.id,
              display_name: null,
              is_master: false,
              is_subcontractor: false,
            })
            .select("user_id, display_name, is_master, is_subcontractor, sort_order, created_at")
            .maybeSingle();

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
      } catch {
        if (mounted && requestId === appUserRequestId) {
          setAppUser(null);
        }
      }
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      try {
        if (!mounted) {
          return;
        }
        setSession(nextSession);
        setUser(nextSession?.user ?? null);
        await loadAppUser(nextSession?.user ?? null);
      } catch {
        if (mounted) {
          setAppUser(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    });

    return () => {
      mounted = false;
      window.clearTimeout(loadingTimeout);
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      return;
    }

    let hiddenAt = 0;

    const forceLocalSignOut = async () => {
      await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
      setSession(null);
      setUser(null);
      setAppUser(null);
      setLoading(false);
    };

    const handleHidden = () => {
      hiddenAt = Date.now();
    };

    const handleVisible = () => {
      if (hiddenAt === 0) {
        return;
      }

      const hiddenDuration = Date.now() - hiddenAt;
      hiddenAt = 0;
      if (hiddenDuration >= BACKGROUND_SIGN_OUT_MS) {
        void forceLocalSignOut();
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        handleHidden();
        return;
      }
      handleVisible();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", handleHidden);
    window.addEventListener("pageshow", handleVisible);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", handleHidden);
      window.removeEventListener("pageshow", handleVisible);
    };
  }, []);

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
      refreshProfile,
    }),
    [user, session, appUser, loading, refreshProfile],
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

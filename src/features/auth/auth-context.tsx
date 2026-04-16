import { createContext, useContext, useEffect, useMemo, useState } from "react";
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
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

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
          .select("user_id, display_name, is_master, is_subcontractor, created_at")
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
            .select("user_id, display_name, is_master, is_subcontractor, created_at")
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

  const value = useMemo(
    () => ({
      user,
      session,
      appUser,
      isMaster: appUser?.is_master ?? false,
      isSubcontractor: appUser?.is_subcontractor ?? false,
      loading,
    }),
    [user, session, appUser, loading],
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

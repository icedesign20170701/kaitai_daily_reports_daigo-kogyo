import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import type { AppUser } from "@/types/database";

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  appUser: AppUser | null;
  isMaster: boolean;
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
    }, 8000);

    const loadAppUser = async (currentUser: User | null) => {
      if (!currentUser) {
        setAppUser(null);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("app_users")
          .select("user_id, display_name, is_master, created_at")
          .eq("user_id", currentUser.id)
          .maybeSingle();

        if (error) {
          setAppUser(null);
          return;
        }

        if (!data) {
          const { data: inserted } = await supabase
            .from("app_users")
            .insert({
              user_id: currentUser.id,
              display_name: null,
              is_master: false,
            })
            .select("user_id, display_name, is_master, created_at")
            .maybeSingle();

          if (!mounted) {
            return;
          }
          setAppUser((inserted ?? null) as AppUser | null);
          return;
        }

        if (!mounted) {
          return;
        }
        setAppUser((data ?? null) as AppUser | null);
      } catch {
        setAppUser(null);
      }
    };

    const bootstrap = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!mounted) {
          return;
        }
        setSession(data.session);
        setUser(data.session?.user ?? null);
        await loadAppUser(data.session?.user ?? null);
      } catch {
        if (!mounted) {
          return;
        }
        setSession(null);
        setUser(null);
        setAppUser(null);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void bootstrap();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      try {
        setSession(nextSession);
        setUser(nextSession?.user ?? null);
        await loadAppUser(nextSession?.user ?? null);
      } catch {
        setAppUser(null);
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
    () => ({ user, session, appUser, isMaster: appUser?.is_master ?? false, loading }),
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

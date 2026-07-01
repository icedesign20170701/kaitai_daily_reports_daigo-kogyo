import { useEffect, useMemo } from "react";
import { ClipboardList, LogOut, MapPinned, Settings2, UserCircle2 } from "lucide-react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { signOut } from "@/features/auth/auth-service";
import { useAuth } from "@/features/auth/auth-context";

const navItems = [
  { to: "/reports", label: "日報", icon: ClipboardList },
  { to: "/sites", label: "現場", icon: MapPinned },
  { to: "/masters/work-categories", label: "マスタ", icon: Settings2 },
  { to: "/settings/profile", label: "設定", icon: UserCircle2 },
];

export function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isSubcontractor } = useAuth();
  const isReportEditingScreen = location.pathname.startsWith("/reports/new") || /^\/reports\/[^/]+$/.test(location.pathname);
  const visibleNavItems = useMemo(
    () => (isSubcontractor ? navItems.filter((item) => item.to === "/reports") : navItems),
    [isSubcontractor],
  );
  const heading = location.pathname.startsWith("/reports/new")
    ? "日報入力"
    : location.pathname.startsWith("/sites")
      ? "現場管理"
      : location.pathname.startsWith("/masters")
        ? "マスタ管理"
        : "日報管理";

  useEffect(() => {
    if (!isSubcontractor) {
      return;
    }

    if (location.pathname.startsWith("/sites") || location.pathname.startsWith("/masters") || location.pathname.startsWith("/settings")) {
      navigate("/reports", { replace: true });
    }
  }, [isSubcontractor, location.pathname, navigate]);

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success("ログアウトしました");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "ログアウトに失敗しました");
    }
  };

  return (
    <div className="industrial-grid min-h-screen md:grid md:grid-cols-[260px_1fr]">
      <aside className="hidden border-r border-slate-800/70 bg-slate-950 text-slate-100 md:block">
        <div className="sticky top-0 flex h-screen flex-col p-4">
          <div className="mb-8 overflow-hidden rounded-3xl border border-sky-400/20 bg-gradient-to-br from-slate-900 via-slate-900 to-sky-950 px-4 py-5 shadow-soft">
            <p className="mt-2 text-2xl font-extrabold tracking-tight text-white">作業日報</p>
          </div>
          <nav className="space-y-2">
            {visibleNavItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold text-slate-400 transition hover:bg-white/8 hover:text-white",
                    isActive && "bg-gradient-to-r from-sky-500/20 to-amber-400/10 text-white ring-1 ring-sky-400/30",
                  )
                }
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            ))}
          </nav>
          <Button variant="outline" className="mt-auto justify-start border-white/10 bg-white/5 text-white hover:bg-white/10" onClick={handleSignOut}>
            <LogOut className="h-4 w-4" />
            ログアウト
          </Button>
        </div>
      </aside>

      <div className="flex min-h-screen flex-col">
        {!isReportEditingScreen ? (
          <header className="border-b border-white/50 bg-background/85 backdrop-blur-xl md:sticky md:top-0 md:z-20">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 md:px-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">Daily Reports</p>
                <h1 className="text-lg font-extrabold tracking-tight">{heading}</h1>
              </div>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4" />
                ログアウト
              </Button>
            </div>
          </header>
        ) : null}

        <main className="flex-1">
          <Outlet />
        </main>

        {!isReportEditingScreen ? (
          <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-white/50 bg-background/90 p-2 backdrop-blur-xl md:hidden">
            <div className="grid grid-cols-4 gap-2">
              {visibleNavItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      "flex flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-xs font-semibold text-muted-foreground transition",
                      isActive && "bg-gradient-to-b from-sky-500/15 to-sky-400/5 text-foreground ring-1 ring-sky-500/20",
                    )
                  }
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </NavLink>
              ))}
            </div>
          </nav>
        ) : null}
      </div>
    </div>
  );
}

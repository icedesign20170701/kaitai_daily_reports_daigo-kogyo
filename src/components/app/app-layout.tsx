import { ClipboardList, LogOut, MapPinned, Settings2 } from "lucide-react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { signOut } from "@/features/auth/auth-service";

const navItems = [
  { to: "/reports", label: "日報", icon: ClipboardList },
  { to: "/sites", label: "現場", icon: MapPinned },
  { to: "/masters/work-items", label: "マスタ", icon: Settings2 },
];

export function AppLayout() {
  const location = useLocation();
  const heading = location.pathname.startsWith("/reports/new")
    ? "日報入力"
    : location.pathname.startsWith("/sites")
      ? "現場管理"
      : location.pathname.startsWith("/masters")
        ? "マスタ管理"
        : "日報管理";

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success("ログアウトしました");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "ログアウトに失敗しました");
    }
  };

  return (
    <div className="min-h-screen md:grid md:grid-cols-[240px_1fr]">
      <aside className="hidden border-r bg-card/70 md:block">
        <div className="sticky top-0 flex h-screen flex-col p-4">
          <div className="mb-8 rounded-2xl bg-primary px-4 py-5 text-primary-foreground shadow-soft">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-foreground/80">Kaitai</p>
            <p className="mt-1 text-xl font-extrabold">日報アプリ</p>
            <p className="mt-2 text-sm text-primary-foreground/80">現場の入力を最優先にした最小構成</p>
          </div>
          <nav className="space-y-2">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-muted-foreground transition hover:bg-accent hover:text-foreground",
                    isActive && "bg-accent text-foreground",
                  )
                }
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            ))}
          </nav>
          <Button variant="outline" className="mt-auto justify-start" onClick={handleSignOut}>
            <LogOut className="h-4 w-4" />
            ログアウト
          </Button>
        </div>
      </aside>

      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 md:px-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Daily Reports</p>
              <h1 className="text-lg font-bold">{heading}</h1>
            </div>
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4" />
              ログアウト
            </Button>
          </div>
        </header>

        <main className="flex-1">
          <Outlet />
        </main>

        <nav className="fixed inset-x-0 bottom-0 z-20 border-t bg-card/95 p-2 backdrop-blur md:hidden">
          <div className="grid grid-cols-3 gap-2">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    "flex flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-xs font-semibold text-muted-foreground",
                    isActive && "bg-accent text-foreground",
                  )
                }
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </NavLink>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
}

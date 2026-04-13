import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/features/auth/auth-context";

export function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [progress, setProgress] = useState(5);

  useEffect(() => {
    if (!loading) {
      setProgress(100);
      return;
    }

    setProgress(5);
    const startedAt = Date.now();
    const intervalId = window.setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const nextProgress = Math.min(95, Math.round((elapsed / 4000) * 100));
      setProgress(Math.max(5, nextProgress));
    }, 120);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [loading]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <CardContent className="space-y-4 py-8 text-center">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">認証状態を確認しています...</p>
              <p className="text-2xl font-extrabold text-foreground">{progress}%</p>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-100 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}

import { useEffect, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function LoadingState({
  message = "読み込み中...",
  showProgress = false,
  expectedDurationMs = 8000,
}: {
  message?: string;
  showProgress?: boolean;
  expectedDurationMs?: number;
}) {
  const [progress, setProgress] = useState(showProgress ? 5 : 0);

  useEffect(() => {
    if (!showProgress) {
      return;
    }

    setProgress(5);
    const startedAt = Date.now();
    const intervalId = window.setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const nextProgress = Math.min(95, Math.round((elapsed / expectedDurationMs) * 100));
      setProgress(Math.max(5, nextProgress));
    }, 120);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [expectedDurationMs, showProgress]);

  return (
    <Card>
      <CardContent
        className={
          showProgress
            ? "space-y-4 py-8 text-center"
            : "flex items-center justify-center gap-3 py-10 text-sm font-medium text-muted-foreground"
        }
      >
        {showProgress ? (
          <>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">{message}</p>
              <p className="text-2xl font-extrabold text-foreground">{progress}%</p>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-100 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </>
        ) : (
          <>
            <LoaderCircle className="h-5 w-5 animate-spin" />
            <span>{message}</span>
          </>
        )}
      </CardContent>
    </Card>
  );
}

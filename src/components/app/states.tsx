import { useEffect, useState } from "react";
import { AlertTriangle, Inbox } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center gap-3 py-10 text-center">
        <Inbox className="h-10 w-10 text-muted-foreground" />
        <div>
          <p className="font-semibold">{title}</p>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function ErrorState({ message }: { message: string }) {
  const isTimeoutError = message.includes("タイムアウト");
  const [remainingSeconds, setRemainingSeconds] = useState(3);

  useEffect(() => {
    if (!isTimeoutError) {
      return;
    }

    setRemainingSeconds(3);
    const countdownInterval = window.setInterval(() => {
      setRemainingSeconds((current) => {
        if (current <= 1) {
          window.clearInterval(countdownInterval);
          window.location.reload();
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(countdownInterval);
  }, [isTimeoutError, message]);

  return (
    <Card className="border-destructive/30">
      <CardContent className="flex items-center gap-3 py-5 text-destructive">
        <AlertTriangle className="h-5 w-5" />
        <div className="space-y-1">
          <p className="text-sm font-medium">{message}</p>
          {isTimeoutError ? (
            <p className="text-xs font-medium text-destructive/80">{remainingSeconds}秒後に画面をリロードします。</p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

import { Link, isRouteErrorResponse, useRouteError } from "react-router-dom";
import { RefreshCcw } from "lucide-react";
import { PageShell } from "@/components/app/page-shell";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

function getMessage(error: unknown) {
  if (isRouteErrorResponse(error)) {
    return `${error.status} ${error.statusText}`;
  }

  if (error instanceof Error) {
    if (error.message.includes("Failed to fetch dynamically imported module") || error.message.includes("MIME type")) {
      return "アプリの更新直後か、通信中断で画面データの読み込みに失敗しました。再読み込みしてください。";
    }
    return error.message;
  }

  return "画面の表示に失敗しました。";
}

export function RouteErrorPage() {
  const error = useRouteError();
  const message = getMessage(error);

  return (
    <PageShell>
      <Card className="mx-auto max-w-lg">
        <CardHeader>
          <CardTitle>画面を表示できません</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{message}</p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={() => window.location.reload()}>
              <RefreshCcw className="h-4 w-4" />
              再読み込み
            </Button>
            <Link to="/reports" className={cn(buttonVariants({ variant: "outline" }))}>
              日報一覧へ戻る
            </Link>
          </div>
        </CardContent>
      </Card>
    </PageShell>
  );
}

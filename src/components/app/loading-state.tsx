import { LoaderCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function LoadingState({ message = "読み込み中..." }: { message?: string }) {
  return (
    <Card>
      <CardContent className="flex items-center justify-center gap-3 py-10 text-sm font-medium text-muted-foreground">
        <LoaderCircle className="h-5 w-5 animate-spin" />
        <span>{message}</span>
      </CardContent>
    </Card>
  );
}

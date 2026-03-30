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
  return (
    <Card className="border-destructive/30">
      <CardContent className="flex items-center gap-3 py-5 text-destructive">
        <AlertTriangle className="h-5 w-5" />
        <p className="text-sm font-medium">{message}</p>
      </CardContent>
    </Card>
  );
}

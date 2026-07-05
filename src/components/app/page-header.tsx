import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  action,
  className,
  contentClassName,
  actionClassName,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  contentClassName?: string;
  actionClassName?: string;
}) {
  return (
    <div className={cn("mb-5 flex flex-col gap-3 md:mb-6 md:flex-row md:items-end md:justify-between", className)}>
      <div className={cn("min-w-0 space-y-1", contentClassName)}>
        <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {action ? <div className={cn("flex shrink-0 items-center gap-2", actionClassName)}>{action}</div> : null}
    </div>
  );
}

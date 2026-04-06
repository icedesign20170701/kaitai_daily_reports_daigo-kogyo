import * as React from "react";
import { isHoliday } from "@holiday-jp/holiday_jp";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

export function Calendar({
  className,
  classNames,
  formatters,
  modifiers,
  modifiersClassNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      {...props}
      showOutsideDays={showOutsideDays}
      locale={ja}
      modifiers={{
        saturday: (date) => date.getDay() === 6,
        sunday: (date) => date.getDay() === 0,
        holiday: (date) => isHoliday(date),
        ...modifiers,
      }}
      className={cn(
        "p-0 [--rdp-day-width:2.25rem] [--rdp-day-height:2.25rem] [--rdp-day_button-width:2.25rem] [--rdp-day_button-height:2.25rem] [--rdp-weekday-padding:0.25rem_0] [--rdp-months-gap:0.75rem]",
        className,
      )}
      classNames={{
        months: "flex flex-col gap-4",
        month: "space-y-2",
        month_caption: "relative flex min-h-11 w-full items-center justify-center px-10 pt-3",
        caption_label: "pointer-events-none text-sm font-semibold",
        nav: "absolute inset-x-0 top-2 z-10 flex items-center justify-between px-2",
        button_previous: cn(
          buttonVariants({ variant: "outline", size: "icon" }),
          "h-8 w-8 min-h-8 min-w-8 rounded-lg p-0",
        ),
        button_next: cn(
          buttonVariants({ variant: "outline", size: "icon" }),
          "h-8 w-8 min-h-8 min-w-8 rounded-lg p-0",
        ),
        month_grid: "w-full border-collapse",
        weekday: "h-8 px-0 text-center text-[0.8rem] font-medium text-muted-foreground",
        day: "p-0 text-center",
        day_button: cn(buttonVariants({ variant: "ghost" }), "h-9 w-9 min-h-9 min-w-9 rounded-lg p-0 text-sm font-normal aria-selected:opacity-100"),
        selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
        today: "bg-secondary text-secondary-foreground",
        outside: "text-muted-foreground opacity-50",
        disabled: "text-muted-foreground opacity-50",
        hidden: "invisible",
        ...classNames,
      }}
      modifiersClassNames={{
        saturday: "text-sky-600",
        sunday: "text-red-600",
        holiday: "text-red-600",
        ...modifiersClassNames,
      }}
      formatters={{
        formatWeekdayName: (date) => format(date, "EEEEE", { locale: ja }),
        ...formatters,
      }}
      components={{
        Chevron: ({ orientation, className: iconClassName, ...iconProps }) =>
          orientation === "left" ? (
            <ChevronLeft className={cn("h-4 w-4", iconClassName)} {...iconProps} />
          ) : (
            <ChevronRight className={cn("h-4 w-4", iconClassName)} {...iconProps} />
          ),
      }}
    />
  );
}

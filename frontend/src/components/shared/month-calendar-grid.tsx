'use client';

import { addMonths, eachDayOfInterval, endOfMonth, format, getDay, parse, startOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export type DayVariant = 'available' | 'booked' | 'blocked' | 'past';

export interface DayCellData {
  date: string;
  day: number;
  variant: DayVariant;
  label?: string;
}

interface LegendItem {
  variant: DayVariant;
  label: string;
}

interface MonthCalendarGridProps {
  month: string;
  onMonthChange: (month: string) => void;
  days: DayCellData[];
  minMonth?: string;
  maxMonth?: string;
  onDayClick?: (day: DayCellData) => void;
  isLoading?: boolean;
  legend?: LegendItem[];
}

const WEEKDAY_LABELS = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'];

const cellVariantClasses: Record<DayVariant, string> = {
  available: 'border-border bg-background text-foreground hover:border-primary/50',
  booked: 'border-amber-200 bg-amber-50 text-amber-800',
  blocked: 'border-border bg-muted text-muted-foreground',
  past: 'border-transparent bg-muted/30 text-muted-foreground/40',
};

const legendDotClasses: Record<DayVariant, string> = {
  available: 'border border-border bg-background',
  booked: 'bg-amber-400',
  blocked: 'bg-muted-foreground/60',
  past: 'bg-muted-foreground/20',
};

const monthToDate = (month: string) => parse(month, 'yyyy-MM', new Date());
const dateToMonth = (date: Date) => format(date, 'yyyy-MM');

export const MonthCalendarGrid = ({
  month,
  onMonthChange,
  days,
  minMonth,
  maxMonth,
  onDayClick,
  isLoading = false,
  legend,
}: MonthCalendarGridProps) => {
  const monthDate = monthToDate(month);
  const monthStart = startOfMonth(monthDate);
  const monthEnd = endOfMonth(monthDate);

  const leadingBlanks = (getDay(monthStart) + 6) % 7;
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const dayMap = new Map(days.map((item) => [item.date, item]));

  const prevMonth = dateToMonth(addMonths(monthDate, -1));
  const nextMonth = dateToMonth(addMonths(monthDate, 1));
  const canGoPrev = !minMonth || prevMonth >= minMonth;
  const canGoNext = !maxMonth || nextMonth <= maxMonth;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          onClick={() => onMonthChange(prevMonth)}
          disabled={!canGoPrev}
          aria-label="Mes anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <p className="text-sm font-semibold capitalize">
          {format(monthDate, 'MMMM yyyy', { locale: es })}
        </p>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          onClick={() => onMonthChange(nextMonth)}
          disabled={!canGoNext}
          aria-label="Mes siguiente"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-1.5 text-center text-[11px] font-medium text-muted-foreground">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="py-1">
            {label}
          </div>
        ))}
      </div>

      {isLoading ? (
        <div className="mt-1.5 grid grid-cols-7 gap-1.5">
          {Array.from({ length: 35 }).map((_, index) => (
            <Skeleton key={index} className="aspect-square rounded-md" />
          ))}
        </div>
      ) : (
        <div className="mt-1.5 grid grid-cols-7 gap-1.5 text-center text-xs">
          {Array.from({ length: leadingBlanks }).map((_, index) => (
            <div key={`blank-${index}`} aria-hidden="true" />
          ))}
          {monthDays.map((date) => {
            const dateKey = format(date, 'yyyy-MM-dd');
            const cell: DayCellData = dayMap.get(dateKey) ?? {
              date: dateKey,
              day: date.getDate(),
              variant: 'available',
            };
            const clickable = Boolean(onDayClick) && cell.variant !== 'past';

            return (
              <button
                key={dateKey}
                type="button"
                disabled={!clickable}
                onClick={() => onDayClick?.(cell)}
                aria-label={`${cell.day} de ${format(monthDate, 'MMMM', { locale: es })}${cell.label ? `: ${cell.label}` : ''}`}
                className={cn(
                  'flex min-h-14 flex-col items-center justify-start rounded-md border p-1.5 transition-colors',
                  cellVariantClasses[cell.variant],
                  clickable ? 'cursor-pointer' : 'cursor-default',
                )}
              >
                <span className="font-semibold">{cell.day}</span>
                {cell.label ? (
                  <span className="mt-0.5 line-clamp-2 text-[10px] leading-tight">
                    {cell.label}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      )}

      {legend?.length ? (
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
          {legend.map((item) => (
            <span key={item.variant} className="inline-flex items-center gap-1.5">
              <span className={cn('h-2.5 w-2.5 rounded-full', legendDotClasses[item.variant])} />
              {item.label}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
};

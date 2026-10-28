import { CalendarBlockStatus } from '@prisma/client';

export class CalendarBlockEntity {
  id!: string;
  venueId!: string;
  date!: Date;
  status: CalendarBlockStatus = CalendarBlockStatus.BLOCKED;
  useTypeId: string | null = null;
  useType: { id: string; name: string } | null = null;
  // Legacy free-text note from before status/useType existed -- no longer set by new blocks,
  // kept only as a fallback label for old rows that have no useType (see the migration's
  // backfill comment). Never read for anything but display.
  reason: string | null = null;
  isRecurring: boolean = false;
  recurringRule: Record<string, unknown> | null = null;
  createdAt!: Date;

  venue?: { id: string; name: string };

  constructor(partial: Partial<CalendarBlockEntity>) {
    Object.assign(this, partial);
  }

  isCurrentlyActive(): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const blockDate = new Date(this.date);
    blockDate.setHours(0, 0, 0, 0);
    return blockDate >= today;
  }
}

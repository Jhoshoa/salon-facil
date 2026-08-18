export class CalendarBlockEntity {
  id!: string;
  venueId!: string;
  date!: Date;
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

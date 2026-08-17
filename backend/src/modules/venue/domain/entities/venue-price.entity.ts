export enum PriceType {
  BASE = 'BASE',
  WEEKEND = 'WEEKEND',
  HOLIDAY = 'HOLIDAY',
  CUSTOM_DATE = 'CUSTOM_DATE',
  SEASON_HIGH = 'SEASON_HIGH',
  EARLY_BIRD = 'EARLY_BIRD',
}

export class VenuePriceEntity {
  id!: string;
  venueId!: string;
  priceType!: PriceType;
  dayOfWeek: number | null = null;
  specificDate: Date | null = null;
  startDate: Date | null = null;
  endDate: Date | null = null;
  price!: number;
  currency: string = 'BOB';
  discountPercent: number | null = null;
  discountLabel: string | null = null;
  isActive: boolean = true;
  createdAt!: Date;

  constructor(partial: Partial<VenuePriceEntity>) {
    Object.assign(this, partial);
  }

  isApplicable(date: Date): boolean {
    if (!this.isActive) return false;

    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);

    if (this.specificDate) {
      const specific = new Date(this.specificDate);
      specific.setHours(0, 0, 0, 0);
      return checkDate.getTime() === specific.getTime();
    }

    if (this.startDate && this.endDate) {
      const start = new Date(this.startDate);
      const end = new Date(this.endDate);
      start.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);
      return checkDate >= start && checkDate <= end;
    }

    if (this.dayOfWeek !== null) {
      return checkDate.getDay() === this.dayOfWeek;
    }

    return true;
  }
}

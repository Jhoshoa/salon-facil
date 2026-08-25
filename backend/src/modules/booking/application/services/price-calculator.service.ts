import { Injectable } from '@nestjs/common';
import { PriceUnit } from '@prisma/client';
import { VenuePriceEntity, PriceType } from '../../../venue/domain/entities/venue-price.entity';

export interface PriceCalculationResult {
  basePrice: number;
  appliedPrice: number;
  totalPrice: number;
  depositAmount: number;
  priceBreakdown: {
    matchedPriceType: PriceType;
    matchedPriceId: string | null;
    discountApplied: number | null;
    discountLabel: string | null;
  };
}

export interface DailyPriceBreakdown {
  date: string;
  matchedPriceType: PriceType;
  unit: PriceUnit;
  appliedPrice: number;
}

export interface RangePriceCalculationResult {
  basePrice: number;
  appliedPrice: number;
  totalPrice: number;
  depositAmount: number;
  days: DailyPriceBreakdown[];
}

export interface RangeDayInput {
  date: Date;
  /** Required only for days whose effective unit resolves to HOUR. */
  hours?: number;
}

@Injectable()
export class PriceCalculatorService {
  calculate(prices: VenuePriceEntity[], eventDate: Date): PriceCalculationResult {
    const basePrice = this.findBasePrice(prices);
    const matched = this.findApplicablePrice(prices, eventDate);

    let appliedPrice = basePrice;
    let matchedPriceType: PriceType = PriceType.BASE;
    let matchedPriceId: string | null = null;
    let discountApplied: number | null = null;
    let discountLabel: string | null = null;

    if (matched && matched.priceType !== PriceType.BASE) {
      appliedPrice = matched.price;
      matchedPriceType = matched.priceType;
      matchedPriceId = matched.id;

      if (matched.discountPercent) {
        discountApplied = matched.discountPercent;
        discountLabel = matched.discountLabel;
      }
    }

    const depositAmount = Math.round(appliedPrice * 0.3 * 100) / 100;

    return {
      basePrice,
      appliedPrice,
      totalPrice: appliedPrice,
      depositAmount,
      priceBreakdown: {
        matchedPriceType,
        matchedPriceId,
        discountApplied,
        discountLabel,
      },
    };
  }

  /**
   * Effective unit for a single day: the matched rule's own `unit` if it declares one,
   * otherwise the venue's default. Exposed so callers (BookingService) can validate
   * per-day schedules *before* calling calculateRange.
   */
  resolveUnitForDate(prices: VenuePriceEntity[], date: Date, defaultUnit: PriceUnit): PriceUnit {
    const matched = this.findApplicablePrice(prices, date);
    return matched?.unit ?? defaultUnit;
  }

  /**
   * Resolves a total for a date range.
   * - When the venue's default unit is EVENT, the whole range is treated as a single flat
   *   fee resolved from day one (per-rule unit overrides are ignored in this mode — mixing
   *   a flat event fee with per-day units isn't a supported combination). The full amount is
   *   booked on day one (other days carry 0) so `sum(days[].appliedPrice) === totalPrice`.
   * - Otherwise, each day resolves its own effective unit (`resolveUnitForDate`): DAY days
   *   charge the matched price as-is, HOUR days multiply it by that day's `hours` (required,
   *   the caller must have validated/supplied it beforehand).
   */
  calculateRange(
    prices: VenuePriceEntity[],
    defaultUnit: PriceUnit,
    days: RangeDayInput[],
  ): RangePriceCalculationResult {
    if (days.length === 0) {
      throw new Error('calculateRange requires at least one day');
    }

    const basePrice = this.findBasePrice(prices);

    if (defaultUnit === PriceUnit.EVENT) {
      const single = this.calculate(prices, days[0].date);
      const resultDays: DailyPriceBreakdown[] = days.map((day, index) => ({
        date: this.toDateOnly(day.date),
        matchedPriceType: index === 0 ? single.priceBreakdown.matchedPriceType : PriceType.BASE,
        unit: PriceUnit.EVENT,
        appliedPrice: index === 0 ? single.totalPrice : 0,
      }));

      return {
        basePrice,
        appliedPrice: single.totalPrice,
        totalPrice: single.totalPrice,
        depositAmount: single.depositAmount,
        days: resultDays,
      };
    }

    const resultDays: DailyPriceBreakdown[] = days.map((day) => {
      const unit = this.resolveUnitForDate(prices, day.date, defaultUnit);
      const single = this.calculate(prices, day.date);
      const multiplier = unit === PriceUnit.HOUR ? this.requireHours(day) : 1;

      return {
        date: this.toDateOnly(day.date),
        matchedPriceType: single.priceBreakdown.matchedPriceType,
        unit,
        appliedPrice: this.round(single.totalPrice * multiplier),
      };
    });

    const totalPrice = this.round(resultDays.reduce((sum, day) => sum + day.appliedPrice, 0));
    const depositAmount = this.round(totalPrice * 0.3);

    return {
      basePrice,
      appliedPrice: totalPrice,
      totalPrice,
      depositAmount,
      days: resultDays,
    };
  }

  private requireHours(day: RangeDayInput): number {
    if (day.hours == null) {
      throw new Error(`Falta la cantidad de horas para el dia ${this.toDateOnly(day.date)}`);
    }
    return day.hours;
  }

  private round(value: number): number {
    return Math.round(value * 100) / 100;
  }

  private toDateOnly(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private findBasePrice(prices: VenuePriceEntity[]): number {
    const base = prices.find((p) => p.priceType === PriceType.BASE && p.isActive);
    return base ? base.price : 0;
  }

  private findApplicablePrice(
    prices: VenuePriceEntity[],
    eventDate: Date,
  ): VenuePriceEntity | null {
    const activePrices = prices.filter((p) => p.isActive && p.priceType !== PriceType.BASE);

    const customDatePrice = activePrices.find(
      (p) => p.priceType === PriceType.CUSTOM_DATE && p.isApplicable(eventDate),
    );
    if (customDatePrice) return customDatePrice;

    const holidayPrice = activePrices.find(
      (p) => p.priceType === PriceType.HOLIDAY && p.isApplicable(eventDate),
    );
    if (holidayPrice) return holidayPrice;

    const seasonHighPrice = activePrices.find(
      (p) => p.priceType === PriceType.SEASON_HIGH && p.isApplicable(eventDate),
    );
    if (seasonHighPrice) return seasonHighPrice;

    const weekendPrice = activePrices.find(
      (p) => p.priceType === PriceType.WEEKEND && p.isApplicable(eventDate),
    );
    if (weekendPrice) return weekendPrice;

    return null;
  }
}

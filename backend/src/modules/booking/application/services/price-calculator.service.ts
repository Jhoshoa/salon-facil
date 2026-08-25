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
  appliedPrice: number;
}

export interface RangePriceCalculationResult {
  basePrice: number;
  appliedPrice: number;
  totalPrice: number;
  depositAmount: number;
  days: DailyPriceBreakdown[];
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
   * Resolves a total for a date range, honoring the venue's priceUnit:
   * - EVENT: one flat fee for the whole reservation, resolved from the start date.
   *   The full amount is booked on day one (BookingDate rows for the other days
   *   carry 0) so that summing `days[].appliedPrice` always equals `totalPrice`.
   * - DAY: the applicable price (BASE/WEEKEND/HOLIDAY/etc.) for each day, summed.
   * - HOUR: same per-day resolution, multiplied by hoursPerDay.
   */
  calculateRange(
    prices: VenuePriceEntity[],
    dates: Date[],
    priceUnit: PriceUnit,
    hoursPerDay: number,
  ): RangePriceCalculationResult {
    if (dates.length === 0) {
      throw new Error('calculateRange requires at least one date');
    }

    const basePrice = this.findBasePrice(prices);

    if (priceUnit === PriceUnit.EVENT) {
      const single = this.calculate(prices, dates[0]);
      const days: DailyPriceBreakdown[] = dates.map((date, index) => ({
        date: this.toDateOnly(date),
        matchedPriceType: index === 0 ? single.priceBreakdown.matchedPriceType : PriceType.BASE,
        appliedPrice: index === 0 ? single.totalPrice : 0,
      }));

      return {
        basePrice,
        appliedPrice: single.totalPrice,
        totalPrice: single.totalPrice,
        depositAmount: single.depositAmount,
        days,
      };
    }

    const multiplier = priceUnit === PriceUnit.HOUR ? hoursPerDay : 1;
    const days: DailyPriceBreakdown[] = dates.map((date) => {
      const single = this.calculate(prices, date);
      return {
        date: this.toDateOnly(date),
        matchedPriceType: single.priceBreakdown.matchedPriceType,
        appliedPrice: this.round(single.totalPrice * multiplier),
      };
    });

    const totalPrice = this.round(days.reduce((sum, day) => sum + day.appliedPrice, 0));
    const depositAmount = this.round(totalPrice * 0.3);

    return {
      basePrice,
      appliedPrice: totalPrice,
      totalPrice,
      depositAmount,
      days,
    };
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

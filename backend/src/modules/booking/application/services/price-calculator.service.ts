import { Injectable } from '@nestjs/common';
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

import { Test, TestingModule } from '@nestjs/testing';
import { PaymentPolicy, PriceUnit } from '@prisma/client';
import { PriceCalculatorService } from '../../../src/modules/booking/application/services/price-calculator.service';
import {
  VenuePriceEntity,
  PriceType,
} from '../../../src/modules/venue/domain/entities/venue-price.entity';

const makePrice = (overrides: Partial<VenuePriceEntity> = {}) =>
  new VenuePriceEntity({
    id: 'price-1',
    venueId: 'venue-1',
    priceType: PriceType.BASE,
    price: 5000,
    isActive: true,
    createdAt: new Date(),
    ...overrides,
  });

// Matches the default every venue has today (Venue.paymentPolicy/depositPercentage defaults) --
// used everywhere a test isn't specifically exercising a different policy/percentage.
const DEFAULT_POLICY = PaymentPolicy.DEPOSIT_THEN_REMAINING;
const DEFAULT_DEPOSIT_PCT = 30;

describe('PriceCalculatorService', () => {
  let service: PriceCalculatorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PriceCalculatorService],
    }).compile();

    service = module.get<PriceCalculatorService>(PriceCalculatorService);
  });

  describe('resolveDeposit', () => {
    it('DEPOSIT_THEN_REMAINING: returns the configured percentage of the total', () => {
      expect(service.resolveDeposit(PaymentPolicy.DEPOSIT_THEN_REMAINING, 30, 5000)).toBe(1500);
      expect(service.resolveDeposit(PaymentPolicy.DEPOSIT_THEN_REMAINING, 50, 5000)).toBe(2500);
      expect(service.resolveDeposit(PaymentPolicy.DEPOSIT_THEN_REMAINING, 10, 5000)).toBe(500);
    });

    it('FULL_UPFRONT: always returns the full total, ignoring depositPercentage', () => {
      expect(service.resolveDeposit(PaymentPolicy.FULL_UPFRONT, 30, 5000)).toBe(5000);
      // Even a leftover/irrelevant percentage doesn't change the result -- FULL_UPFRONT means
      // 100% no matter what depositPercentage happens to be set to.
      expect(service.resolveDeposit(PaymentPolicy.FULL_UPFRONT, 90, 5000)).toBe(5000);
    });

    it('rounds to 2 decimals', () => {
      expect(service.resolveDeposit(PaymentPolicy.DEPOSIT_THEN_REMAINING, 30, 3333)).toBe(999.9);
    });
  });

  describe('calculate', () => {
    it('should use base price when no other prices match', () => {
      const prices = [makePrice({ priceType: PriceType.BASE, price: 5000 })];
      const result = service.calculate(
        prices,
        new Date('2026-03-15'),
        DEFAULT_POLICY,
        DEFAULT_DEPOSIT_PCT,
      );

      expect(result.basePrice).toBe(5000);
      expect(result.appliedPrice).toBe(5000);
      expect(result.totalPrice).toBe(5000);
      expect(result.depositAmount).toBe(1500);
      expect(result.priceBreakdown.matchedPriceType).toBe(PriceType.BASE);
    });

    it('should use weekend price for Saturday', () => {
      const prices = [
        makePrice({ priceType: PriceType.BASE, price: 5000 }),
        makePrice({ id: 'price-2', priceType: PriceType.WEEKEND, dayOfWeek: 6, price: 7000 }),
      ];
      const saturday = new Date('2026-03-21');
      const result = service.calculate(prices, saturday, DEFAULT_POLICY, DEFAULT_DEPOSIT_PCT);

      expect(result.appliedPrice).toBe(7000);
      expect(result.priceBreakdown.matchedPriceType).toBe(PriceType.WEEKEND);
    });

    it('should use holiday price when applicable', () => {
      const prices = [
        makePrice({ priceType: PriceType.BASE, price: 5000 }),
        makePrice({
          id: 'price-2',
          priceType: PriceType.HOLIDAY,
          specificDate: new Date('2026-01-01'),
          price: 8000,
        }),
      ];
      const result = service.calculate(
        prices,
        new Date('2026-01-01'),
        DEFAULT_POLICY,
        DEFAULT_DEPOSIT_PCT,
      );

      expect(result.appliedPrice).toBe(8000);
      expect(result.priceBreakdown.matchedPriceType).toBe(PriceType.HOLIDAY);
    });

    it('should use custom date price over holiday price (higher priority)', () => {
      const sameDate = new Date('2026-01-01');
      const prices = [
        makePrice({ priceType: PriceType.BASE, price: 5000 }),
        makePrice({
          id: 'price-2',
          priceType: PriceType.HOLIDAY,
          specificDate: sameDate,
          price: 8000,
        }),
        makePrice({
          id: 'price-3',
          priceType: PriceType.CUSTOM_DATE,
          specificDate: sameDate,
          price: 9000,
        }),
      ];
      const result = service.calculate(prices, sameDate, DEFAULT_POLICY, DEFAULT_DEPOSIT_PCT);

      expect(result.appliedPrice).toBe(9000);
      expect(result.priceBreakdown.matchedPriceType).toBe(PriceType.CUSTOM_DATE);
    });

    it('should use season high price for date in range', () => {
      const prices = [
        makePrice({ priceType: PriceType.BASE, price: 5000 }),
        makePrice({
          id: 'price-2',
          priceType: PriceType.SEASON_HIGH,
          startDate: new Date('2026-12-15'),
          endDate: new Date('2026-12-31'),
          price: 7500,
        }),
      ];
      const result = service.calculate(
        prices,
        new Date('2026-12-25'),
        DEFAULT_POLICY,
        DEFAULT_DEPOSIT_PCT,
      );

      expect(result.appliedPrice).toBe(7500);
      expect(result.priceBreakdown.matchedPriceType).toBe(PriceType.SEASON_HIGH);
    });

    it('should return base price when no prices match', () => {
      const prices = [
        makePrice({ priceType: PriceType.BASE, price: 5000 }),
        makePrice({
          id: 'price-2',
          priceType: PriceType.WEEKEND,
          dayOfWeek: 6,
          price: 7000,
        }),
      ];
      const tuesday = new Date('2026-03-17');
      const result = service.calculate(prices, tuesday, DEFAULT_POLICY, DEFAULT_DEPOSIT_PCT);

      expect(result.appliedPrice).toBe(5000);
      expect(result.priceBreakdown.matchedPriceType).toBe(PriceType.BASE);
    });

    it('should handle empty prices array', () => {
      const result = service.calculate(
        [],
        new Date('2026-03-15'),
        DEFAULT_POLICY,
        DEFAULT_DEPOSIT_PCT,
      );

      expect(result.basePrice).toBe(0);
      expect(result.appliedPrice).toBe(0);
      expect(result.depositAmount).toBe(0);
    });

    it('should skip inactive prices', () => {
      const prices = [
        makePrice({ priceType: PriceType.BASE, price: 5000 }),
        makePrice({
          id: 'price-2',
          priceType: PriceType.WEEKEND,
          dayOfWeek: 6,
          price: 7000,
          isActive: false,
        }),
      ];
      const saturday = new Date('2026-03-21');
      const result = service.calculate(prices, saturday, DEFAULT_POLICY, DEFAULT_DEPOSIT_PCT);

      expect(result.appliedPrice).toBe(5000);
      expect(result.priceBreakdown.matchedPriceType).toBe(PriceType.BASE);
    });

    it('should calculate deposit as 30% of applied price rounded, for the default policy', () => {
      const prices = [makePrice({ priceType: PriceType.BASE, price: 3333 })];
      const result = service.calculate(
        prices,
        new Date('2026-03-15'),
        DEFAULT_POLICY,
        DEFAULT_DEPOSIT_PCT,
      );

      expect(result.depositAmount).toBe(999.9);
    });

    it('honors a custom depositPercentage', () => {
      const prices = [makePrice({ priceType: PriceType.BASE, price: 5000 })];
      const result = service.calculate(
        prices,
        new Date('2026-03-15'),
        PaymentPolicy.DEPOSIT_THEN_REMAINING,
        50,
      );

      expect(result.depositAmount).toBe(2500);
    });

    it('FULL_UPFRONT: depositAmount equals the full applied price', () => {
      const prices = [makePrice({ priceType: PriceType.BASE, price: 5000 })];
      const result = service.calculate(
        prices,
        new Date('2026-03-15'),
        PaymentPolicy.FULL_UPFRONT,
        30,
      );

      expect(result.depositAmount).toBe(5000);
    });
  });

  describe('calculateRange', () => {
    // Friday, Saturday, Sunday — exercises the WEEKEND override landing in the middle of a range.
    const friSatSun = [new Date('2026-09-11'), new Date('2026-09-12'), new Date('2026-09-13')];
    const toDays = (dates: Date[], hours: number) => dates.map((date) => ({ date, hours }));

    it('DAY unit: sums the applicable price per day, honoring weekend overrides', () => {
      const prices = [
        makePrice({ priceType: PriceType.BASE, price: 280 }),
        makePrice({ id: 'price-2', priceType: PriceType.WEEKEND, dayOfWeek: 6, price: 350 }),
      ];

      const result = service.calculateRange(
        prices,
        PriceUnit.DAY,
        toDays(friSatSun, 1),
        DEFAULT_POLICY,
        DEFAULT_DEPOSIT_PCT,
      );

      expect(result.days.map((d) => d.appliedPrice)).toEqual([280, 350, 280]);
      expect(result.totalPrice).toBe(910);
      expect(result.appliedPrice).toBe(910);
      expect(result.depositAmount).toBe(273);
    });

    it("HOUR unit: multiplies each day rate by that day's hours", () => {
      const prices = [
        makePrice({ priceType: PriceType.BASE, price: 280 }),
        makePrice({ id: 'price-2', priceType: PriceType.WEEKEND, dayOfWeek: 6, price: 350 }),
      ];

      const result = service.calculateRange(
        prices,
        PriceUnit.HOUR,
        toDays(friSatSun, 8),
        DEFAULT_POLICY,
        DEFAULT_DEPOSIT_PCT,
      );

      expect(result.days.map((d) => d.appliedPrice)).toEqual([2240, 2800, 2240]);
      expect(result.totalPrice).toBe(7280);
    });

    it('DAY unit: a multi-day booking always costs more than a single day (regression -- this is exactly what EVENT used to get wrong, charging the same total no matter how many days were booked)', () => {
      const prices = [makePrice({ priceType: PriceType.BASE, price: 5000 })];

      const oneDay = service.calculateRange(
        prices,
        PriceUnit.DAY,
        toDays([friSatSun[0]], 8),
        DEFAULT_POLICY,
        DEFAULT_DEPOSIT_PCT,
      );
      const threeDays = service.calculateRange(
        prices,
        PriceUnit.DAY,
        toDays(friSatSun, 8),
        DEFAULT_POLICY,
        DEFAULT_DEPOSIT_PCT,
      );

      expect(oneDay.totalPrice).toBe(5000);
      expect(threeDays.totalPrice).toBe(15000);
      expect(threeDays.totalPrice).toBeGreaterThan(oneDay.totalPrice);
    });

    it('always keeps sum(days.appliedPrice) === totalPrice, regardless of priceUnit', () => {
      const prices = [
        makePrice({ priceType: PriceType.BASE, price: 280 }),
        makePrice({ id: 'price-2', priceType: PriceType.WEEKEND, dayOfWeek: 6, price: 350 }),
      ];

      for (const unit of [PriceUnit.DAY, PriceUnit.HOUR]) {
        const result = service.calculateRange(
          prices,
          unit,
          toDays(friSatSun, 8),
          DEFAULT_POLICY,
          DEFAULT_DEPOSIT_PCT,
        );
        const sum = result.days.reduce((total, day) => total + day.appliedPrice, 0);
        expect(sum).toBe(result.totalPrice);
      }
    });

    it('a single-day range behaves the same as calculate()', () => {
      const prices = [makePrice({ priceType: PriceType.BASE, price: 5000 })];
      const single = service.calculate(
        prices,
        new Date('2026-03-15'),
        DEFAULT_POLICY,
        DEFAULT_DEPOSIT_PCT,
      );

      const result = service.calculateRange(
        prices,
        PriceUnit.DAY,
        toDays([new Date('2026-03-15')], 4),
        DEFAULT_POLICY,
        DEFAULT_DEPOSIT_PCT,
      );

      expect(result.totalPrice).toBe(single.totalPrice);
      expect(result.depositAmount).toBe(single.depositAmount);
    });

    it('throws when given an empty date array', () => {
      expect(() =>
        service.calculateRange([], PriceUnit.DAY, [], DEFAULT_POLICY, DEFAULT_DEPOSIT_PCT),
      ).toThrow();
    });

    it('per-rule unit override wins over the venue default for the days it covers', () => {
      // Venue defaults to HOUR, but Saturday has its own DAY-priced rule (a common
      // "por hora entre semana, por dia el fin de semana" configuration).
      const prices = [
        makePrice({ priceType: PriceType.BASE, price: 280, unit: null }),
        makePrice({
          id: 'price-2',
          priceType: PriceType.WEEKEND,
          dayOfWeek: 6,
          price: 900,
          unit: PriceUnit.DAY,
        }),
      ];

      const result = service.calculateRange(
        prices,
        PriceUnit.HOUR,
        toDays(friSatSun, 8),
        DEFAULT_POLICY,
        DEFAULT_DEPOSIT_PCT,
      );

      expect(result.days.map((d) => d.unit)).toEqual([
        PriceUnit.HOUR,
        PriceUnit.DAY,
        PriceUnit.HOUR,
      ]);
      // Friday/Sunday: 280 * 8h = 2240 (HOUR). Saturday: flat 900 (DAY, ignores hours).
      expect(result.days.map((d) => d.appliedPrice)).toEqual([2240, 900, 2240]);
      expect(result.totalPrice).toBe(5380);
    });

    it('throws a clear error when a HOUR day has no hours provided', () => {
      const prices = [makePrice({ priceType: PriceType.BASE, price: 280 })];
      expect(() =>
        service.calculateRange(
          prices,
          PriceUnit.HOUR,
          [{ date: new Date('2026-09-11') }],
          DEFAULT_POLICY,
          DEFAULT_DEPOSIT_PCT,
        ),
      ).toThrow(/horas/i);
    });

    it('honors FULL_UPFRONT: depositAmount equals the full multi-day total', () => {
      const prices = [makePrice({ priceType: PriceType.BASE, price: 5000 })];

      const result = service.calculateRange(
        prices,
        PriceUnit.DAY,
        toDays(friSatSun, 8),
        PaymentPolicy.FULL_UPFRONT,
        30,
      );

      expect(result.totalPrice).toBe(15000);
      expect(result.depositAmount).toBe(15000);
    });

    it('honors a custom depositPercentage on a multi-day total', () => {
      const prices = [makePrice({ priceType: PriceType.BASE, price: 5000 })];

      const result = service.calculateRange(
        prices,
        PriceUnit.DAY,
        toDays(friSatSun, 8),
        PaymentPolicy.DEPOSIT_THEN_REMAINING,
        50,
      );

      expect(result.totalPrice).toBe(15000);
      expect(result.depositAmount).toBe(7500);
    });
  });
});

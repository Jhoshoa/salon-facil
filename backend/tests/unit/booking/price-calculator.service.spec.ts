import { Test, TestingModule } from '@nestjs/testing';
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

describe('PriceCalculatorService', () => {
  let service: PriceCalculatorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PriceCalculatorService],
    }).compile();

    service = module.get<PriceCalculatorService>(PriceCalculatorService);
  });

  describe('calculate', () => {
    it('should use base price when no other prices match', () => {
      const prices = [makePrice({ priceType: PriceType.BASE, price: 5000 })];
      const result = service.calculate(prices, new Date('2026-03-15'));

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
      const result = service.calculate(prices, saturday);

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
      const result = service.calculate(prices, new Date('2026-01-01'));

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
      const result = service.calculate(prices, sameDate);

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
      const result = service.calculate(prices, new Date('2026-12-25'));

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
      const result = service.calculate(prices, tuesday);

      expect(result.appliedPrice).toBe(5000);
      expect(result.priceBreakdown.matchedPriceType).toBe(PriceType.BASE);
    });

    it('should handle empty prices array', () => {
      const result = service.calculate([], new Date('2026-03-15'));

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
      const result = service.calculate(prices, saturday);

      expect(result.appliedPrice).toBe(5000);
      expect(result.priceBreakdown.matchedPriceType).toBe(PriceType.BASE);
    });

    it('should calculate deposit as 30% of applied price rounded', () => {
      const prices = [makePrice({ priceType: PriceType.BASE, price: 3333 })];
      const result = service.calculate(prices, new Date('2026-03-15'));

      expect(result.depositAmount).toBe(999.9);
    });
  });
});

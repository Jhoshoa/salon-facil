import type { Venue } from '@/types/api';
import {
  applyWeekdayEdit,
  buildInitialPricingMode,
  buildInitialWeekdayRules,
  buildPricingExample,
  describeRulesDroppedByMode,
  hoursForWeekday,
  listHourlyRules,
  weekdayPricingHint,
  type SeasonRuleState,
  type WeekdayRuleState,
} from './venue-pricing';

const dayLabels = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];

const week = (overrides: Partial<Record<number, Partial<WeekdayRuleState>>> = {}) =>
  Array.from({ length: 7 }).map((_, dayOfWeek) => ({
    dayOfWeek,
    enabled: false,
    unit: '' as const,
    price: '',
    ...overrides[dayOfWeek],
  })) as WeekdayRuleState[];

const season = {
  key: 's1',
  name: '',
  startDate: '',
  endDate: '',
  price: '1',
  unit: '',
} as SeasonRuleState;

const venueWith = (prices: unknown[]) => ({ prices }) as unknown as Venue;

describe('buildInitialPricingMode', () => {
  it('elige el modo segun las reglas guardadas', () => {
    expect(buildInitialPricingMode(venueWith([]))).toBe('single');
    expect(
      buildInitialPricingMode(venueWith([{ priceType: 'WEEKEND', dayOfWeek: 6, price: 10 }])),
    ).toBe('weekday');
    expect(
      buildInitialPricingMode(
        venueWith([
          {
            id: 's',
            priceType: 'SEASON_HIGH',
            startDate: '2027-01-01',
            endDate: '2027-01-02',
            price: 10,
          },
        ]),
      ),
    ).toBe('weekday_season');
  });

  it('carga la regla de cada dia en su posicion', () => {
    const rules = buildInitialWeekdayRules(
      venueWith([{ priceType: 'WEEKEND', dayOfWeek: 6, price: 3000, unit: 'DAY' }]),
    );

    expect(rules[6]).toEqual({ dayOfWeek: 6, enabled: true, unit: 'DAY', price: '3000' });
    expect(rules[0].enabled).toBe(false);
  });
});

describe('applyWeekdayEdit', () => {
  it('activa el dia al escribir un precio o elegir unidad, y lo apaga si queda vacio', () => {
    const rule = week()[6];

    const withPrice = applyWeekdayEdit(rule, { price: '350' });
    expect(withPrice.enabled).toBe(true);
    expect(applyWeekdayEdit(rule, { unit: 'DAY' }).enabled).toBe(true);
    expect(applyWeekdayEdit(withPrice, { price: '' }).enabled).toBe(false);
  });
});

describe('describeRulesDroppedByMode', () => {
  const weekdays = week({ 5: { enabled: true }, 6: { enabled: true } });

  it('avisa lo que el modo deja de usar', () => {
    expect(describeRulesDroppedByMode('single', weekdays, [season])).toBe(
      'Al guardar se quitaran 1 temporada y 2 precios por dia.',
    );
    expect(describeRulesDroppedByMode('weekday', weekdays, [season, season])).toBe(
      'Al guardar se quitaran 2 temporadas.',
    );
  });

  it('no avisa si no se pierde nada', () => {
    expect(describeRulesDroppedByMode('weekday_season', weekdays, [season])).toBeNull();
    expect(describeRulesDroppedByMode('single', week(), [])).toBeNull();
  });
});

describe('listHourlyRules', () => {
  const params = {
    mode: 'weekday_season' as const,
    weekdayRules: week({
      6: { enabled: true, price: '10', unit: 'HOUR' },
      5: { enabled: true, price: '10' },
    }),
    seasonRules: [
      { ...season, name: 'Carnaval', unit: 'HOUR' as const },
      { ...season, name: 'Fin de año', unit: 'DAY' as const },
    ],
    specificDateRules: [
      {
        key: 'd1',
        priceType: 'HOLIDAY' as const,
        name: '',
        date: '',
        price: '1',
        unit: 'HOUR' as const,
      },
      {
        key: 'd2',
        priceType: 'HOLIDAY' as const,
        name: 'Sin unidad',
        date: '',
        price: '1',
        unit: '' as const,
      },
    ],
    dayLabels,
  };

  it('lista solo lo que tiene por hora como unidad propia', () => {
    expect(listHourlyRules(params)).toEqual(['Sabado', 'Carnaval', 'Feriado']);
  });

  it('ignora lo que el modo actual no usa, pero no las fechas especiales', () => {
    expect(listHourlyRules({ ...params, mode: 'weekday' })).toEqual(['Sabado', 'Feriado']);
    expect(listHourlyRules({ ...params, mode: 'single' })).toEqual(['Feriado']);
  });
});

describe('buildPricingExample', () => {
  const base = {
    basePrice: 350,
    unit: 'HOUR' as const,
    minimumHours: 3,
    weekdayRules: week(),
    dayLabels,
  };

  it('calcula por horas, respetando el minimo si es mayor que el ejemplo', () => {
    expect(buildPricingExample({ ...base, mode: 'single' })).toMatch(/6 horas cuestan Bs.*2\.100/);
    expect(buildPricingExample({ ...base, mode: 'single', minimumHours: 8 })).toMatch(/8 horas/);
  });

  it('muestra el dia completo cuando se cobra por dia', () => {
    expect(buildPricingExample({ ...base, mode: 'single', unit: 'DAY' })).toMatch(
      /el dia completo cuesta Bs.*350/,
    );
  });

  it('usa un dia especial y hereda la unidad normal si no tiene propia', () => {
    const weekdayRules = week({ 6: { enabled: true, price: '3000', unit: 'DAY' } });
    expect(buildPricingExample({ ...base, mode: 'weekday', weekdayRules })).toMatch(
      /el sabado, el dia completo cuesta Bs.*3\.000\. Otros dias, 6 horas/,
    );

    const inherited = week({ 5: { enabled: true, price: '400' } });
    expect(buildPricingExample({ ...base, mode: 'weekday', weekdayRules: inherited })).toMatch(
      /el viernes, 6 horas cuestan Bs.*2\.400/,
    );
  });

  it('ignora las reglas por dia en el modo de precio unico', () => {
    const weekdayRules = week({ 6: { enabled: true, price: '3000' } });
    expect(buildPricingExample({ ...base, mode: 'single', weekdayRules })).not.toMatch(/sabado/);
  });

  it('no inventa un ejemplo sin precio', () => {
    expect(buildPricingExample({ ...base, mode: 'single', basePrice: 0 })).toBeNull();
  });
});

describe('weekdayPricingHint', () => {
  const defaults = { unit: 'HOUR' as const, price: 100 };
  const opening = [
    { dayOfWeek: 6, opensAt: '08:00', closesAt: '00:00', isClosed: false },
    { dayOfWeek: 0, opensAt: '08:00', closesAt: '22:00', isClosed: true },
  ];

  it('entiende 00:00 como medianoche y un dia cerrado como sin horas', () => {
    expect(hoursForWeekday(opening, 6)).toBe(16);
    expect(hoursForWeekday(opening, 0)).toBeNull();
    expect(hoursForWeekday(opening, 3)).toBeNull();
  });

  it('avisa si el local esta cerrado ese dia', () => {
    expect(weekdayPricingHint(week()[0], defaults, null)).toMatch(/cerrado/);
  });

  it('muestra la equivalencia entre hora y dia', () => {
    const rule = week({ 6: { enabled: true, price: '200' } })[6];
    expect(weekdayPricingHint(rule, defaults, 10)).toMatch(/×\s*10h.*2\.000/);
    expect(weekdayPricingHint({ ...rule, unit: 'DAY' }, defaults, 10)).toMatch(/20.*\/hora/);
  });
});

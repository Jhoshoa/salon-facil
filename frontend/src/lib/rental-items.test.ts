import {
  countBookingDays,
  formatRentalItemBreakdown,
  groupRentalItemsByCategory,
  reorderRentalItemsWithinCategory,
} from './rental-items';

const mobiliario = { id: 'cat-m', name: 'Mobiliario', sortOrder: 1 };
const vajilla = { id: 'cat-v', name: 'Vajilla', sortOrder: 0 };
// Deliberately intercalated, the way an old global order could have left them.
const items = [
  { id: 'silla', category: mobiliario },
  { id: 'plato', category: vajilla },
  { id: 'mesa', category: mobiliario },
  { id: 'copa', category: vajilla },
];

describe('groupRentalItemsByCategory', () => {
  it('agrupa en el orden de las categorias y conserva el orden dentro de cada una', () => {
    expect(
      groupRentalItemsByCategory(items).map((group) => [
        group.category.name,
        group.items.map((item) => item.id),
      ]),
    ).toEqual([
      ['Vajilla', ['plato', 'copa']],
      ['Mobiliario', ['silla', 'mesa']],
    ]);
  });
});

describe('reorderRentalItemsWithinCategory', () => {
  it('devuelve el orden completo, moviendo solo dentro de la categoria', () => {
    expect(reorderRentalItemsWithinCategory(items, 'mesa', 'silla')).toEqual([
      'plato',
      'copa',
      'mesa',
      'silla',
    ]);
  });

  it('no permite mover a otra categoria', () => {
    expect(reorderRentalItemsWithinCategory(items, 'mesa', 'plato')).toBeNull();
  });

  it('no modifica la lista que recibe', () => {
    reorderRentalItemsWithinCategory(items, 'mesa', 'silla');

    expect(items.map((item) => item.id)).toEqual(['silla', 'plato', 'mesa', 'copa']);
  });
});

describe('countBookingDays', () => {
  it('cuenta ambos extremos, tambien al cruzar de mes', () => {
    expect(countBookingDays('2026-10-31', '2026-11-02')).toBe(3);
    expect(countBookingDays('2026-10-31', '2026-10-31')).toBe(1);
  });

  it('cuenta un dia si faltan las fechas o estan invertidas', () => {
    expect(countBookingDays()).toBe(1);
    expect(countBookingDays('2026-11-02', '2026-10-31')).toBe(1);
  });
});

describe('formatRentalItemBreakdown', () => {
  const base = { quantity: 4, unitPrice: 50 };

  it('muestra la multiplicacion solo en reservas de varios dias', () => {
    expect(
      formatRentalItemBreakdown({ ...base, chargeBasis: 'PER_DAY', billedDays: 3 }, true),
    ).toMatch(/^4 × Bs.*50 × 3 dias$/);
    expect(
      formatRentalItemBreakdown({ ...base, chargeBasis: 'PER_DAY', billedDays: 1 }, false),
    ).toMatch(/^4 × Bs.*50$/);
  });

  it('aclara el cobro por evento, y no inventa dias en reservas anteriores', () => {
    expect(
      formatRentalItemBreakdown({ ...base, chargeBasis: 'PER_EVENT', billedDays: 1 }, true),
    ).toMatch(/\(por evento\)$/);
    expect(formatRentalItemBreakdown(base, true)).toMatch(/^4 × Bs.*50$/);
  });
});

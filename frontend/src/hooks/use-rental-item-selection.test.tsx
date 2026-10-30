import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { toast } from 'sonner';
import { getPublicRentalItems } from '@/lib/api/venues.api';
import type { VenueRentalItem } from '@/types/api';
import { rentalItemsQueryKey, useRentalItemSelection } from './use-rental-item-selection';

jest.mock('@/lib/api/venues.api', () => ({
  getPublicRentalItems: jest.fn(),
}));
jest.mock('sonner', () => ({
  toast: { info: jest.fn() },
}));

const mockGetPublicRentalItems = getPublicRentalItems as jest.MockedFunction<
  typeof getPublicRentalItems
>;

const makeItem = (overrides: Partial<VenueRentalItem>): VenueRentalItem => ({
  id: 'item-1',
  venueId: 'venue-1',
  name: 'Mesa',
  category: { id: 'cat-1', name: 'Mobiliario', sortOrder: 0 },
  description: null,
  photoUrl: null,
  pricePerUnit: 12.5,
  isIncluded: false,
  unitLabel: 'unidad',
  stockQty: 10,
  isActive: true,
  sortOrder: 0,
  ...overrides,
});

const setup = async () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const view = renderHook(() => useRentalItemSelection('venue-1'), { wrapper });
  await waitFor(() => expect(mockGetPublicRentalItems).toHaveBeenCalled());
  await waitFor(() =>
    expect(queryClient.getQueryData(rentalItemsQueryKey('venue-1'))).toBeDefined(),
  );
  return { ...view, queryClient };
};

afterEach(() => {
  jest.clearAllMocks();
});

describe('useRentalItemSelection', () => {
  it('calcula subtotal y total, y quita el item al llegar a 0', async () => {
    mockGetPublicRentalItems.mockResolvedValue([
      makeItem({ id: 'item-1' }),
      makeItem({ id: 'item-2', pricePerUnit: 100 }),
    ]);
    const { result } = await setup();

    act(() => {
      result.current.setQuantity('item-1', 3);
      result.current.setQuantity('item-2', 1);
    });
    expect(result.current.lines.map((line) => line.subtotal)).toEqual([37.5, 100]);
    expect(result.current.total).toBe(137.5);

    act(() => result.current.setQuantity('item-2', 0));
    expect(result.current.lines).toHaveLength(1);
    expect(toast.info).not.toHaveBeenCalled();
  });

  it('avisa y corrige la seleccion si el dueño borra el item o baja el stock', async () => {
    mockGetPublicRentalItems.mockResolvedValue([
      makeItem({ id: 'item-1', stockQty: 10 }),
      makeItem({ id: 'item-2' }),
    ]);
    const { result, queryClient } = await setup();
    act(() => {
      result.current.setQuantity('item-1', 8);
      result.current.setQuantity('item-2', 1);
    });

    act(() => {
      queryClient.setQueryData(rentalItemsQueryKey('venue-1'), [
        makeItem({ id: 'item-1', stockQty: 5 }),
      ]);
    });

    await waitFor(() => expect(toast.info).toHaveBeenCalledTimes(1));
    expect(result.current.quantities).toEqual({ 'item-1': 5 });
    expect(result.current.total).toBe(62.5);
  });
});

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { VenueRentalItem } from '@/types/api';
import { VenueRentalItemCatalog } from './venue-rental-item-catalog';
import { getPublicRentalItems } from '@/lib/api/venues.api';

jest.mock('@/lib/api/venues.api', () => ({
  getPublicRentalItems: jest.fn(),
}));

const mockGetPublicRentalItems = getPublicRentalItems as jest.MockedFunction<
  typeof getPublicRentalItems
>;

const makeItem = (overrides: Partial<VenueRentalItem>): VenueRentalItem => ({
  id: 'item-1',
  venueId: 'venue-1',
  name: 'Mesa redonda',
  category: { id: 'cat-mobiliario', name: 'Mobiliario' },
  description: null,
  photoUrl: null,
  pricePerUnit: 50,
  unitLabel: 'unidad',
  stockQty: null,
  isActive: true,
  sortOrder: 0,
  ...overrides,
});

const renderCatalog = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <VenueRentalItemCatalog venueId="venue-1" />
    </QueryClientProvider>,
  );
};

afterEach(() => {
  jest.clearAllMocks();
});

describe('VenueRentalItemCatalog', () => {
  it('no renderiza nada si el local no tiene items', async () => {
    mockGetPublicRentalItems.mockResolvedValue([]);
    const { container } = renderCatalog();

    await waitFor(() => expect(mockGetPublicRentalItems).toHaveBeenCalledWith('venue-1'));
    expect(container).toBeEmptyDOMElement();
  });

  it('muestra los items activos con su precio', async () => {
    mockGetPublicRentalItems.mockResolvedValue([
      makeItem({ id: 'item-1', name: 'Mesa redonda', pricePerUnit: 50, unitLabel: 'unidad' }),
      makeItem({
        id: 'item-2',
        name: 'Mantel blanco',
        category: { id: 'cat-decoracion', name: 'Decoracion' },
        pricePerUnit: 20,
      }),
    ]);
    renderCatalog();

    expect(await screen.findByText('Mesa redonda')).toBeInTheDocument();
    expect(screen.getByText('Mantel blanco')).toBeInTheDocument();
  });

  it('filtra por categoria al hacer click en una pildora', async () => {
    const user = userEvent.setup();
    mockGetPublicRentalItems.mockResolvedValue([
      makeItem({
        id: 'item-1',
        name: 'Mesa redonda',
        category: { id: 'cat-mobiliario', name: 'Mobiliario' },
      }),
      makeItem({
        id: 'item-2',
        name: 'Mantel blanco',
        category: { id: 'cat-decoracion', name: 'Decoracion' },
      }),
      makeItem({
        id: 'item-3',
        name: 'Silla plegable',
        category: { id: 'cat-mobiliario', name: 'Mobiliario' },
      }),
      makeItem({
        id: 'item-4',
        name: 'Centro de mesa',
        category: { id: 'cat-decoracion', name: 'Decoracion' },
      }),
      makeItem({
        id: 'item-5',
        name: 'Vajilla',
        category: { id: 'cat-mobiliario', name: 'Mobiliario' },
      }),
    ]);
    renderCatalog();

    await screen.findByText('Mesa redonda');

    await user.click(screen.getByRole('button', { name: 'Decoracion' }));

    expect(screen.queryByText('Mesa redonda')).not.toBeInTheDocument();
    expect(screen.getByText('Mantel blanco')).toBeInTheDocument();
    expect(screen.getByText('Centro de mesa')).toBeInTheDocument();
  });

  it('filtra por nombre con el buscador', async () => {
    const user = userEvent.setup();
    mockGetPublicRentalItems.mockResolvedValue([
      makeItem({ id: 'item-1', name: 'Mesa redonda' }),
      makeItem({ id: 'item-2', name: 'Mantel blanco' }),
      makeItem({ id: 'item-3', name: 'Silla plegable' }),
      makeItem({ id: 'item-4', name: 'Centro de mesa' }),
      makeItem({ id: 'item-5', name: 'Vajilla' }),
    ]);
    renderCatalog();

    await screen.findByText('Mesa redonda');

    await user.type(screen.getByPlaceholderText('Buscar item...'), 'mesa');

    expect(screen.getByText('Mesa redonda')).toBeInTheDocument();
    expect(screen.getByText('Centro de mesa')).toBeInTheDocument();
    expect(screen.queryByText('Mantel blanco')).not.toBeInTheDocument();
  });
});

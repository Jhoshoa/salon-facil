import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { PricePreviewAccess } from '@/lib/api/bookings.api';
import type { VenueRentalItem } from '@/types/api';
import { VenueRentalItemCatalog } from './venue-rental-item-catalog';
import {
  getOwnerRentalItems,
  getPublicRentalItems,
  getSharedRentalItems,
} from '@/lib/api/venues.api';

jest.mock('@/lib/api/venues.api', () => ({
  getPublicRentalItems: jest.fn(),
  getSharedRentalItems: jest.fn(),
  getOwnerRentalItems: jest.fn(),
}));

const mockGetPublicRentalItems = getPublicRentalItems as jest.MockedFunction<
  typeof getPublicRentalItems
>;

const mockGetSharedRentalItems = getSharedRentalItems as jest.MockedFunction<
  typeof getSharedRentalItems
>;
const mockGetOwnerRentalItems = getOwnerRentalItems as jest.MockedFunction<
  typeof getOwnerRentalItems
>;

const makeItem = (overrides: Partial<VenueRentalItem>): VenueRentalItem => ({
  id: 'item-1',
  venueId: 'venue-1',
  name: 'Mesa redonda',
  category: { id: 'cat-mobiliario', name: 'Mobiliario', sortOrder: 0 },
  description: null,
  photoUrl: null,
  pricePerUnit: 50,
  isIncluded: false,
  chargeBasis: 'PER_DAY',
  unitLabel: 'unidad',
  stockQty: 10,
  isActive: true,
  sortOrder: 0,
  ...overrides,
});

const renderCatalog = (
  quantities: Record<string, number> = {},
  onQuantityChange: (itemId: string, quantity: number) => void = jest.fn(),
  showChargeBasis = false,
  access?: PricePreviewAccess,
) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <VenueRentalItemCatalog
        venueId="venue-1"
        showChargeBasis={showChargeBasis}
        quantities={quantities}
        onQuantityChange={onQuantityChange}
        access={access}
      />
    </QueryClientProvider>,
  );
};

afterEach(() => {
  jest.clearAllMocks();
});

describe('VenueRentalItemCatalog', () => {
  it('muestra el catalogo de un enlace compartido con su token', async () => {
    mockGetSharedRentalItems.mockResolvedValue([makeItem({ name: 'Mesa' })]);
    renderCatalog({}, jest.fn(), false, { mode: 'share', token: 'link-token' });

    expect(await screen.findByText('Mesa')).toBeInTheDocument();
    expect(mockGetSharedRentalItems).toHaveBeenCalledWith('venue-1', 'link-token');
    expect(mockGetPublicRentalItems).not.toHaveBeenCalled();
  });

  it('en la vista previa del dueno o admin oculta los items inactivos', async () => {
    mockGetOwnerRentalItems.mockResolvedValue([
      makeItem({ id: 'item-1', name: 'Mesa' }),
      makeItem({ id: 'item-2', name: 'Silla apagada', isActive: false }),
    ]);
    renderCatalog({}, jest.fn(), false, { mode: 'manage' });

    expect(await screen.findByText('Mesa')).toBeInTheDocument();
    expect(screen.queryByText('Silla apagada')).not.toBeInTheDocument();
    expect(mockGetPublicRentalItems).not.toHaveBeenCalled();
  });

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
        category: { id: 'cat-decoracion', name: 'Decoracion', sortOrder: 1 },
        pricePerUnit: 20,
      }),
    ]);
    renderCatalog();

    expect(await screen.findByText('Mesa redonda')).toBeInTheDocument();
    expect(screen.getByText('Mantel blanco')).toBeInTheDocument();
  });

  it('deja fuera los items incluidos, que se muestran con el resto de lo incluido', async () => {
    mockGetPublicRentalItems.mockResolvedValue([
      makeItem({ id: 'item-1', name: 'Silla tiffany', pricePerUnit: null, isIncluded: true }),
      makeItem({ id: 'item-2', name: 'Mesa redonda' }),
    ]);
    renderCatalog();

    expect(await screen.findByRole('heading', { name: 'Agrega a tu reserva' })).toBeInTheDocument();
    expect(screen.getByText('Mesa redonda')).toBeInTheDocument();
    expect(screen.queryByText('Silla tiffany')).not.toBeInTheDocument();
  });

  it('no se muestra si todos los items son incluidos', async () => {
    mockGetPublicRentalItems.mockResolvedValue([
      makeItem({ name: 'Silla tiffany', pricePerUnit: null, isIncluded: true }),
    ]);
    const { container } = renderCatalog();

    await waitFor(() => expect(mockGetPublicRentalItems).toHaveBeenCalled());
    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });

  it('muestra la foto del item o, si no tiene, solo el icono', async () => {
    mockGetPublicRentalItems.mockResolvedValue([
      makeItem({
        id: 'item-1',
        name: 'Mesa redonda',
        photoUrl: 'https://res.cloudinary.com/demo/image/upload/mesa.jpg',
      }),
      makeItem({ id: 'item-2', name: 'Mantel blanco', photoUrl: null }),
    ]);
    renderCatalog();

    expect(await screen.findByRole('img', { name: 'Mesa redonda' })).toBeInTheDocument();
    expect(screen.getByText('Mantel blanco')).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: 'Mantel blanco' })).not.toBeInTheDocument();
  });

  it('indica si se cobra por dia o por evento en locales de varios dias', async () => {
    mockGetPublicRentalItems.mockResolvedValue([
      makeItem({ id: 'item-1', name: 'Mesa', chargeBasis: 'PER_DAY' }),
      makeItem({ id: 'item-2', name: 'Toldo', chargeBasis: 'PER_EVENT' }),
    ]);
    renderCatalog({}, jest.fn(), true);

    expect(await screen.findByText(/por dia/)).toBeInTheDocument();
    expect(screen.getByText(/por evento/)).toBeInTheDocument();
  });

  it('no menciona el tipo de cobro en locales de un solo dia', async () => {
    mockGetPublicRentalItems.mockResolvedValue([makeItem({ name: 'Mesa' })]);
    renderCatalog();

    await screen.findByText('Mesa');
    expect(screen.queryByText(/por dia/)).not.toBeInTheDocument();
  });

  it('agrega un item cobrado aparte con cantidad 1', async () => {
    const user = userEvent.setup();
    const onQuantityChange = jest.fn();
    mockGetPublicRentalItems.mockResolvedValue([makeItem({ id: 'item-1', name: 'Mesa redonda' })]);
    renderCatalog({}, onQuantityChange);

    await user.click(
      await screen.findByRole('button', { name: 'Agregar Mesa redonda a la cotizacion' }),
    );

    expect(onQuantityChange).toHaveBeenCalledWith('item-1', 1);
  });

  it('marca el item agregado y permite cambiar la cantidad hasta el stock', async () => {
    const user = userEvent.setup();
    const onQuantityChange = jest.fn();
    mockGetPublicRentalItems.mockResolvedValue([
      makeItem({ id: 'item-1', name: 'Mesa redonda', stockQty: 3 }),
    ]);
    renderCatalog({ 'item-1': 3 }, onQuantityChange);

    expect(await screen.findByText('Agregado')).toBeInTheDocument();
    expect(screen.getByLabelText('Cantidad de Mesa redonda')).toHaveValue('3');
    expect(
      screen.getByRole('button', { name: 'Aumentar cantidad de Mesa redonda' }),
    ).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Reducir cantidad de Mesa redonda' }));
    expect(onQuantityChange).toHaveBeenCalledWith('item-1', 2);
  });

  it('limita al stock la cantidad escrita', async () => {
    const user = userEvent.setup();
    const onQuantityChange = jest.fn();
    mockGetPublicRentalItems.mockResolvedValue([
      makeItem({ id: 'item-1', name: 'Mesa redonda', stockQty: 5 }),
    ]);
    renderCatalog({ 'item-1': 1 }, onQuantityChange);

    const input = await screen.findByLabelText('Cantidad de Mesa redonda');
    await user.clear(input);
    await user.type(input, '9');

    expect(onQuantityChange).toHaveBeenLastCalledWith('item-1', 5);
    expect(input).toHaveValue('5');
  });

  it('pide consultar un item anterior que no tiene cantidad, sin dejar agregarlo', async () => {
    mockGetPublicRentalItems.mockResolvedValue([makeItem({ name: 'Toldo', stockQty: null })]);
    renderCatalog();

    expect(await screen.findByText('Consultar disponibilidad')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Agregar/ })).not.toBeInTheDocument();
  });

  it('no ofrece agregar un item sin stock', async () => {
    mockGetPublicRentalItems.mockResolvedValue([makeItem({ name: 'Toldo', stockQty: 0 })]);
    renderCatalog();

    expect(await screen.findByText('Sin stock')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Agregar/ })).not.toBeInTheDocument();
  });

  it('muestra las categorias en el orden que definio el dueño, no alfabetico', async () => {
    mockGetPublicRentalItems.mockResolvedValue([
      makeItem({
        id: 'item-1',
        name: 'Mantel blanco',
        category: { id: 'cat-a', name: 'Aaa', sortOrder: 2 },
      }),
      makeItem({
        id: 'item-2',
        name: 'Mesa redonda',
        category: { id: 'cat-z', name: 'Zzz', sortOrder: 0 },
      }),
      makeItem({
        id: 'item-3',
        name: 'Copa',
        category: { id: 'cat-m', name: 'Mmm', sortOrder: 1 },
      }),
    ]);
    renderCatalog();

    await screen.findByText('Mesa redonda');

    const labels = screen.getAllByRole('button').map((button) => button.textContent);
    expect(labels.filter((label) => ['Aaa', 'Mmm', 'Zzz'].includes(label ?? ''))).toEqual([
      'Zzz',
      'Mmm',
      'Aaa',
    ]);
  });

  it('agrupa por categoria bajo su titulo, y quita el titulo al filtrar', async () => {
    const user = userEvent.setup();
    mockGetPublicRentalItems.mockResolvedValue([
      makeItem({
        id: 'item-1',
        name: 'Silla',
        category: { id: 'cat-m', name: 'Mobiliario', sortOrder: 1 },
      }),
      makeItem({
        id: 'item-2',
        name: 'Plato',
        category: { id: 'cat-v', name: 'Vajilla', sortOrder: 0 },
      }),
    ]);
    renderCatalog();

    await screen.findByText('Silla');
    expect(
      screen.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent),
    ).toEqual(['Vajilla', 'Mobiliario']);

    await user.click(screen.getByRole('button', { name: 'Vajilla' }));

    expect(screen.queryByRole('heading', { level: 3 })).not.toBeInTheDocument();
    expect(screen.getByText('Plato')).toBeInTheDocument();
    expect(screen.queryByText('Silla')).not.toBeInTheDocument();
  });

  it('no muestra titulos si el local tiene una sola categoria', async () => {
    mockGetPublicRentalItems.mockResolvedValue([makeItem({ name: 'Silla' })]);
    renderCatalog();

    await screen.findByText('Silla');
    expect(screen.queryByRole('heading', { level: 3 })).not.toBeInTheDocument();
  });

  it('filtra por categoria al hacer click en una pildora', async () => {
    const user = userEvent.setup();
    mockGetPublicRentalItems.mockResolvedValue([
      makeItem({
        id: 'item-1',
        name: 'Mesa redonda',
        category: { id: 'cat-mobiliario', name: 'Mobiliario', sortOrder: 0 },
      }),
      makeItem({
        id: 'item-2',
        name: 'Mantel blanco',
        category: { id: 'cat-decoracion', name: 'Decoracion', sortOrder: 1 },
      }),
      makeItem({
        id: 'item-3',
        name: 'Silla plegable',
        category: { id: 'cat-mobiliario', name: 'Mobiliario', sortOrder: 0 },
      }),
      makeItem({
        id: 'item-4',
        name: 'Centro de mesa',
        category: { id: 'cat-decoracion', name: 'Decoracion', sortOrder: 1 },
      }),
      makeItem({
        id: 'item-5',
        name: 'Vajilla',
        category: { id: 'cat-mobiliario', name: 'Mobiliario', sortOrder: 0 },
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

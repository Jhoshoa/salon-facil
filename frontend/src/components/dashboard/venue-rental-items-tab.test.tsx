import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Venue, VenueRentalItem } from '@/types/api';
import { VenueRentalItemsTab } from './venue-rental-items-tab';
import {
  createRentalItem,
  deleteRentalItem,
  getOwnerRentalItems,
  reorderRentalItems,
  updateRentalItem,
} from '@/lib/api/venues.api';

jest.mock('@/lib/api/venues.api', () => ({
  getOwnerRentalItems: jest.fn(),
  createRentalItem: jest.fn(),
  updateRentalItem: jest.fn(),
  deleteRentalItem: jest.fn(),
  reorderRentalItems: jest.fn(),
}));

const mockGetOwnerRentalItems = getOwnerRentalItems as jest.MockedFunction<
  typeof getOwnerRentalItems
>;
const mockCreateRentalItem = createRentalItem as jest.MockedFunction<typeof createRentalItem>;
const mockUpdateRentalItem = updateRentalItem as jest.MockedFunction<typeof updateRentalItem>;
const mockDeleteRentalItem = deleteRentalItem as jest.MockedFunction<typeof deleteRentalItem>;
const mockReorderRentalItems = reorderRentalItems as jest.MockedFunction<typeof reorderRentalItems>;

const venue = { id: 'venue-1', name: 'Salon de prueba' } as unknown as Venue;

const makeItem = (overrides: Partial<VenueRentalItem>): VenueRentalItem => ({
  id: 'item-1',
  venueId: 'venue-1',
  name: 'Mesa redonda',
  category: 'Mobiliario',
  description: null,
  photoUrl: null,
  pricePerUnit: 50,
  unitLabel: 'unidad',
  stockQty: null,
  isActive: true,
  sortOrder: 0,
  ...overrides,
});

const renderTab = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <VenueRentalItemsTab venue={venue} />
    </QueryClientProvider>,
  );
};

afterEach(() => {
  jest.clearAllMocks();
});

describe('VenueRentalItemsTab', () => {
  it('muestra un estado vacio cuando el local no tiene items', async () => {
    mockGetOwnerRentalItems.mockResolvedValue([]);
    renderTab();

    expect(await screen.findByText('Sin items todavia')).toBeInTheDocument();
  });

  it('crea un item nuevo con los datos del formulario', async () => {
    const user = userEvent.setup();
    mockGetOwnerRentalItems.mockResolvedValue([]);
    mockCreateRentalItem.mockResolvedValue(makeItem({}));
    renderTab();

    await screen.findByText('Sin items todavia');

    await user.click(screen.getByRole('button', { name: /agregar item/i }));

    await user.type(screen.getByLabelText('Nombre'), 'Mesa redonda');
    await user.type(screen.getByLabelText('Categoria'), 'Mobiliario');
    await user.type(screen.getByLabelText('Precio'), '50');

    await user.click(screen.getByRole('button', { name: 'Crear' }));

    await waitFor(() =>
      expect(mockCreateRentalItem).toHaveBeenCalledWith(
        'venue-1',
        expect.objectContaining({
          name: 'Mesa redonda',
          category: 'Mobiliario',
          pricePerUnit: 50,
        }),
        undefined,
      ),
    );
  });

  it('no crea el item si falta el nombre', async () => {
    const user = userEvent.setup();
    mockGetOwnerRentalItems.mockResolvedValue([]);
    renderTab();

    await screen.findByText('Sin items todavia');
    await user.click(screen.getByRole('button', { name: /agregar item/i }));
    await user.click(screen.getByRole('button', { name: 'Crear' }));

    expect(mockCreateRentalItem).not.toHaveBeenCalled();
  });

  it('edita un item existente', async () => {
    const user = userEvent.setup();
    const item = makeItem({ id: 'item-1', name: 'Mesa redonda' });
    mockGetOwnerRentalItems.mockResolvedValue([item]);
    mockUpdateRentalItem.mockResolvedValue(item);
    renderTab();

    await screen.findByText('Mesa redonda');
    await user.click(screen.getByRole('button', { name: /editar/i }));

    const nameInput = screen.getByLabelText('Nombre');
    await user.clear(nameInput);
    await user.type(nameInput, 'Mesa rectangular');

    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() =>
      expect(mockUpdateRentalItem).toHaveBeenCalledWith(
        'venue-1',
        'item-1',
        expect.objectContaining({ name: 'Mesa rectangular' }),
        undefined,
      ),
    );
  });

  it('borra un item tras confirmar', async () => {
    const user = userEvent.setup();
    const item = makeItem({ id: 'item-1', name: 'Mesa redonda' });
    mockGetOwnerRentalItems.mockResolvedValue([item]);
    mockDeleteRentalItem.mockResolvedValue(undefined);
    renderTab();

    await screen.findByText('Mesa redonda');
    await user.click(screen.getByRole('button', { name: /eliminar item/i }));

    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Eliminar' }));

    await waitFor(() => expect(mockDeleteRentalItem).toHaveBeenCalledWith('venue-1', 'item-1'));
  });

  it('filtra por categoria y por nombre', async () => {
    const user = userEvent.setup();
    mockGetOwnerRentalItems.mockResolvedValue([
      makeItem({ id: 'item-1', name: 'Mesa redonda', category: 'Mobiliario' }),
      makeItem({ id: 'item-2', name: 'Mantel blanco', category: 'Decoracion' }),
    ]);
    renderTab();

    await screen.findByText('Mesa redonda');

    const categorySelect = screen.getByDisplayValue('Todas las categorias');
    await user.selectOptions(categorySelect, 'Decoracion');

    expect(screen.queryByText('Mesa redonda')).not.toBeInTheDocument();
    expect(screen.getByText('Mantel blanco')).toBeInTheDocument();

    await user.selectOptions(categorySelect, 'Todas las categorias');
    await user.type(screen.getByPlaceholderText('Buscar por nombre...'), 'mesa');

    expect(screen.getByText('Mesa redonda')).toBeInTheDocument();
    expect(screen.queryByText('Mantel blanco')).not.toBeInTheDocument();
  });

  it('reordena items con las flechas', async () => {
    const user = userEvent.setup();
    mockGetOwnerRentalItems.mockResolvedValue([
      makeItem({ id: 'item-1', name: 'Mesa redonda', sortOrder: 0 }),
      makeItem({ id: 'item-2', name: 'Mantel blanco', sortOrder: 1 }),
    ]);
    mockReorderRentalItems.mockResolvedValue([]);
    renderTab();

    await screen.findByText('Mesa redonda');

    const moveRightButtons = screen
      .getAllByRole('button')
      .filter((button) => button.querySelector('svg.lucide-arrow-right'));
    await user.click(moveRightButtons[0]);

    await waitFor(() =>
      expect(mockReorderRentalItems).toHaveBeenCalledWith('venue-1', ['item-2', 'item-1']),
    );
  });
});

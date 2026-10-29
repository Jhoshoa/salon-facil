import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Venue, VenueRentalItemCategory } from '@/types/api';
import { VenueRentalItemCategoriesManager } from './venue-rental-item-categories-manager';
import {
  createRentalItemCategory,
  deleteRentalItemCategory,
  getRentalItemCategories,
  reorderRentalItemCategories,
  updateRentalItemCategory,
} from '@/lib/api/venues.api';

jest.mock('@/lib/api/venues.api', () => ({
  getRentalItemCategories: jest.fn(),
  createRentalItemCategory: jest.fn(),
  updateRentalItemCategory: jest.fn(),
  deleteRentalItemCategory: jest.fn(),
  reorderRentalItemCategories: jest.fn(),
}));

const mockGetRentalItemCategories = getRentalItemCategories as jest.MockedFunction<
  typeof getRentalItemCategories
>;
const mockCreateRentalItemCategory = createRentalItemCategory as jest.MockedFunction<
  typeof createRentalItemCategory
>;
const mockUpdateRentalItemCategory = updateRentalItemCategory as jest.MockedFunction<
  typeof updateRentalItemCategory
>;
const mockDeleteRentalItemCategory = deleteRentalItemCategory as jest.MockedFunction<
  typeof deleteRentalItemCategory
>;
const mockReorderRentalItemCategories = reorderRentalItemCategories as jest.MockedFunction<
  typeof reorderRentalItemCategories
>;

const venue = { id: 'venue-1', name: 'Salon de prueba' } as unknown as Venue;

const makeCategory = (overrides: Partial<VenueRentalItemCategory>): VenueRentalItemCategory => ({
  id: 'cat-1',
  venueId: 'venue-1',
  name: 'Mobiliario',
  sortOrder: 0,
  itemCount: 0,
  ...overrides,
});

const renderManager = (open = true) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const onOpenChange = jest.fn();
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <VenueRentalItemCategoriesManager venue={venue} open={open} onOpenChange={onOpenChange} />
    </QueryClientProvider>,
  );
  return { ...utils, onOpenChange };
};

afterEach(() => {
  jest.clearAllMocks();
});

describe('VenueRentalItemCategoriesManager', () => {
  it('lista las categorias con su cantidad de items', async () => {
    mockGetRentalItemCategories.mockResolvedValue([
      makeCategory({ id: 'cat-1', name: 'Mobiliario', itemCount: 3 }),
      makeCategory({ id: 'cat-2', name: 'Decoracion', itemCount: 0 }),
    ]);
    renderManager();

    expect(await screen.findByText('Mobiliario')).toBeInTheDocument();
    expect(screen.getByText('3 items')).toBeInTheDocument();
    expect(screen.getByText('Decoracion')).toBeInTheDocument();
    expect(screen.getByText('0 items')).toBeInTheDocument();
  });

  it('muestra un mensaje cuando el local no tiene categorias', async () => {
    mockGetRentalItemCategories.mockResolvedValue([]);
    renderManager();

    expect(await screen.findByText('Todavia no tienes categorias.')).toBeInTheDocument();
  });

  it('crea una categoria escribiendo el nombre', async () => {
    const user = userEvent.setup();
    mockGetRentalItemCategories.mockResolvedValue([]);
    mockCreateRentalItemCategory.mockResolvedValue(makeCategory({ name: 'Vajilla' }));
    renderManager();

    await screen.findByText('Todavia no tienes categorias.');

    await user.type(screen.getByPlaceholderText('Nueva categoria...'), 'Vajilla');
    await user.click(screen.getByRole('button', { name: 'Crear' }));

    await waitFor(() =>
      expect(mockCreateRentalItemCategory).toHaveBeenCalledWith('venue-1', { name: 'Vajilla' }),
    );
  });

  it('crea una categoria con un click en una sugerencia', async () => {
    const user = userEvent.setup();
    mockGetRentalItemCategories.mockResolvedValue([]);
    mockCreateRentalItemCategory.mockResolvedValue(makeCategory({ name: 'Mobiliario' }));
    renderManager();

    await screen.findByText('Todavia no tienes categorias.');

    await user.click(screen.getByRole('button', { name: '+ Mobiliario' }));

    await waitFor(() =>
      expect(mockCreateRentalItemCategory).toHaveBeenCalledWith('venue-1', {
        name: 'Mobiliario',
      }),
    );
  });

  it('no sugiere una categoria que el local ya tiene', async () => {
    mockGetRentalItemCategories.mockResolvedValue([makeCategory({ name: 'Mobiliario' })]);
    renderManager();

    await screen.findByText('Mobiliario');

    expect(screen.queryByRole('button', { name: '+ Mobiliario' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '+ Decoracion' })).toBeInTheDocument();
  });

  it('renombra una categoria', async () => {
    const user = userEvent.setup();
    mockGetRentalItemCategories.mockResolvedValue([makeCategory({ name: 'Mobiliario' })]);
    mockUpdateRentalItemCategory.mockResolvedValue(makeCategory({ name: 'Muebles' }));
    renderManager();

    await screen.findByText('Mobiliario');
    await user.click(screen.getByRole('button', { name: 'Renombrar categoria' }));

    const input = screen.getByDisplayValue('Mobiliario');
    await user.clear(input);
    await user.type(input, 'Muebles');
    await user.click(screen.getByRole('button', { name: 'Guardar nombre' }));

    await waitFor(() =>
      expect(mockUpdateRentalItemCategory).toHaveBeenCalledWith('venue-1', 'cat-1', {
        name: 'Muebles',
      }),
    );
  });

  it('deshabilita borrar una categoria con items y explica por que', async () => {
    mockGetRentalItemCategories.mockResolvedValue([
      makeCategory({ id: 'cat-1', name: 'Mobiliario', itemCount: 2 }),
    ]);
    renderManager();

    await screen.findByText('Mobiliario');

    const deleteButton = screen.getByRole('button', { name: 'Eliminar categoria' });
    expect(deleteButton).toBeDisabled();
    expect(deleteButton).toHaveAttribute('title', expect.stringContaining('2 items'));
  });

  it('borra una categoria sin items tras confirmar', async () => {
    const user = userEvent.setup();
    mockGetRentalItemCategories.mockResolvedValue([
      makeCategory({ id: 'cat-1', name: 'Mobiliario', itemCount: 0 }),
    ]);
    mockDeleteRentalItemCategory.mockResolvedValue(undefined);
    renderManager();

    await screen.findByText('Mobiliario');

    await user.click(screen.getByRole('button', { name: 'Eliminar categoria' }));

    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Eliminar' }));

    await waitFor(() =>
      expect(mockDeleteRentalItemCategory).toHaveBeenCalledWith('venue-1', 'cat-1'),
    );
  });

  it('reordena categorias con las flechas', async () => {
    const user = userEvent.setup();
    mockGetRentalItemCategories.mockResolvedValue([
      makeCategory({ id: 'cat-1', name: 'Mobiliario', sortOrder: 0 }),
      makeCategory({ id: 'cat-2', name: 'Decoracion', sortOrder: 1 }),
    ]);
    mockReorderRentalItemCategories.mockResolvedValue([]);
    renderManager();

    await screen.findByText('Mobiliario');

    const moveRightButtons = screen
      .getAllByRole('button', { name: 'Mover despues' })
      .filter((button) => !button.hasAttribute('disabled'));
    await user.click(moveRightButtons[0]);

    await waitFor(() =>
      expect(mockReorderRentalItemCategories).toHaveBeenCalledWith('venue-1', ['cat-2', 'cat-1']),
    );
  });
});

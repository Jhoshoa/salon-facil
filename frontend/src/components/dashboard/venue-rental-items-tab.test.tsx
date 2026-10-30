import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Venue, VenueRentalItem, VenueRentalItemCategory } from '@/types/api';
import { VenueRentalItemsTab } from './venue-rental-items-tab';
import {
  createRentalItem,
  createRentalItemCategory,
  deleteRentalItem,
  getOwnerRentalItems,
  getRentalItemCategories,
  reorderRentalItems,
  updateRentalItem,
} from '@/lib/api/venues.api';

jest.mock('@/lib/api/venues.api', () => ({
  getOwnerRentalItems: jest.fn(),
  createRentalItem: jest.fn(),
  updateRentalItem: jest.fn(),
  deleteRentalItem: jest.fn(),
  reorderRentalItems: jest.fn(),
  getRentalItemCategories: jest.fn(),
  createRentalItemCategory: jest.fn(),
  updateRentalItemCategory: jest.fn(),
  deleteRentalItemCategory: jest.fn(),
  reorderRentalItemCategories: jest.fn(),
}));

const mockGetOwnerRentalItems = getOwnerRentalItems as jest.MockedFunction<
  typeof getOwnerRentalItems
>;
const mockCreateRentalItem = createRentalItem as jest.MockedFunction<typeof createRentalItem>;
const mockUpdateRentalItem = updateRentalItem as jest.MockedFunction<typeof updateRentalItem>;
const mockDeleteRentalItem = deleteRentalItem as jest.MockedFunction<typeof deleteRentalItem>;
const mockReorderRentalItems = reorderRentalItems as jest.MockedFunction<typeof reorderRentalItems>;
const mockGetRentalItemCategories = getRentalItemCategories as jest.MockedFunction<
  typeof getRentalItemCategories
>;
const mockCreateRentalItemCategory = createRentalItemCategory as jest.MockedFunction<
  typeof createRentalItemCategory
>;

// jsdom doesn't implement these -- the photo preview effect calls them whenever a file is picked.
global.URL.createObjectURL = jest.fn(() => 'blob:mock-preview-url');
global.URL.revokeObjectURL = jest.fn();

const venue = { id: 'venue-1', name: 'Salon de prueba' } as unknown as Venue;

const makeCategory = (overrides: Partial<VenueRentalItemCategory>): VenueRentalItemCategory => ({
  id: 'cat-mobiliario',
  venueId: 'venue-1',
  name: 'Mobiliario',
  sortOrder: 0,
  itemCount: 0,
  ...overrides,
});

const makeItem = (overrides: Partial<VenueRentalItem>): VenueRentalItem => ({
  id: 'item-1',
  venueId: 'venue-1',
  name: 'Mesa redonda',
  category: { id: 'cat-mobiliario', name: 'Mobiliario', sortOrder: 0 },
  description: null,
  photoUrl: null,
  pricePerUnit: 50,
  isIncluded: false,
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

beforeEach(() => {
  mockGetRentalItemCategories.mockResolvedValue([makeCategory({})]);
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('VenueRentalItemsTab', () => {
  it('muestra un estado vacio cuando el local no tiene items', async () => {
    mockGetOwnerRentalItems.mockResolvedValue([]);
    renderTab();

    expect(await screen.findByText('Sin items todavia')).toBeInTheDocument();
  });

  it('crea un item nuevo eligiendo una categoria existente', async () => {
    const user = userEvent.setup();
    mockGetOwnerRentalItems.mockResolvedValue([]);
    mockCreateRentalItem.mockResolvedValue(makeItem({}));
    renderTab();

    await screen.findByText('Sin items todavia');

    await user.click(screen.getByRole('button', { name: /agregar item/i }));

    await user.type(screen.getByLabelText(/^nombre/i), 'Mesa redonda');
    await user.selectOptions(screen.getByLabelText(/^categoria/i), 'cat-mobiliario');
    await user.type(screen.getByLabelText(/^precio/i), '50');

    await user.click(screen.getByRole('button', { name: 'Crear' }));

    await waitFor(() =>
      expect(mockCreateRentalItem).toHaveBeenCalledWith(
        'venue-1',
        expect.objectContaining({
          name: 'Mesa redonda',
          categoryId: 'cat-mobiliario',
          pricePerUnit: 50,
        }),
        undefined,
      ),
    );
  });

  it('crea una categoria nueva desde el propio formulario y la deja seleccionada', async () => {
    const user = userEvent.setup();
    mockGetOwnerRentalItems.mockResolvedValue([]);
    const newCategory = makeCategory({ id: 'cat-nueva', name: 'Decoracion' });
    mockGetRentalItemCategories
      .mockResolvedValueOnce([makeCategory({})])
      .mockResolvedValue([makeCategory({}), newCategory]);
    mockCreateRentalItemCategory.mockResolvedValue(newCategory);
    mockCreateRentalItem.mockResolvedValue(makeItem({}));
    renderTab();

    await screen.findByText('Sin items todavia');
    await user.click(screen.getByRole('button', { name: /agregar item/i }));

    await user.selectOptions(screen.getByLabelText(/^categoria/i), '__new__');
    await user.type(screen.getByPlaceholderText('Nombre de la categoria'), 'Decoracion');
    await user.click(screen.getByRole('button', { name: 'Crear categoria' }));

    await waitFor(() =>
      expect(mockCreateRentalItemCategory).toHaveBeenCalledWith('venue-1', {
        name: 'Decoracion',
      }),
    );

    // El select vuelve a aparecer con la categoria nueva ya elegida.
    expect(await screen.findByLabelText(/^categoria/i)).toHaveValue('cat-nueva');
  });

  it('crea un item incluido con el local, sin pedir precio ni unidad', async () => {
    const user = userEvent.setup();
    mockGetOwnerRentalItems.mockResolvedValue([]);
    mockCreateRentalItem.mockResolvedValue(makeItem({ pricePerUnit: null, isIncluded: true }));
    renderTab();

    await screen.findByText('Sin items todavia');
    await user.click(screen.getByRole('button', { name: /agregar item/i }));

    await user.type(screen.getByLabelText(/^nombre/i), 'Sillas');
    await user.selectOptions(screen.getByLabelText(/^categoria/i), 'cat-mobiliario');
    await user.click(screen.getByRole('radio', { name: 'Incluido con el local' }));

    expect(screen.queryByLabelText(/^precio/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/^unidad/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/^stock/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Crear' }));

    await waitFor(() =>
      expect(mockCreateRentalItem).toHaveBeenCalledWith(
        'venue-1',
        expect.objectContaining({ name: 'Sillas', isIncluded: true, pricePerUnit: undefined }),
        undefined,
      ),
    );
  });

  it('muestra "Incluido con el local" en la lista y pide precio al pasarlo a cobrado', async () => {
    const user = userEvent.setup();
    const item = makeItem({ id: 'item-1', pricePerUnit: null, isIncluded: true });
    mockGetOwnerRentalItems.mockResolvedValue([item]);
    mockUpdateRentalItem.mockResolvedValue(item);
    renderTab();

    expect(await screen.findByText(/Mobiliario · Incluido con el local/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /editar/i }));

    expect(screen.getByRole('radio', { name: 'Incluido con el local' })).toBeChecked();
    await user.click(screen.getByRole('radio', { name: 'Se cobra aparte' }));
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(screen.getByText(/ingresa un precio valido/i)).toBeInTheDocument();
    expect(mockUpdateRentalItem).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText(/^precio/i), '15');
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() =>
      expect(mockUpdateRentalItem).toHaveBeenCalledWith(
        'venue-1',
        'item-1',
        expect.objectContaining({ isIncluded: false, pricePerUnit: 15 }),
        undefined,
      ),
    );
  });

  it('muestra errores inline y no crea el item si faltan campos obligatorios', async () => {
    const user = userEvent.setup();
    mockGetOwnerRentalItems.mockResolvedValue([]);
    renderTab();

    await screen.findByText('Sin items todavia');
    await user.click(screen.getByRole('button', { name: /agregar item/i }));
    await user.click(screen.getByRole('button', { name: 'Crear' }));

    expect(screen.getByText('El nombre es obligatorio.')).toBeInTheDocument();
    expect(screen.getByText('Elige o crea una categoria.')).toBeInTheDocument();
    expect(screen.getByText(/ingresa un precio valido/i)).toBeInTheDocument();
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

    const nameInput = screen.getByLabelText(/^nombre/i);
    await user.clear(nameInput);
    await user.type(nameInput, 'Mesa rectangular');

    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() =>
      expect(mockUpdateRentalItem).toHaveBeenCalledWith(
        'venue-1',
        'item-1',
        expect.objectContaining({ name: 'Mesa rectangular', categoryId: 'cat-mobiliario' }),
        undefined,
      ),
    );
  });

  it('vaciar descripcion, stock y unidad al editar los limpia en vez de ignorarlos', async () => {
    const user = userEvent.setup();
    const item = makeItem({
      id: 'item-1',
      description: 'Mesa de madera',
      stockQty: 12,
      unitLabel: 'por modulo',
    });
    mockGetOwnerRentalItems.mockResolvedValue([item]);
    mockUpdateRentalItem.mockResolvedValue(item);
    renderTab();

    await screen.findByText('Mesa redonda');
    await user.click(screen.getByRole('button', { name: /editar/i }));

    await user.clear(screen.getByLabelText(/^descripcion/i));
    await user.clear(screen.getByLabelText(/^stock/i));
    await user.clear(screen.getByLabelText(/^unidad/i));
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() =>
      expect(mockUpdateRentalItem).toHaveBeenCalledWith(
        'venue-1',
        'item-1',
        expect.objectContaining({ description: null, stockQty: null, unitLabel: 'unidad' }),
        undefined,
      ),
    );
  });

  it('previsualiza una foto nueva y permite quitarla antes de guardar', async () => {
    const user = userEvent.setup();
    mockGetOwnerRentalItems.mockResolvedValue([]);
    renderTab();

    await screen.findByText('Sin items todavia');
    await user.click(screen.getByRole('button', { name: /agregar item/i }));

    expect(screen.getByRole('button', { name: 'Agregar' })).toBeInTheDocument();

    const fileInput = screen.getByLabelText('Foto (opcional)');
    const file = new File(['fake-bytes'], 'mesa.jpg', { type: 'image/jpeg' });
    await user.upload(fileInput, file);

    expect(await screen.findByRole('button', { name: 'Cambiar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Quitar' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Quitar' }));

    expect(screen.getByRole('button', { name: 'Agregar' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cambiar' })).not.toBeInTheDocument();
  });

  it('permite eliminar la foto de un item sin subir una nueva', async () => {
    const user = userEvent.setup();
    const item = makeItem({ id: 'item-1', name: 'Mesa redonda', photoUrl: 'https://cdn/mesa.jpg' });
    mockGetOwnerRentalItems.mockResolvedValue([item]);
    mockUpdateRentalItem.mockResolvedValue(item);
    renderTab();

    await screen.findByText('Mesa redonda');
    await user.click(screen.getByRole('button', { name: /editar/i }));

    expect(await screen.findByRole('button', { name: 'Eliminar foto' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Eliminar foto' }));

    await user.click(await screen.findByRole('button', { name: 'Eliminar' }));

    expect(screen.getByRole('button', { name: 'Agregar' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() =>
      expect(mockUpdateRentalItem).toHaveBeenCalledWith(
        'venue-1',
        'item-1',
        expect.objectContaining({ removePhoto: true }),
        undefined,
      ),
    );
  });

  it('cambiar la foto de un item envia el archivo nuevo, no removePhoto', async () => {
    const user = userEvent.setup();
    const item = makeItem({ id: 'item-1', name: 'Mesa redonda', photoUrl: 'https://cdn/mesa.jpg' });
    mockGetOwnerRentalItems.mockResolvedValue([item]);
    mockUpdateRentalItem.mockResolvedValue(item);
    renderTab();

    await screen.findByText('Mesa redonda');
    await user.click(screen.getByRole('button', { name: /editar/i }));

    await screen.findByRole('button', { name: 'Cambiar foto' });
    const fileInput = screen.getByLabelText('Foto (opcional)');
    const file = new File(['fake-bytes'], 'nueva.jpg', { type: 'image/jpeg' });
    await user.upload(fileInput, file);

    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() =>
      expect(mockUpdateRentalItem).toHaveBeenCalledWith(
        'venue-1',
        'item-1',
        expect.objectContaining({ removePhoto: undefined }),
        file,
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
    mockGetRentalItemCategories.mockResolvedValue([
      makeCategory({ id: 'cat-mobiliario', name: 'Mobiliario', sortOrder: 0 }),
      makeCategory({ id: 'cat-decoracion', name: 'Decoracion', sortOrder: 1 }),
    ]);
    mockGetOwnerRentalItems.mockResolvedValue([
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
    ]);
    renderTab();

    await screen.findByText('Mesa redonda');

    const categorySelect = screen.getByDisplayValue('Todas las categorias');
    await user.selectOptions(categorySelect, 'cat-decoracion');

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

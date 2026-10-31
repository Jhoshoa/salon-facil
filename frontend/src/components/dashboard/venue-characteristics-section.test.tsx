import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { getAmenitiesCatalog, updateVenueFeatures } from '@/lib/api/venues.api';
import type { AmenityCatalog, Venue } from '@/types/api';
import { VenueCharacteristicsSection } from './venue-characteristics-section';

jest.mock('@/lib/api/venues.api', () => ({
  getAmenitiesCatalog: jest.fn(),
  updateVenueFeatures: jest.fn(),
}));

const catalog = {
  COMFORT: [
    { id: 'wifi', key: 'wifi', name: 'Wi-Fi', category: 'COMFORT' },
    { id: 'ac', key: 'ac', name: 'Aire acondicionado', category: 'COMFORT' },
  ],
  PARKING: [{ id: 'parking', key: 'parking', name: 'Parqueo privado', category: 'PARKING' }],
} as unknown as AmenityCatalog;

const venue = {
  id: 'venue-1',
  amenities: [{ id: 'va1', amenity: { id: 'wifi', name: 'Wi-Fi', category: 'COMFORT' } }],
  customFeatures: [{ id: 'c1', name: 'Vista al Illimani', category: 'COMFORT' }],
} as unknown as Venue;

const renderSection = (testVenue: Venue = venue) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <VenueCharacteristicsSection venue={testVenue} />
    </QueryClientProvider>,
  );
};

const openDialog = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole('button', { name: 'Editar' }));
  await screen.findByRole('button', { name: 'Aire acondicionado' });
};

const addFeature = async (user: ReturnType<typeof userEvent.setup>, name: string) => {
  await user.type(screen.getByLabelText(/que no esta en la lista/), name);
  await user.click(screen.getByRole('button', { name: 'Agregar' }));
};

describe('VenueCharacteristicsSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getAmenitiesCatalog as jest.Mock).mockResolvedValue(catalog);
    (updateVenueFeatures as jest.Mock).mockResolvedValue(venue);
  });

  it('muestra un resumen de lo marcado y no pide la lista hasta abrir el modal', () => {
    renderSection();

    expect(screen.getByText('Confort')).toBeInTheDocument();
    expect(screen.getByText('Wi-Fi')).toBeInTheDocument();
    expect(screen.getByText('Vista al Illimani')).toBeInTheDocument();
    expect(getAmenitiesCatalog).not.toHaveBeenCalled();
  });

  it('invita a agregar cuando no hay ninguna', () => {
    renderSection({ id: 'venue-1', amenities: [], customFeatures: [] } as unknown as Venue);

    expect(screen.getByText('Todavia no marcaste ninguna.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Agregar' })).toBeInTheDocument();
  });

  it('guarda lo marcado y lo agregado, con su categoria', async () => {
    const user = userEvent.setup();
    renderSection();
    await openDialog(user);

    await user.click(screen.getByRole('button', { name: 'Parqueo privado' }));
    await user.click(screen.getByRole('button', { name: 'Wi-Fi' }));
    await user.selectOptions(screen.getByLabelText('Categoria de la caracteristica'), 'FACILITY');
    await addFeature(user, '  Pista de baile ');
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() =>
      expect(updateVenueFeatures).toHaveBeenCalledWith('venue-1', {
        amenityIds: ['parking'],
        customFeatures: [
          { name: 'Vista al Illimani', category: 'COMFORT' },
          { name: 'Pista de baile', category: 'FACILITY' },
        ],
      }),
    );
  });

  it('descarta los cambios al cancelar', async () => {
    const user = userEvent.setup();
    renderSection();
    await openDialog(user);

    await user.click(screen.getByRole('button', { name: 'Parqueo privado' }));
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    await openDialog(user);

    expect(screen.getByRole('button', { name: 'Parqueo privado' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(updateVenueFeatures).not.toHaveBeenCalled();
  });

  it('agrega con Enter', async () => {
    const user = userEvent.setup();
    renderSection();
    await openDialog(user);

    await user.type(screen.getByLabelText(/que no esta en la lista/), 'Pista de baile{Enter}');

    expect(screen.getByRole('button', { name: 'Quitar Pista de baile' })).toBeInTheDocument();
  });

  it.each(['aire acondicionado', 'AIRE-ACONDICIONADO', 'Aíre acondicionado'])(
    'marca la opcion de la lista si escriben "%s", en vez de duplicarla',
    async (typed) => {
      const user = userEvent.setup();
      renderSection();
      await openDialog(user);

      await addFeature(user, typed);

      expect(screen.getByRole('button', { name: 'Aire acondicionado' })).toHaveAttribute(
        'aria-pressed',
        'true',
      );
      expect(screen.getByText(/ya esta en la lista/)).toBeInTheDocument();
    },
  );

  it('no desmarca una opcion de la lista que ya estaba marcada', async () => {
    const user = userEvent.setup();
    renderSection();
    await openDialog(user);

    await addFeature(user, 'wifi');

    expect(screen.getByRole('button', { name: 'Wi-Fi' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('rechaza una repetida y una muy corta', async () => {
    const user = userEvent.setup();
    renderSection();
    await openDialog(user);

    await addFeature(user, 'vista  AL illimani');
    expect(screen.getByText('Esa caracteristica ya esta agregada.')).toBeInTheDocument();

    await user.clear(screen.getByLabelText(/que no esta en la lista/));
    await addFeature(user, 'a');
    expect(screen.getByText(/Escribe entre 2 y 60/)).toBeInTheDocument();
  });

  it('no deja pasar del maximo de caracteristicas propias', async () => {
    const user = userEvent.setup();
    renderSection({
      ...venue,
      customFeatures: Array.from({ length: 20 }, (_, index) => ({
        id: `c${index}`,
        name: `Propia ${index}`,
        category: 'COMFORT',
      })),
    } as unknown as Venue);
    await openDialog(user);

    await addFeature(user, 'Una mas');

    expect(screen.getByText('Puedes agregar hasta 20.')).toBeInTheDocument();
  });

  it('quita una caracteristica propia', async () => {
    const user = userEvent.setup();
    renderSection();
    await openDialog(user);

    await user.click(screen.getByRole('button', { name: 'Quitar Vista al Illimani' }));
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() =>
      expect(updateVenueFeatures).toHaveBeenCalledWith(
        'venue-1',
        expect.objectContaining({ customFeatures: [] }),
      ),
    );
  });
});

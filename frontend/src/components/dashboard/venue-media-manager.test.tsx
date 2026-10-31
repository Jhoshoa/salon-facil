import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { reorderVenueMedia } from '@/lib/api/venues.api';
import type { Venue } from '@/types/api';
import { VenueMediaManager } from './venue-media-manager';

jest.mock('@/lib/api/venues.api', () => ({
  addVenueMedia: jest.fn(),
  deleteVenueMedia: jest.fn(),
  reorderVenueMedia: jest.fn(),
}));

const photo = (id: string, sortOrder: number, isCover = false) => ({
  id,
  url: `https://res.cloudinary.com/demo/image/upload/${id}.jpg`,
  alt: id,
  sortOrder,
  isCover,
});

const venue = {
  id: 'venue-1',
  name: 'Salon',
  media: [photo('segunda', 1), photo('primera', 0, true)],
} as unknown as Venue;

const renderManager = (testVenue: Venue = venue) => {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <VenueMediaManager venue={testVenue} />
    </QueryClientProvider>,
  );
};

describe('VenueMediaManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (reorderVenueMedia as jest.Mock).mockResolvedValue([]);
  });

  it('muestra las fotos en orden, marca la portada y cuenta el limite', () => {
    renderManager();

    expect(screen.getAllByRole('img').map((image) => image.getAttribute('alt'))).toEqual([
      'primera',
      'segunda',
    ]);
    expect(screen.getByText('Portada')).toBeInTheDocument();
    expect(screen.getByText(/2\/10 fotos/)).toBeInTheDocument();
  });

  it('invita a subir fotos si no hay ninguna', () => {
    renderManager({ ...venue, media: [] });

    expect(screen.getByText(/Todavia no agregaste fotos/)).toBeInTheDocument();
  });

  it('reordena con botones que indican lo que hacen', async () => {
    const user = userEvent.setup();
    renderManager();

    const [moveFirstBack, moveSecondBack] = screen.getAllByRole('button', { name: 'Mover antes' });
    expect(moveFirstBack).toBeDisabled();
    await user.click(moveSecondBack);

    await waitFor(() =>
      expect(reorderVenueMedia).toHaveBeenCalledWith('venue-1', ['segunda', 'primera'], undefined),
    );
  });

  it('solo ofrece usar como portada en las fotos que no lo son', async () => {
    const user = userEvent.setup();
    renderManager();

    const [setCover, ...others] = screen.getAllByRole('button', { name: 'Usar como portada' });
    expect(others).toHaveLength(0);
    await user.click(setCover);

    await waitFor(() =>
      expect(reorderVenueMedia).toHaveBeenCalledWith('venue-1', ['primera', 'segunda'], 'segunda'),
    );
  });
});

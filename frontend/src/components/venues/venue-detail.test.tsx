import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import type { ApiError, Venue } from '@/types/api';
import { VenueDetail } from './venue-detail';
import {
  getSimilarVenues,
  getVenueById,
  getVenueBySharePreviewToken,
  getVenueBySlug,
} from '@/lib/api/venues.api';

jest.mock('@/lib/api/venues.api', () => ({
  getVenueById: jest.fn(),
  getVenueBySlug: jest.fn(),
  getVenueBySharePreviewToken: jest.fn(),
  getSimilarVenues: jest.fn(),
}));

// Heavy/unrelated child components stubbed out -- this test is about which sections VenueDetail
// itself decides to render for a share-token preview, not about how each of them works.
jest.mock('@/components/booking/availability-calendar', () => ({
  AvailabilityCalendar: () => <div data-testid="availability-calendar" />,
}));
jest.mock('@/components/booking/booking-form', () => ({
  BookingForm: () => <div data-testid="booking-form" />,
}));
jest.mock('@/components/reviews/venue-reviews', () => ({
  VenueReviews: () => <div data-testid="venue-reviews" />,
}));
jest.mock('./mobile-booking-sheet', () => ({
  MobileBookingSheet: () => <div data-testid="mobile-booking-sheet" />,
}));
jest.mock('./photo-lightbox', () => ({
  PhotoLightbox: () => null,
}));
jest.mock('./venue-similar-card', () => ({
  VenueSimilarCard: () => <div data-testid="venue-similar-card" />,
}));
jest.mock('./favorite-button', () => ({
  FavoriteButton: () => <button data-testid="favorite-button">Favorito</button>,
}));
jest.mock('./share-button', () => ({
  ShareButton: () => <button data-testid="share-button">Compartir</button>,
}));
jest.mock('./venue-location-map', () => ({
  VenueLocationMap: () => <div data-testid="venue-location-map" />,
}));

const mockGetVenueById = getVenueById as jest.MockedFunction<typeof getVenueById>;
const mockGetVenueBySlug = getVenueBySlug as jest.MockedFunction<typeof getVenueBySlug>;
const mockGetVenueBySharePreviewToken = getVenueBySharePreviewToken as jest.MockedFunction<
  typeof getVenueBySharePreviewToken
>;
const mockGetSimilarVenues = getSimilarVenues as jest.MockedFunction<typeof getSimilarVenues>;

const venue = {
  id: 'venue-1',
  ownerId: 'owner-1',
  name: 'Salon de prueba',
  description: 'Un salon lindo para probar',
  address: 'Calle Falsa 123',
  district: 'Zona Sur',
  departamento: 'La Paz',
  capacityMin: 50,
  capacityMax: 200,
  minimumHours: 4,
  allowsMultipleDays: false,
  instantBooking: false,
  isVerified: false,
  averageRating: null,
  reviewCount: 0,
  contactPhone: null,
  facebookUrl: null,
  instagramUrl: null,
  tiktokUrl: null,
  latitude: null,
  longitude: null,
  spaceType: null,
  photos: [],
  media: [],
  amenities: [],
  uses: [],
  openingHours: [],
  prices: [],
  owner: {},
} as unknown as Venue;

beforeEach(() => {
  mockGetSimilarVenues.mockResolvedValue([]);
});

beforeAll(() => {
  // useMediaQuery reads window.matchMedia, which jsdom doesn't implement.
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    })),
  });
});

const renderDetail = (props: Partial<React.ComponentProps<typeof VenueDetail>>) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <VenueDetail {...props} />
    </QueryClientProvider>,
  );
};

afterEach(() => {
  jest.clearAllMocks();
});

describe('VenueDetail - modo shareToken (link de "Compartir preview")', () => {
  it('busca el local por el token de share, no por slug ni por id', async () => {
    mockGetVenueBySharePreviewToken.mockResolvedValue(venue);

    renderDetail({ shareToken: 'abc123' });

    await screen.findByText('Salon de prueba');
    expect(mockGetVenueBySharePreviewToken).toHaveBeenCalledWith('abc123');
    expect(mockGetVenueById).not.toHaveBeenCalled();
    expect(mockGetVenueBySlug).not.toHaveBeenCalled();
  });

  it('muestra la ficha completa del local (misma info que la pagina publica)', async () => {
    mockGetVenueBySharePreviewToken.mockResolvedValue(venue);

    renderDetail({ shareToken: 'abc123' });

    expect(await screen.findByText('Salon de prueba')).toBeInTheDocument();
    expect(screen.getByText('Un salon lindo para probar')).toBeInTheDocument();
    expect(screen.getAllByText(/Zona Sur/).length).toBeGreaterThan(0);
  });

  it('no muestra el boton de favoritos ni nada de reserva', async () => {
    mockGetVenueBySharePreviewToken.mockResolvedValue(venue);

    renderDetail({ shareToken: 'abc123' });

    await screen.findByText('Salon de prueba');
    expect(screen.queryByTestId('favorite-button')).not.toBeInTheDocument();
    expect(screen.queryByTestId('availability-calendar')).not.toBeInTheDocument();
    expect(screen.queryByTestId('booking-form')).not.toBeInTheDocument();
    expect(screen.queryByTestId('mobile-booking-sheet')).not.toBeInTheDocument();
    expect(screen.queryByText('Solicitar reserva')).not.toBeInTheDocument();
  });

  it('un token invalido o vencido muestra el mensaje especifico del link, no el generico de "local no disponible"', async () => {
    mockGetVenueBySharePreviewToken.mockRejectedValue({
      statusCode: 404,
      message: 'Not found',
    } as ApiError);

    renderDetail({ shareToken: 'abc123' });

    expect(await screen.findByText('Este enlace ya no es valido')).toBeInTheDocument();
    expect(screen.queryByText('Este local no esta disponible')).not.toBeInTheDocument();
    expect(screen.queryByText('Buscar otros espacios')).not.toBeInTheDocument();
  });
});

describe('VenueDetail - otros modos no cambian de comportamiento', () => {
  it('con venueId (preview del dueno/admin autenticado) el boton de favoritos y la reserva siguen visibles', async () => {
    mockGetVenueById.mockResolvedValue(venue);

    renderDetail({ venueId: 'venue-1' });

    await screen.findByText('Salon de prueba');
    expect(mockGetVenueById).toHaveBeenCalledWith('venue-1');
    expect(screen.getByTestId('favorite-button')).toBeInTheDocument();
    expect(screen.getByTestId('availability-calendar')).toBeInTheDocument();
  });

  it('con slug (pagina publica real) un 404 muestra el mensaje generico, no el de link vencido', async () => {
    mockGetVenueBySlug.mockRejectedValue({ statusCode: 404, message: 'Not found' } as ApiError);

    renderDetail({ slug: 'salon-de-prueba' });

    expect(await screen.findByText('Este local no esta disponible')).toBeInTheDocument();
    expect(screen.queryByText('Este enlace ya no es valido')).not.toBeInTheDocument();
  });
});

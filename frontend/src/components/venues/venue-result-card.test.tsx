import { render, screen } from '@testing-library/react';
import type { Venue } from '@/types/api';
import { VenueResultCard } from './venue-result-card';

jest.mock('./favorite-button', () => ({
  FavoriteButton: () => <button data-testid="favorite-button">Favorito</button>,
}));

const basePriceRow = {
  id: 'price-base',
  venueId: 'venue-1',
  priceType: 'BASE' as const,
  dayOfWeek: null,
  specificDate: null,
  startDate: null,
  endDate: null,
  price: 100,
  currency: 'BOB',
  unit: null,
  discountPercent: null,
  discountLabel: null,
  isActive: true,
};

const venue = {
  id: 'venue-1',
  slug: 'salon-de-prueba',
  name: 'Salon de prueba',
  shortDescription: null,
  description: null,
  district: 'Zona Sur',
  departamento: 'LA_PAZ',
  capacityMin: 50,
  capacityMax: 200,
  minimumHours: 4,
  priceUnit: 'DAY',
  instantBooking: false,
  isVerified: false,
  photos: [],
  media: [],
  amenities: [],
  services: [],
  prices: [basePriceRow],
} as unknown as Venue;

describe('VenueResultCard - que precio muestra la tarjeta', () => {
  it('sin effectivePrice, muestra el precio BASE del local', () => {
    render(<VenueResultCard venue={venue} />);

    expect(screen.getByText(/100/)).toBeInTheDocument();
    expect(screen.queryByText('Consultar')).not.toBeInTheDocument();
  });

  it('con effectivePrice (precio real resuelto para la fecha buscada), lo muestra en vez del BASE', () => {
    render(<VenueResultCard venue={{ ...venue, effectivePrice: 250 }} />);

    expect(screen.getByText(/250/)).toBeInTheDocument();
    expect(screen.queryByText(/\b100\b/)).not.toBeInTheDocument();
  });

  it('sin precio BASE configurado ni effectivePrice, muestra "Consultar"', () => {
    render(<VenueResultCard venue={{ ...venue, prices: [] }} />);

    expect(screen.getByText('Consultar')).toBeInTheDocument();
  });
});

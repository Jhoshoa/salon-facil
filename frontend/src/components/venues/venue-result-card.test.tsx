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

describe('VenueResultCard - fila compacta para celular (oculta por CSS en pantallas grandes)', () => {
  it('tiene un favorito y un enlace "Ver detalles" aparte de los de escritorio, para el layout compacto', () => {
    render(<VenueResultCard venue={venue} startDate="2026-10-30" />);

    // Un FavoriteButton superpuesto en la foto (solo visible en md:+) y otro en la fila de
    // contenido (solo visible en mobile, md:hidden) -- ambos existen en el DOM, la visibilidad
    // la decide el CSS responsive, que jsdom no evalua.
    expect(screen.getAllByTestId('favorite-button')).toHaveLength(2);

    // One is the mobile-only icon-only link (md:hidden), the other the desktop button
    // (hidden md:inline-flex) -- both point to the same place, only one is ever visible at a time.
    const detailLinks = screen.getAllByRole('link', { name: 'Ver detalles' });
    expect(detailLinks).toHaveLength(2);
    detailLinks.forEach((link) =>
      expect(link).toHaveAttribute('href', '/venues/salon-de-prueba?startDate=2026-10-30'),
    );
  });

  it('muestra la capacidad junto al precio para el pie compacto de mobile', () => {
    render(<VenueResultCard venue={venue} />);

    // Aparece dos veces: una en el badge de escritorio (hidden en mobile) y otra en el pie
    // compacto del layout de mobile (md:hidden en escritorio) -- mismo texto, dos lugares.
    expect(screen.getAllByText('50-200 personas')).toHaveLength(2);
  });
});

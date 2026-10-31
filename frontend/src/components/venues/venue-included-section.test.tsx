import { render, screen } from '@testing-library/react';
import type { Venue, VenueRentalItem } from '@/types/api';
import { VenueIncludedSection } from './venue-included-section';

const venue = {
  amenities: [
    { id: 'a1', isIncluded: true, amenity: { name: 'Wi-Fi', category: 'COMFORT' } },
    { id: 'a2', isIncluded: true, amenity: { name: 'Proyector', category: 'AUDIO_VISUAL' } },
  ],
  customFeatures: [{ id: 'c1', name: 'Vista al Illimani', category: 'COMFORT' }],
} as unknown as Pick<Venue, 'amenities' | 'customFeatures'>;

const includedItem = (overrides: Partial<VenueRentalItem>) =>
  ({
    id: 'i1',
    name: 'Manteles',
    category: { id: 'c1', name: 'Mobiliario', sortOrder: 0 },
    photoUrl: null,
    stockQty: 10,
    ...overrides,
  }) as VenueRentalItem;

const groupOf = (text: string) => screen.getByText(text).closest('div')?.parentElement;

describe('VenueIncludedSection', () => {
  it('no se muestra si no hay nada incluido', () => {
    const { container } = render(
      <VenueIncludedSection venue={{ amenities: [], customFeatures: [] }} items={[]} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('muestra cada caracteristica propia en su categoria, junto a las de la lista', () => {
    render(<VenueIncludedSection venue={venue} items={[]} />);

    const comfort = screen.getByText('Confort').parentElement;
    expect(comfort).toHaveTextContent('Wi-Fi');
    expect(comfort).toHaveTextContent('Vista al Illimani');
    expect(comfort).not.toHaveTextContent('Proyector');
    expect(groupOf('Proyector')).toHaveTextContent('Audio y video');
  });

  it('muestra los items incluidos bajo su propia categoria', () => {
    render(<VenueIncludedSection venue={venue} items={[includedItem({})]} />);

    expect(screen.getByRole('heading', { name: 'Incluido con el local' })).toBeInTheDocument();
    expect(screen.getByText('Mobiliario')).toBeInTheDocument();
    expect(screen.getByText('· 10', { exact: false })).toBeInTheDocument();
  });

  it('se muestra aunque solo haya items incluidos', () => {
    render(
      <VenueIncludedSection
        venue={{ amenities: [], customFeatures: [] }}
        items={[includedItem({})]}
      />,
    );

    expect(screen.getByText('Manteles')).toBeInTheDocument();
  });

  it('muestra la foto del item solo si tiene, y no muestra una cantidad vacia o en cero', () => {
    render(
      <VenueIncludedSection
        venue={{ amenities: [], customFeatures: [] }}
        items={[
          includedItem({
            id: 'i1',
            name: 'Con foto',
            photoUrl: 'https://res.cloudinary.com/demo/image/upload/a.jpg',
            stockQty: null,
          }),
          includedItem({ id: 'i2', name: 'Sin foto', stockQty: 0 }),
        ]}
      />,
    );

    expect(screen.getByRole('img', { name: 'Con foto' })).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: 'Sin foto' })).not.toBeInTheDocument();
    expect(screen.queryByText(/·/)).not.toBeInTheDocument();
  });
});

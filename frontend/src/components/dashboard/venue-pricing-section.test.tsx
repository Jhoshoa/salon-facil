import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm } from 'react-hook-form';
import { getSeasonalEventsCatalog } from '@/lib/api/venues.api';
import type { VenueFormValues } from '@/lib/validators/venue.schema';
import {
  buildInitialWeekdayRules,
  type PricingMode,
  type SeasonRuleState,
  type SpecificDateRuleState,
  type WeekdayRuleState,
} from '@/lib/venue-pricing';
import { VenuePricingSection } from './venue-pricing-section';

jest.mock('@/lib/api/venues.api', () => ({
  getSeasonalEventsCatalog: jest.fn(),
}));

const seasonFixture: SeasonRuleState = {
  key: 's1',
  name: 'Fin de año',
  startDate: '2026-12-15',
  endDate: '2027-01-05',
  price: '4500',
  unit: 'DAY',
};

let latest: {
  weekdayRules: WeekdayRuleState[];
  seasonRules: SeasonRuleState[];
  specificDateRules: SpecificDateRuleState[];
};

const Harness = ({
  initialMode = 'single',
  initialSeasons = [],
  policy = 'DEPOSIT_THEN_REMAINING',
}: {
  initialMode?: PricingMode;
  initialSeasons?: SeasonRuleState[];
  policy?: string;
}) => {
  const form = useForm<VenueFormValues>({
    defaultValues: {
      basePrice: 280,
      priceUnit: 'HOUR',
      minimumHours: 3,
      paymentPolicy: policy,
      openingHours: [],
    } as unknown as VenueFormValues,
  });
  const [mode, setMode] = useState<PricingMode>(initialMode);
  const [weekdayRules, setWeekdayRules] = useState(buildInitialWeekdayRules());
  const [seasonRules, setSeasonRules] = useState(initialSeasons);
  const [specificDateRules, setSpecificDateRules] = useState<SpecificDateRuleState[]>([]);
  latest = { weekdayRules, seasonRules, specificDateRules };

  return (
    <VenuePricingSection
      form={form}
      pricingMode={mode}
      onPricingModeChange={setMode}
      weekdayRules={weekdayRules}
      setWeekdayRules={setWeekdayRules}
      seasonRules={seasonRules}
      setSeasonRules={setSeasonRules}
      specificDateRules={specificDateRules}
      setSpecificDateRules={setSpecificDateRules}
    />
  );
};

const renderSection = (props: Parameters<typeof Harness>[0] = {}) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <Harness {...props} />
    </QueryClientProvider>,
  );

describe('VenuePricingSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getSeasonalEventsCatalog as jest.Mock).mockResolvedValue([
      {
        id: 'e1',
        name: 'Carnaval',
        startDate: '2027-02-13T00:00:00.000Z',
        endDate: '2027-02-17T00:00:00.000Z',
      },
    ]);
  });

  it('separa precio, capacidad y reservas', () => {
    renderSection();

    for (const name of ['Como cobras el local', 'Capacidad', 'Reservas y pago']) {
      expect(screen.getByRole('heading', { name })).toBeInTheDocument();
    }
    expect(screen.getByLabelText('Maximo de invitados')).toBeInTheDocument();
  });

  it('en precio unico no muestra dias ni temporadas, pero si fechas especiales y el ejemplo', () => {
    renderSection();

    expect(screen.queryByLabelText('Precio del Sabado')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Temporadas' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Agregar fecha' })).toBeInTheDocument();
    expect(screen.getByText(/6 horas cuestan/)).toBeInTheDocument();
  });

  it('por dia: activa el dia al escribir y actualiza el ejemplo', async () => {
    const user = userEvent.setup();
    renderSection({ initialMode: 'weekday' });

    await user.type(screen.getByLabelText('Precio del Sabado'), '3000');
    await user.selectOptions(screen.getByLabelText('Como se cobra el Sabado'), 'DAY');

    expect(latest.weekdayRules[6]).toMatchObject({ enabled: true, price: '3000', unit: 'DAY' });
    expect(screen.getByText(/el sabado, el dia completo cuesta/)).toBeInTheDocument();
  });

  it('en dias y temporadas edita los dias en un modal y resume el resultado', async () => {
    const user = userEvent.setup();
    renderSection({ initialMode: 'weekday_season' });

    await user.click(screen.getByRole('button', { name: 'Editar Precio por dia' }));
    await user.type(screen.getByLabelText('Precio del Viernes'), '350');
    await user.click(screen.getByRole('button', { name: 'Listo' }));

    expect(screen.getByText(/Viernes Bs.*350 \/ hora/)).toBeInTheDocument();
  });

  it('agrega una temporada validando sus datos', async () => {
    const user = userEvent.setup();
    renderSection({ initialMode: 'weekday_season' });

    await user.click(screen.getByRole('button', { name: 'Agregar temporada' }));
    const dialog = await screen.findByRole('dialog');
    const submit = within(dialog).getByRole('button', { name: 'Agregar temporada' });

    await user.click(submit);
    expect(within(dialog).getByText('Elige las fechas de inicio y fin.')).toBeInTheDocument();

    await user.type(within(dialog).getByLabelText('Inicio'), '2027-01-10');
    await user.type(within(dialog).getByLabelText('Fin'), '2027-01-01');
    await user.click(submit);
    expect(within(dialog).getByText(/debe ser igual o posterior/)).toBeInTheDocument();

    await user.clear(within(dialog).getByLabelText('Fin'));
    await user.type(within(dialog).getByLabelText('Fin'), '2027-01-20');
    await user.click(submit);
    expect(within(dialog).getByText('Ingresa un precio.')).toBeInTheDocument();

    await user.type(within(dialog).getByLabelText('Precio (Bs)'), '500');
    await user.click(submit);

    expect(latest.seasonRules).toEqual([
      expect.objectContaining({ startDate: '2027-01-10', endDate: '2027-01-20', price: '500' }),
    ]);
  });

  it('completa la temporada con una sugerencia', async () => {
    const user = userEvent.setup();
    renderSection({ initialMode: 'weekday_season' });

    await user.click(screen.getByRole('button', { name: 'Agregar temporada' }));
    await user.selectOptions(await screen.findByLabelText(/Usar una sugerencia/), 'e1');

    expect(screen.getByLabelText('Nombre (opcional)')).toHaveValue('Carnaval');
    expect(screen.getByLabelText('Inicio')).toHaveValue('2027-02-13');
    expect(screen.getByLabelText('Fin')).toHaveValue('2027-02-17');
  });

  it('edita y elimina una temporada; cancelar no cambia nada', async () => {
    const user = userEvent.setup();
    renderSection({ initialMode: 'weekday_season', initialSeasons: [seasonFixture] });

    await user.click(screen.getByRole('button', { name: 'Editar Fin de año' }));
    const price = screen.getByLabelText('Precio (Bs)');
    await user.clear(price);
    await user.type(price, '5000');
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(latest.seasonRules[0].price).toBe('4500');

    await user.click(screen.getByRole('button', { name: 'Editar Fin de año' }));
    const priceAgain = screen.getByLabelText('Precio (Bs)');
    await user.clear(priceAgain);
    await user.type(priceAgain, '5000');
    await user.click(screen.getByRole('button', { name: 'Guardar temporada' }));
    expect(latest.seasonRules).toEqual([{ ...seasonFixture, price: '5000' }]);

    await user.click(screen.getByRole('button', { name: 'Eliminar Fin de año' }));
    expect(latest.seasonRules).toEqual([]);
  });

  it('avisa lo que se quitaria al cambiar de modo, sin perderlo si vuelve', async () => {
    const user = userEvent.setup();
    renderSection({ initialMode: 'weekday_season', initialSeasons: [seasonFixture] });

    await user.click(screen.getByRole('radio', { name: /Precio unico/ }));
    expect(screen.getByText(/Al guardar se quitaran 1 temporada/)).toBeInTheDocument();
    expect(latest.seasonRules).toHaveLength(1);

    await user.click(screen.getByRole('radio', { name: /Dias y temporadas/ }));
    expect(screen.queryByText(/Al guardar se quitaran/)).not.toBeInTheDocument();
    expect(screen.getByText('Fin de año')).toBeInTheDocument();
  });

  it('agrega una fecha especial en cualquier modo', async () => {
    const user = userEvent.setup();
    renderSection();

    await user.click(screen.getByRole('button', { name: 'Agregar fecha' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Agregar fecha' }));
    expect(within(dialog).getByText('Elige una fecha.')).toBeInTheDocument();

    await user.type(within(dialog).getByLabelText('Fecha'), '2026-12-31');
    await user.type(within(dialog).getByLabelText('Precio (Bs)'), '5000');
    await user.type(within(dialog).getByLabelText('Nombre (opcional)'), 'Año Nuevo');
    await user.click(within(dialog).getByRole('button', { name: 'Agregar fecha' }));

    expect(latest.specificDateRules).toEqual([
      expect.objectContaining({ date: '2026-12-31', price: '5000', name: 'Año Nuevo' }),
    ]);
    expect(screen.getByRole('button', { name: 'Editar Año Nuevo' })).toBeInTheDocument();
  });

  describe('minimo de horas', () => {
    it('solo se pide si se cobra por hora', async () => {
      const user = userEvent.setup();
      renderSection();
      expect(screen.getByLabelText('Minimo de horas')).toBeInTheDocument();

      await user.selectOptions(screen.getByLabelText('Se cobra'), 'DAY');

      expect(screen.queryByLabelText('Minimo de horas')).not.toBeInTheDocument();
    });

    it('se pide si un dia se cobra por hora aunque lo normal sea por dia, y dice por que', async () => {
      const user = userEvent.setup();
      renderSection({ initialMode: 'weekday' });
      await user.selectOptions(screen.getByLabelText('Se cobra'), 'DAY');
      expect(screen.queryByLabelText('Minimo de horas')).not.toBeInTheDocument();

      await user.type(screen.getByLabelText('Precio del Sabado'), '350');
      expect(screen.queryByLabelText('Minimo de horas')).not.toBeInTheDocument();

      await user.selectOptions(screen.getByLabelText('Como se cobra el Sabado'), 'HOUR');
      expect(screen.getByLabelText('Minimo de horas')).toBeInTheDocument();
      expect(screen.getByText(/Solo para lo que se cobra por hora: Sabado/)).toBeInTheDocument();
    });

    it('no cuenta un dia por hora si el modo actual no usa precios por dia', async () => {
      const user = userEvent.setup();
      renderSection({ initialMode: 'weekday' });
      await user.selectOptions(screen.getByLabelText('Se cobra'), 'DAY');
      await user.type(screen.getByLabelText('Precio del Sabado'), '350');
      await user.selectOptions(screen.getByLabelText('Como se cobra el Sabado'), 'HOUR');

      await user.click(screen.getByRole('radio', { name: /Precio unico/ }));

      expect(screen.queryByLabelText('Minimo de horas')).not.toBeInTheDocument();
    });
  });

  it('pide el porcentaje de anticipo solo si se cobra anticipo', () => {
    const { unmount } = renderSection();
    expect(screen.getByLabelText('Porcentaje de anticipo')).toBeInTheDocument();
    unmount();

    renderSection({ policy: 'FULL_UPFRONT' });
    expect(screen.queryByLabelText('Porcentaje de anticipo')).not.toBeInTheDocument();
  });
});

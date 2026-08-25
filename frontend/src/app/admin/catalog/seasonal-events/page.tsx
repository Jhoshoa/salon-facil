'use client';

import { SeasonalEventCatalogManager } from '@/components/admin/seasonal-event-catalog-manager';
import { Breadcrumbs } from '@/components/shared/breadcrumbs';

const AdminSeasonalEventsPage = () => {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <Breadcrumbs
        items={[
          { label: 'Panel admin', href: '/admin' },
          { label: 'Catalogo' },
          { label: 'Feriados y temporadas' },
        ]}
      />
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Feriados y temporadas</h1>
      </div>
      <SeasonalEventCatalogManager />
    </main>
  );
};

export default AdminSeasonalEventsPage;

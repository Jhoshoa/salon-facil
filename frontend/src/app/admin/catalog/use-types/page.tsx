'use client';

import { createAdminUseType, getAdminUseTypes, updateAdminUseType } from '@/lib/api/venues.api';
import { CatalogManager } from '@/components/admin/catalog-manager';
import { Breadcrumbs } from '@/components/shared/breadcrumbs';

const AdminUseTypesPage = () => {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <Breadcrumbs
        items={[{ label: 'Panel admin', href: '/admin' }, { label: 'Catalogo' }, { label: 'Tipos de evento' }]}
      />
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Tipos de evento</h1>
      </div>
      <CatalogManager
        title="Tipos de evento"
        description="Esta lista alimenta el 'Ideal para' de cada local y el filtro de busqueda."
        queryKey="use-types"
        listFn={getAdminUseTypes}
        createFn={createAdminUseType}
        updateFn={updateAdminUseType}
      />
    </main>
  );
};

export default AdminUseTypesPage;

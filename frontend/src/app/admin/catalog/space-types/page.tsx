'use client';

import { createAdminSpaceType, getAdminSpaceTypes, updateAdminSpaceType } from '@/lib/api/venues.api';
import { CatalogManager } from '@/components/admin/catalog-manager';

const AdminSpaceTypesPage = () => {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Tipos de espacio</h1>
      </div>
      <CatalogManager
        title="Tipos de espacio"
        description="Estos tipos aparecen al crear un local y como filtro de busqueda."
        queryKey="space-types"
        listFn={getAdminSpaceTypes}
        createFn={createAdminSpaceType}
        updateFn={updateAdminSpaceType}
      />
    </main>
  );
};

export default AdminSpaceTypesPage;

'use client';

import { createAdminAmenity, getAdminAmenities, updateAdminAmenity } from '@/lib/api/venues.api';
import { CatalogManager } from '@/components/admin/catalog-manager';
import type { CatalogAmenityInput } from '@/types/api';

const AdminAmenitiesPage = () => {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Comodidades</h1>
      </div>
      <CatalogManager
        title="Comodidades"
        description="Organizadas por categoria: instalaciones, confort, audio y video, catering, etc."
        queryKey="amenities"
        listFn={getAdminAmenities}
        createFn={(data) => createAdminAmenity(data as CatalogAmenityInput)}
        updateFn={updateAdminAmenity}
        withCategory
      />
    </main>
  );
};

export default AdminAmenitiesPage;

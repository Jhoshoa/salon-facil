import { VenueForm } from '@/components/dashboard/venue-form';
import { Breadcrumbs } from '@/components/shared/breadcrumbs';

const NewVenuePage = () => {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <Breadcrumbs items={[{ label: 'Mis locales', href: '/dashboard/venues' }, { label: 'Nuevo local' }]} />
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Nuevo local</h1>
        <p className="text-sm text-muted-foreground">
          Completa la informacion basica. Podras agregar fotos y publicar en el siguiente paso.
        </p>
      </div>
      <VenueForm />
    </main>
  );
};

export default NewVenuePage;

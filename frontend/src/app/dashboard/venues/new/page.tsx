import { VenueForm } from '@/components/dashboard/venue-form';

const NewVenuePage = () => {
  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
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

import { ClientFavorites } from '@/components/venues/client-favorites';
import { Breadcrumbs } from '@/components/shared/breadcrumbs';
import { SiteHeader } from '@/components/shared/site-header';

const FavoritosPage = () => {
  return (
    <main className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <Breadcrumbs items={[{ label: 'Inicio', href: '/' }, { label: 'Mis favoritos' }]} />
        <div className="mb-6">
          <h1 className="text-2xl font-semibold">Mis favoritos</h1>
          <p className="text-sm text-muted-foreground">
            Locales que guardaste para comparar o decidir despues.
          </p>
        </div>
        <ClientFavorites />
      </div>
    </main>
  );
};

export default FavoritosPage;

import { OwnerEarnings } from '@/components/dashboard/owner-earnings';

const DashboardEarningsPage = () => {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Ganancias</h1>
        <p className="text-sm text-muted-foreground">
          Resumen de ingresos confirmados en todos tus locales.
        </p>
      </div>
      <OwnerEarnings />
    </main>
  );
};

export default DashboardEarningsPage;

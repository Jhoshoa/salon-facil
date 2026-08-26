import { AdminAnalyticsDashboard } from '@/components/admin/admin-analytics-dashboard';

const AdminAnalyticsPage = () => {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Analitica</h1>
        <p className="text-sm text-muted-foreground">
          Metricas generales de reservas, ingresos y crecimiento de la plataforma.
        </p>
      </div>
      <AdminAnalyticsDashboard />
    </main>
  );
};

export default AdminAnalyticsPage;

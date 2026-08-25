import { OwnerDashboard } from '@/components/dashboard/owner-dashboard';

const DashboardPage = () => {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Control operativo de salones, reservas y pagos.
        </p>
      </div>
      <OwnerDashboard />
    </main>
  );
};

export default DashboardPage;

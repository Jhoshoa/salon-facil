import { OwnerCalendar } from '@/components/dashboard/owner-calendar';

const DashboardCalendarPage = () => {
  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Calendario</h1>
        <p className="text-sm text-muted-foreground">
          Revisa reservas por mes y bloquea fechas no disponibles.
        </p>
      </div>
      <OwnerCalendar />
    </main>
  );
};

export default DashboardCalendarPage;

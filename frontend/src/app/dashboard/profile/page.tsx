import { OwnerProfileForm } from '@/components/dashboard/owner-profile-form';
import { NotificationPreferences } from '@/components/dashboard/notification-preferences';

const DashboardProfilePage = () => {
  return (
    <main className="mx-auto w-full max-w-2xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <div>
        <h1 className="text-2xl font-semibold">Mi perfil</h1>
        <p className="text-sm text-muted-foreground">
          Estos datos ayudan a tus clientes a confiar y contactarte.
        </p>
      </div>
      <OwnerProfileForm />
      <NotificationPreferences />
    </main>
  );
};

export default DashboardProfilePage;

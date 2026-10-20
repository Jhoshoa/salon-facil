import { AdminReviewModeration } from '@/components/admin/admin-review-moderation';

const AdminReviewsPage = () => {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Reseñas</h1>
        <p className="text-sm text-muted-foreground">
          Moderacion de reseñas de toda la plataforma — elimina las que incumplan las reglas o
          respondelas en nombre del propietario.
        </p>
      </div>
      <AdminReviewModeration />
    </main>
  );
};

export default AdminReviewsPage;

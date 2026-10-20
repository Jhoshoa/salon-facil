import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { AdminUserDetailView } from '@/components/admin/admin-user-detail';

interface AdminUserDetailPageProps {
  params: { id: string };
}

const AdminUserDetailPage = ({ params }: AdminUserDetailPageProps) => {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href="/admin/users"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Usuarios
      </Link>
      <AdminUserDetailView userId={params.id} />
    </main>
  );
};

export default AdminUserDetailPage;

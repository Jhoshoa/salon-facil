import { redirect } from 'next/navigation';

const AdminIndexPage = () => {
  redirect('/admin/venues');
};

export default AdminIndexPage;

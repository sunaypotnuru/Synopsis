import AdminRoute from './AdminRoute';
import AdminLayout from '@/app/pages/admin/AdminLayout';

export default function AdminLayoutWrapper() {
    return (
        <AdminRoute>
            <AdminLayout />
        </AdminRoute>
    );
}

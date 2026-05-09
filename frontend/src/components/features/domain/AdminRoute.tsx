import { Navigate } from 'react-router';
import { useAuth } from '@/app/contexts/AuthContext';
import { ReactNode } from 'react';
import { PageLoadingSkeleton } from '@/components/shared/PageLoadingSkeleton';

const AdminRoute = ({ children }: { children: ReactNode }) => {
    const { user, isLoading } = useAuth();

    if (isLoading) {
        return <PageLoadingSkeleton />;
    }

    if (!user || user.role !== 'admin') {
        return <Navigate to="/login/admin" replace />;
    }

    return <>{children}</>;
};

export default AdminRoute;

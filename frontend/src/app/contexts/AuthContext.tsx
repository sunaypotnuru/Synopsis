import { createContext, useContext, ReactNode, useEffect, useState } from 'react';
import { useAuthStore } from '../../lib/store';

export type Role = 'patient' | 'doctor' | 'admin' | null;

interface User {
    id: string;
    email: string;
    name: string;
    role: Role;
}

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    login: (role?: Role) => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * AuthProvider is now a thin wrapper over useAuthStore (Zustand).
 * This ensures ProtectedRoute, AdminRoute, and NavbarMain all read
 * from the SAME single source of truth — no split-brain issues.
 */
export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const { user: storeUser, loading: storeLoading, loadUser } = useAuthStore();
    const [isInitialized, setIsInitialized] = useState(false);

    // Initialize user session on app startup
    useEffect(() => {
        loadUser().finally(() => {
            setIsInitialized(true);
        });
    }, [loadUser]);

    const isLoading = storeLoading || !isInitialized;

    // Normalize the user shape so AuthContext consumers get a typed User
    const user: User | null = storeUser
        ? {
            id: storeUser.id ?? '',
            email: storeUser.email ?? '',
            name: (
                storeUser.name ||
                storeUser.user_metadata?.full_name ||
                storeUser.email?.split('@')[0] ||
                'User'
            ) as string,
            role: (storeUser.role as Role) ?? null,
        }
        : null;

    const login = async (_role?: Role) => {
        if (import.meta.env.DEV) {
            console.warn('Legacy AuthContext.login() called. Use PatientLoginPage or DoctorLoginPage.');
        }
    };

    const logout = async () => {
        useAuthStore.getState().signOut();
    };

    return (
        <AuthContext.Provider value={{ user, isLoading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

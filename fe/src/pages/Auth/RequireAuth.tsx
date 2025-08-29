// src/Auth/RequireAuth.tsx
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from './authStore.ts';

const RequireAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const accessToken = useAuthStore((state) => state.accessToken);
    const location = useLocation();

    const isAuthPath = [
        '/login',
        '/auth',
    ].some((prefix) => location.pathname.startsWith(prefix));

    if (!accessToken && !isAuthPath) {
        return <Navigate to="/login" replace />;
    }

    return <>{children}</>;
};

export default RequireAuth;

import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './AuthContext';

interface ProtectedRouteProps {
    allowedRoles?: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
    const { token, role, isAuthReady } = useAuth();

    if (!isAuthReady) {
        return (
            <div className="flex min-h-[40vh] items-center justify-center">
                <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-blue-600" />
            </div>
        );
    }

    if (!token) {
        return <Navigate to="/login" replace />;
    }

    if (allowedRoles && role && !allowedRoles.includes(role)) {
        return <Navigate to="/unauthorized" replace />;
    }

    return <Outlet />;
};

export default ProtectedRoute;

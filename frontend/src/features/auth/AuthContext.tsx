/**
 * Authentication Context.
 *
 * Provides app-wide auth state (user, role, token) via React Context.
 * On mount, rehydrates auth state from localStorage (via authService) so
 * the user stays logged in across page refreshes.
 *
 * Roles (PI, Reviewer, SRC_Chair) drive route guards and UI rendering
 * throughout the app — see ProtectedRoute for how `role` is consumed.
 */
import React, { createContext, useContext, useState, useEffect } from 'react';
import * as authService from '../../services/authService';

import type { LoginResponse } from '../../services/authService';

/** Shape of the context value consumed by useAuth(). */
interface AuthContextType {
    user: any;
    /** User role (e.g., 'PI', 'REVIEWER', 'SRC_CHAIR') — drives route access */
    role: string | null;
    /** JWT access token — attached to API requests by the axios interceptor */
    token: string | null;
    login: (email: string, password: string) => Promise<LoginResponse>;
    logout: () => void;
    /** Derived from token presence — true when a valid token exists in state */
    isAuthenticated: boolean;
    isAuthReady: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<any>(() => authService.getUser());
    const [role, setRole] = useState<string | null>(() => authService.getRole());
    const [token, setToken] = useState<string | null>(() => authService.getToken());
    const [isAuthReady, setIsAuthReady] = useState(false);

    // Rehydrate auth state from localStorage on initial mount.
    // This runs once — if the stored token has expired, API calls will fail
    // and the axios interceptor will redirect to login.
    useEffect(() => {
        let isMounted = true;

        const hydrateAuthState = async () => {
            const storedToken = authService.getToken();
            if (!storedToken) {
                if (isMounted) {
                    setIsAuthReady(true);
                }
                return;
            }

            try {
                const validation = await authService.validateToken(storedToken);
                if (!isMounted) return;

                setToken(storedToken);
                setRole(validation.role || null);
                setUser(validation.user);

                if (validation.role) {
                    localStorage.setItem('role', validation.role);
                } else {
                    localStorage.removeItem('role');
                }
                localStorage.setItem('user', JSON.stringify(validation.user));
            } catch (error: any) {
                if (!isMounted) return;
                const status = error?.response?.status;

                // Only clear auth on definite auth failure. Preserve local
                // session on transient network/backend startup errors.
                if (status === 401 || status === 403) {
                    authService.clearAuthData();
                    setToken(null);
                    setRole(null);
                    setUser(null);
                }
            } finally {
                if (isMounted) {
                    setIsAuthReady(true);
                }
            }
        };

        hydrateAuthState();

        return () => {
            isMounted = false;
        };
    }, []);

    /**
     * Authenticate with email/password, then persist tokens to localStorage
     * and update React state so the app re-renders with the new auth context.
     */
    const login = async (email: string, password: string) => {
        const data = await authService.login(email, password);
        // Update React state first so downstream components re-render immediately
        setToken(data.access);
        setRole(data.role || null);
        setUser(data.user);

        // Persist to localStorage so auth survives page refresh
        authService.setAuthData(data);

        return data;
    };

    /** Clear both React state and localStorage. The backend logout call
     *  (token blacklist) is fire-and-forget — even if it fails, the client
     *  is logged out locally. */
    const logout = () => {
        authService.logout().catch(() => {});
        setToken(null);
        setRole(null);
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, role, token, login, logout, isAuthenticated: !!token, isAuthReady }}>
            {children}
        </AuthContext.Provider>
    );
};

/** Hook to access auth context. Must be used within an AuthProvider. */
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within an AuthProvider');
    return context;
};

/**
 * Authentication Service for CTRG Grant System
 *
 * This service handles all authentication-related operations including:
 * - User login with email/password
 * - User logout and token destruction
 * - Token storage and retrieval
 * - User profile management
 * - Password change functionality
 * - User registration (admin only)
 *
 * Authentication Method: Token-based authentication
 * Tokens are stored in localStorage and sent with each API request
 */

import axios from 'axios';

const resolveApiUrl = () => {
    if (typeof window === 'undefined') {
        return 'http://localhost:8000/api/auth';
    }

    const { hostname } = window.location;
    const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';

    if (isLocal) {
        return 'http://localhost:8000/api/auth';
    }

    return '/api/auth';
};

// Base URL for authentication endpoints (use environment variable)
const API_URL = resolveApiUrl();

/**
 * Axios instance configured for authentication requests
 * Separate from main API instance to avoid circular dependencies
 */
const authApi = axios.create({
    baseURL: API_URL,
    headers: { 'Content-Type': 'application/json' },
});

/**
 * User interface matching backend UserSerializer response
 */
export interface User {
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    role: string | null;
    is_active: boolean;
    is_staff?: boolean;
}

/**
 * Login response interface matching backend LoginView response
 */
export interface LoginResponse {
    access: string;  // Authentication token
    role: string | null;    // User's role (PI, Reviewer, SRC_Chair)
    redirect_to?: string;   // Backend-provided role-based redirect route
    user: User;      // Complete user profile
}

export interface TokenValidationResponse {
    valid: boolean;
    role: string | null;
    redirect_to: string;
    user: User;
}

/**
 * User registration data interface
 */
export interface RegisterData {
    username: string;
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    role: 'PI' | 'Reviewer' | 'SRC_Chair';
    department?: string;
    area_of_expertise?: string;
    max_review_load?: number;
    is_active_reviewer?: boolean;
}

export interface ReviewerImportResult {
    created_count: number;
    error_count: number;
    created: Array<{
        row: number;
        id: number;
        email: string;
        username: string;
        temporary_password?: string;
    }>;
    errors: Array<{
        row: number;
        email: string;
        errors: Record<string, unknown>;
    }>;
}

/**
 * Authenticate user with email and password
 *
 * Sends credentials to backend /api/auth/login/ endpoint.
 * On success, returns authentication token, user role, and profile.
 *
 * @param email - User's email address
 * @param password - User's password
 * @returns Promise resolving to LoginResponse with token, role, and user data
 * @throws Error if credentials are invalid or server error occurs
 *
 * @example
 * const response = await login('user@nsu.edu', 'password123');
 * localStorage.setItem('token', response.access);
 * localStorage.setItem('role', response.role);
 */
export const login = async (email: string, password: string): Promise<LoginResponse> => {
    try {
        // Send login request to backend
        const response = await authApi.post<LoginResponse>('/login/', {
            email,
            password
        });
        return response.data;
    } catch (error: any) {
        // Handle authentication errors
        if (error.response?.status === 401) {
            throw new Error('Invalid email or password');
        } else if (error.response?.status === 400) {
            // Extract validation error messages
            const errors = error.response.data;
            const errorMessage =
                errors.non_field_errors?.[0] ||
                errors.email?.[0] ||
                errors.password?.[0] ||
                errors.detail ||
                'Invalid login credentials';
            throw new Error(errorMessage);
        } else {
            throw new Error('Login failed. Please try again.');
        }
    }
};

/**
 * Logout current user
 *
 * Sends logout request to backend to destroy the authentication token,
 * then clears all auth data from localStorage.
 *
 * @param token - Optional auth token to logout (defaults to stored token)
 * @returns Promise that resolves when logout is complete
 *
 * @example
 * await logout();
 * // User is now logged out and redirected to login page
 */
export const logout = async (token?: string): Promise<void> => {
    const authToken = token || getToken();

    if (authToken) {
        try {
            // Send logout request to backend to destroy token
            await authApi.post('/logout/', {}, {
                headers: { Authorization: `Token ${authToken}` }
            });
        } catch (error) {
            // Continue with local logout even if backend call fails
            // In production, send to error monitoring service (Sentry, etc.)
            if (import.meta.env.DEV) {
                console.warn('Logout request failed (continuing with local logout):', error);
            }
        }
    }

    // Clear all authentication data from localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('user');
};

/**
 * Get current authenticated user's profile
 *
 * Fetches fresh user data from backend /api/auth/user/ endpoint.
 * Requires valid authentication token.
 *
 * @param token - Authentication token
 * @returns Promise resolving to User profile
 * @throws Error if not authenticated or token invalid
 *
 * @example
 * const user = await getCurrentUser(token);
 * console.log(user.email, user.role);
 */
export const getCurrentUser = async (token: string): Promise<User> => {
    const response = await authApi.get<User>('/user/', {
        headers: { Authorization: `Token ${token}` }
    });
    return response.data;
};

/**
 * Validate stored auth token and fetch role-aware redirect metadata.
 */
export const validateToken = async (token: string): Promise<TokenValidationResponse> => {
    const response = await authApi.get<TokenValidationResponse>('/validate-token/', {
        headers: { Authorization: `Token ${token}` }
    });
    return response.data;
};

/**
 * Register a new user (Admin only)
 *
 * Creates a new user account with specified role.
 * Only accessible to authenticated admin users (SRC Chair).
 *
 * @param userData - User registration data including role
 * @param token - Admin's authentication token
 * @returns Promise resolving to created User
 * @throws Error if validation fails or user is not admin
 *
 * @example
 * const newUser = await register({
 *   username: 'jane.smith',
 *   email: 'jane.smith@nsu.edu',
 *   password: 'SecurePass123!',
 *   first_name: 'Jane',
 *   last_name: 'Smith',
 *   role: 'Reviewer'
 * }, adminToken);
 */
export const register = async (userData: RegisterData, token: string): Promise<User> => {
    const response = await authApi.post<User>('/register/', userData, {
        headers: { Authorization: `Token ${token}` }
    });
    return response.data;
};

export const importReviewersFromExcel = async (
    file: File,
    token: string
): Promise<ReviewerImportResult> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await authApi.post<ReviewerImportResult>('/import-reviewers/', formData, {
        headers: {
            Authorization: `Token ${token}`,
            'Content-Type': 'multipart/form-data',
        },
    });
    return response.data;
};

/**
 * Change current user's password
 *
 * Updates user password after verifying old password.
 * Requires authentication token.
 *
 * @param oldPassword - Current password for verification
 * @param newPassword - New password (must meet validation requirements)
 * @param token - Authentication token
 * @returns Promise that resolves when password is changed
 * @throws Error if old password is incorrect or new password invalid
 *
 * @example
 * await changePassword('OldPass123!', 'NewSecurePass456!', token);
 * alert('Password changed successfully');
 */
export const changePassword = async (
    oldPassword: string,
    newPassword: string,
    token: string
): Promise<void> => {
    await authApi.post(
        '/change-password/',
        { old_password: oldPassword, new_password: newPassword },
        { headers: { Authorization: `Token ${token}` } }
    );
};

/**
 * Get all users (Admin only)
 *
 * Retrieves list of all users in the system.
 * Only accessible to authenticated admin users.
 *
 * @param token - Admin's authentication token
 * @param filters - Optional filters (role, is_active)
 * @returns Promise resolving to array of Users
 *
 * @example
 * const reviewers = await getAllUsers(adminToken, { role: 'Reviewer' });
 */
export const getAllUsers = async (
    token: string,
    filters?: { role?: string; is_active?: boolean }
): Promise<User[]> => {
    const params = new URLSearchParams();
    if (filters?.role) params.append('role', filters.role);
    if (filters?.is_active !== undefined) params.append('is_active', String(filters.is_active));

    const response = await authApi.get<User[]>('/users/', {
        headers: { Authorization: `Token ${token}` },
        params
    });
    return response.data;
};

/**
 * Get authentication token from localStorage
 *
 * @returns Stored token string or null if not logged in
 */
export const getToken = (): string | null => {
    return localStorage.getItem('token');
};

/**
 * Get user's role from localStorage
 *
 * @returns Stored role string or null if not logged in
 */
export const getRole = (): string | null => {
    const role = localStorage.getItem('role');
    return role && role !== 'null' && role !== 'undefined' ? role : null;
};

/**
 * Get user object from localStorage
 *
 * @returns Stored user object or empty object if not logged in
 */
export const getUser = (): Partial<User> => {
    const userStr = localStorage.getItem('user');
    if (!userStr) return {};
    try {
        return JSON.parse(userStr);
    } catch {
        return {};
    }
};

/**
 * Store authentication data in localStorage
 *
 * Saves token, role, and user profile to localStorage after successful login.
 * This data persists across browser sessions.
 *
 * @param loginResponse - Response from login endpoint
 *
 * @example
 * const response = await login(email, password);
 * setAuthData(response);
 * // User is now authenticated
 */
export const setAuthData = (loginResponse: LoginResponse): void => {
    localStorage.setItem('token', loginResponse.access);
    if (loginResponse.role) {
        localStorage.setItem('role', loginResponse.role);
    } else {
        localStorage.removeItem('role');
    }
    localStorage.setItem('user', JSON.stringify(loginResponse.user));
};

/**
 * Check if user is currently authenticated
 *
 * Verifies that authentication token exists in localStorage.
 * Note: This does not verify token validity with backend.
 *
 * @returns true if token exists, false otherwise
 */
export const isAuthenticated = (): boolean => {
    return !!getToken();
};

/**
 * Clear all authentication data from localStorage
 *
 * Used during logout or when token becomes invalid.
 */
export const clearAuthData = (): void => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('user');
};

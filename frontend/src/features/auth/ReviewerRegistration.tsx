/**
 * ReviewerRegistration Component
 *
 * Public-facing registration form for reviewers to self-register.
 *
 * WORKFLOW:
 * 1. Reviewer fills out registration form
 * 2. Account is created as INACTIVE (pending approval)
 * 3. SRC Chair receives notification and reviews in admin panel
 * 4. Upon approval, account becomes active and reviewer can login
 *
 * SECURITY:
 * - No authentication required (public endpoint)
 * - Password validated on backend (Django password validators)
 * - Email and username uniqueness enforced
 * - Account starts inactive to prevent unauthorized access
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ClipboardCheck,  // Icon for approval notice
    FileText,        // Icon for CV upload
    Mail,            // Icon for email field
    Lock,            // Icon for password fields
    Eye,             // Show password icon
    EyeOff,          // Hide password icon
    User,            // Icon for name fields
    ArrowLeft        // Back button icon
} from 'lucide-react';
import api from '../../services/api';

const ReviewerRegistration: React.FC = () => {
    // ========================================================================
    // STATE MANAGEMENT
    // ========================================================================

    /**
     * Form data state
     * Stores all user input before submission
     */
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        confirmPassword: '',  // Client-side validation only, not sent to backend
        firstName: '',
        lastName: '',
        cv: null as File | null
    });

    /**
     * Password visibility toggles
     * Controls whether passwords are shown as text or dots
     */
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    /**
     * Error message state
     * Displays validation errors from backend or client-side checks
     */
    const [error, setError] = useState('');

    /**
     * Submission loading state
     * Prevents double-submission and shows loading feedback
     */
    const [isSubmitting, setIsSubmitting] = useState(false);

    const navigate = useNavigate();

    // ========================================================================
    // EVENT HANDLERS
    // ========================================================================

    /**
     * Handle input changes
     * Updates form data and clears any existing errors
     */
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, files } = e.target;
        setFormData({
            ...formData,
            [name]: name === 'cv' ? (files?.[0] ?? null) : value
        });
        // Clear error when user starts typing
        setError('');
    };

    /**
     * Handle form submission
     *
     * VALIDATION FLOW:
     * 1. Client-side: Password match & length
     * 2. Backend: Email/username uniqueness, password strength (Django validators)
     *
     * SUCCESS FLOW:
     * - Account created as INACTIVE
     * - Reviewer assigned to "Reviewer" group
     * - ReviewerProfile created (also inactive)
     * - User redirected to login with approval message
     *
     * ERROR HANDLING:
     * - Django REST Framework returns errors as arrays: {"email": ["Error message"]}
     * - We extract the first error from each field's array
     * - Display all field errors in a user-friendly format
     */
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // ====================================================================
        // CLIENT-SIDE VALIDATION
        // ====================================================================

        // Check if passwords match
        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        // Basic password length check (Django has more strict validators on backend)
        if (formData.password.length < 8) {
            setError('Password must be at least 8 characters long');
            return;
        }

        if (formData.cv && formData.cv.size > 5 * 1024 * 1024) {
            setError('CV must be 5 MB or smaller');
            return;
        }

        setIsSubmitting(true);

        try {
            // ================================================================
            // API CALL: POST /auth/register-reviewer/
            // ================================================================
            // Note: confirmPassword is NOT sent to backend (only used for client validation)
            const payload = new FormData();
            payload.append('username', formData.username);
            payload.append('email', formData.email);
            payload.append('password', formData.password);
            payload.append('first_name', formData.firstName);
            payload.append('last_name', formData.lastName);
            if (formData.cv) {
                payload.append('cv', formData.cv);
            }

            const response = await api.post('/auth/register-reviewer/', payload, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            // ================================================================
            // SUCCESS: Account created (but inactive, awaiting approval)
            // ================================================================
            if (response.status === 201) {
                alert('Registration successful! Your account has been created and is pending approval from the SRC Chair. You will be able to login once your account is approved.');
                navigate('/login');
            }
        } catch (err: any) {
            // ================================================================
            // ERROR HANDLING
            // ================================================================

            const errorData = err.response?.data;
            if (errorData) {
                /**
                 * Django REST Framework returns validation errors as arrays:
                 * Example: { "email": ["A user with this email already exists."] }
                 *
                 * We need to:
                 * 1. Check if error is an array and extract first element
                 * 2. Format each field error with field name prefix
                 * 3. Combine all errors with newlines
                 */
                const errorMessages = [];

                // Extract error messages from each field (handle array or string format)
                if (errorData.username) errorMessages.push(`Username: ${Array.isArray(errorData.username) ? errorData.username[0] : errorData.username}`);
                if (errorData.email) errorMessages.push(`Email: ${Array.isArray(errorData.email) ? errorData.email[0] : errorData.email}`);
                if (errorData.password) errorMessages.push(`Password: ${Array.isArray(errorData.password) ? errorData.password[0] : errorData.password}`);
                if (errorData.first_name) errorMessages.push(`First Name: ${Array.isArray(errorData.first_name) ? errorData.first_name[0] : errorData.first_name}`);
                if (errorData.last_name) errorMessages.push(`Last Name: ${Array.isArray(errorData.last_name) ? errorData.last_name[0] : errorData.last_name}`);
                if (errorData.cv) errorMessages.push(`CV: ${Array.isArray(errorData.cv) ? errorData.cv[0] : errorData.cv}`);

                if (errorMessages.length > 0) {
                    // Display specific field errors
                    setError(errorMessages.join('\n'));
                } else {
                    // Fallback for unexpected error format
                    setError('Registration failed. Please check your information and try again.');
                }
            } else {
                // Network error or server down
                setError('Registration failed. Please try again later.');
            }
        } finally {
            // Always re-enable submit button (whether success or error)
            setIsSubmitting(false);
        }
    };

    return (
        <div className="app-background flex min-h-screen flex-col lg:flex-row">
            {/* Left Branding Panel - Desktop Only */}
            <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
                {/* Navy Gradient Background */}
                <div className="absolute inset-0 bg-gradient-to-br from-[hsl(222,47%,12%)] to-[hsl(222,47%,22%)]" />

                {/* Dot Pattern Overlay */}
                <div
                    className="absolute inset-0 opacity-5"
                    style={{
                        backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)',
                        backgroundSize: '24px 24px'
                    }}
                />

                {/* Content */}
                <div className="relative z-10 flex flex-col justify-between p-12 text-white w-full">
                    {/* Top Section */}
                    <div className="flex-1 flex flex-col justify-center items-center text-center">
                        {/* Icon */}
                        <div className="w-24 h-24 rounded-full border-2 border-gold flex items-center justify-center mb-8">
                            <ClipboardCheck size={48} className="text-gold" />
                        </div>

                        {/* Title */}
                        <h1 className="font-serif text-5xl font-bold mb-4">Join as Reviewer</h1>

                        {/* Subtitle */}
                        <p className="text-lg opacity-80 max-w-md mb-8">
                            Register to become a reviewer for research grant proposals
                        </p>

                        {/* University Info */}
                        <div className="space-y-2">
                            <p className="text-sm font-medium">North South University</p>
                            <div className="w-12 h-px bg-gold mx-auto" />
                            <p className="text-xs opacity-70">School of Engineering and Physical Sciences | SRC</p>
                        </div>
                    </div>

                    {/* Bottom Info */}
                    <div className="space-y-4">
                        <p className="text-sm opacity-75">
                            As a reviewer, you'll help evaluate research grant proposals and contribute
                            to advancing research at NSU.
                        </p>
                    </div>
                </div>
            </div>

            {/* Mobile Banner - Visible Only on Mobile */}
            <div className="lg:hidden bg-gradient-to-br from-navy to-navy-dark py-12 px-6 text-white text-center">
                <div className="w-16 h-16 rounded-full border-2 border-gold flex items-center justify-center mx-auto mb-4">
                    <ClipboardCheck size={32} className="text-gold" />
                </div>
                <h1 className="font-serif text-3xl font-bold mb-2">Reviewer Registration</h1>
                <p className="text-sm opacity-80">North South University</p>
            </div>

            {/* Right Form Panel */}
            <div className="flex w-full items-center justify-center bg-transparent p-8 lg:w-1/2">
                <div className="w-full max-w-md animate-fade-in">
                    {/* Back Button */}
                    <button
                        onClick={() => navigate('/login')}
                        className="flex items-center gap-2 text-navy hover:text-gold transition-colors mb-6"
                    >
                        <ArrowLeft size={20} />
                        <span>Back to Login</span>
                    </button>

                    {/* Header */}
                    <div className="mb-8 text-center lg:text-left">
                        <h2 className="font-serif text-3xl font-bold text-navy mb-2">
                            Create Reviewer Account
                        </h2>
                        <p className="text-gray-600 text-sm">
                            Fill in your details to register as a reviewer
                        </p>
                    </div>

                    {/* Approval Notice */}
                    <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 mt-0.5">
                                <ClipboardCheck size={20} className="text-blue-600" />
                            </div>
                            <div>
                                <h3 className="text-sm font-medium text-blue-900 mb-1">Account Approval Required</h3>
                                <p className="text-xs text-blue-700">
                                    Your registration will be reviewed by the SRC Chair. You'll be able to login once your account is approved.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-sm text-red-600 whitespace-pre-line">{error}</p>
                        </div>
                    )}

                    <form
                        onSubmit={handleSubmit}
                        className="surface-glass space-y-5 rounded-2xl border border-slate-200/80 p-5 shadow-[0_14px_34px_rgba(15,23,42,0.1)] sm:p-6"
                    >
                        {/* Name Fields */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    First Name
                                </label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                    <input
                                        type="text"
                                        name="firstName"
                                        placeholder="John"
                                        className="input has-icon-left"
                                        value={formData.firstName}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Last Name
                                </label>
                                <input
                                    type="text"
                                    name="lastName"
                                    placeholder="Doe"
                                    className="input"
                                    value={formData.lastName}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                        </div>

                        {/* Username Input */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Username
                            </label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                <input
                                    type="text"
                                    name="username"
                                    placeholder="john.doe"
                                    className="input has-icon-left"
                                    value={formData.username}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                        </div>

                        {/* Email Input */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Email
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                <input
                                    type="email"
                                    name="email"
                                    placeholder="your.email@nsu.edu"
                                    className="input has-icon-left"
                                    value={formData.email}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                        </div>

                        {/* CV Upload */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                CV for SRC Chair Review
                            </label>
                            <div className="relative">
                                <FileText className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                <input
                                    type="file"
                                    name="cv"
                                    accept=".pdf,.doc,.docx"
                                    className="input has-icon-left file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium"
                                    onChange={handleChange}
                                />
                            </div>
                            <p className="mt-2 text-xs text-gray-500">
                                Optional. Upload PDF, DOC, or DOCX up to 5 MB.
                            </p>
                        </div>

                        {/* Password Input */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Password
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    name="password"
                                    placeholder="********"
                                    className="input has-icon-left has-icon-right"
                                    value={formData.password}
                                    onChange={handleChange}
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                        </div>

                        {/* Confirm Password Input */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Confirm Password
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                <input
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    name="confirmPassword"
                                    placeholder="********"
                                    className="input has-icon-left has-icon-right"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                        </div>

                        {/* Register Button */}
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="btn btn-primary w-full btn-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? 'Registering...' : 'Register as Reviewer'}
                        </button>

                        {/* Footer */}
                        <div className="text-center text-sm text-gray-600">
                            Already have an account?{' '}
                            <button
                                type="button"
                                onClick={() => navigate('/login')}
                                className="text-navy hover:text-gold transition-colors font-medium"
                            >
                                Sign In
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ReviewerRegistration;


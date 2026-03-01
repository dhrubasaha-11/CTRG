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
        <div className="app-background relative min-h-screen overflow-hidden bg-[#ecf1f7]">
            <div className="pointer-events-none absolute inset-0">
                <div className="absolute left-[-180px] top-[-120px] h-[360px] w-[360px] rounded-full bg-[radial-gradient(circle,_rgba(212,160,23,0.28)_0%,_rgba(212,160,23,0)_70%)]" />
                <div className="absolute right-[-140px] top-[90px] h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle,_rgba(30,42,74,0.2)_0%,_rgba(30,42,74,0)_72%)]" />
            </div>

            <div className="relative mx-auto flex min-h-screen max-w-[1240px] items-center px-4 py-8 sm:px-6 lg:px-8">
                <div className="grid w-full gap-6 lg:grid-cols-[0.92fr_1.08fr]">
                    <section className="relative overflow-hidden rounded-[32px] border border-[#1e2a4a]/10 bg-[linear-gradient(155deg,#111b34_0%,#1e2a4a_50%,#30446f_100%)] p-6 text-white shadow-[0_26px_60px_rgba(15,23,42,0.26)] sm:p-8 lg:p-10">
                        <div className="absolute inset-0 opacity-[0.14]" style={{ backgroundImage: 'linear-gradient(to right, rgba(255,255,255,0.18) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.18) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
                        <div className="absolute -right-24 top-[-70px] h-[240px] w-[240px] rounded-full bg-[radial-gradient(circle,_rgba(212,160,23,0.38)_0%,_rgba(212,160,23,0)_72%)]" />
                        <div className="relative z-10 flex h-full flex-col">
                            <button onClick={() => navigate('/login')} className="inline-flex items-center gap-2 self-start rounded-full border border-white/20 bg-white/8 px-4 py-2 text-sm font-medium text-white/90 transition hover:bg-white/14">
                                <ArrowLeft size={16} />
                                Back to Login
                            </button>
                            <div className="mt-8">
                                <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl border border-[#d4a017]/80 bg-[#d4a017]/10">
                                    <ClipboardCheck size={30} className="text-[#f4ca5b]" />
                                </div>
                                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#f3d27d]">Reviewer Onboarding</p>
                                <h1 className="mt-3 font-serif text-4xl leading-tight text-white sm:text-5xl">Join the CTRG reviewer pool.</h1>
                                <p className="mt-4 max-w-[26rem] text-sm leading-7 text-[#d5dff5] sm:text-base">Register once, upload your CV, and let the SRC Chair approve your reviewer account for upcoming research grant cycles.</p>
                            </div>
                            <div className="mt-8 grid gap-4 sm:grid-cols-3">
                                <div className="rounded-2xl border border-white/16 bg-white/8 p-4 backdrop-blur-sm"><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#f1d27e]">Step 1</p><p className="mt-2 text-sm font-semibold text-white">Create profile</p><p className="mt-2 text-xs leading-6 text-[#d7e1f6]">Add your institutional details and reviewer identity.</p></div>
                                <div className="rounded-2xl border border-white/16 bg-white/8 p-4 backdrop-blur-sm"><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#f1d27e]">Step 2</p><p className="mt-2 text-sm font-semibold text-white">Upload CV</p><p className="mt-2 text-xs leading-6 text-[#d7e1f6]">Share your academic background for chair review.</p></div>
                                <div className="rounded-2xl border border-white/16 bg-white/8 p-4 backdrop-blur-sm"><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#f1d27e]">Step 3</p><p className="mt-2 text-sm font-semibold text-white">Await approval</p><p className="mt-2 text-xs leading-6 text-[#d7e1f6]">You can sign in after SRC Chair activation.</p></div>
                            </div>
                            <div className="mt-8 rounded-[24px] border border-[#d4a017]/35 bg-[linear-gradient(145deg,rgba(212,160,23,0.12)_0%,rgba(212,160,23,0.04)_100%)] p-5">
                                <p className="text-sm font-semibold text-white">Approval required before login</p>
                                <p className="mt-2 text-sm leading-6 text-[#d9e3f8]">Your registration stays pending until the SRC Chair reviews your details and activates your reviewer profile.</p>
                            </div>
                        </div>
                    </section>

                    <section className="flex items-center justify-center">
                        <div className="w-full max-w-[760px] animate-fade-in">
                            <div className="surface-glass overflow-hidden rounded-[32px] border border-white/70 shadow-[0_24px_60px_rgba(15,23,42,0.14)]">
                                <div className="border-b border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.88)_0%,rgba(248,250,252,0.92)_100%)] px-6 py-6 sm:px-8">
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7b89a5]">Application Form</p>
                                    <h2 className="mt-2 font-serif text-3xl leading-tight text-[#1b2747] sm:text-4xl">Create Reviewer Account</h2>
                                    <p className="mt-3 max-w-[34rem] text-sm leading-6 text-[#5f6e8b]">Complete your reviewer profile with institutional credentials and a supporting CV.</p>
                                </div>

                                <div className="px-6 py-6 sm:px-8 sm:py-8">
                                    {error && <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3"><p className="text-sm text-rose-700 whitespace-pre-line">{error}</p></div>}

                                    <form onSubmit={handleSubmit} className="space-y-6">
                                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                            <div><label className="mb-2 block text-sm font-semibold text-[#384867]">First Name</label><div className="relative"><User className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7f8ca8]" size={18} /><input type="text" name="firstName" placeholder="John" className="input has-icon-left rounded-xl border-[#cbd5e5] bg-[#f8fafd] text-[#1d2b4d] placeholder:text-[#90a0bd] focus:border-[#1e2a4a] focus:bg-white" value={formData.firstName} onChange={handleChange} required /></div></div>
                                            <div><label className="mb-2 block text-sm font-semibold text-[#384867]">Last Name</label><div className="relative"><User className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7f8ca8]" size={18} /><input type="text" name="lastName" placeholder="Doe" className="input has-icon-left rounded-xl border-[#cbd5e5] bg-[#f8fafd] text-[#1d2b4d] placeholder:text-[#90a0bd] focus:border-[#1e2a4a] focus:bg-white" value={formData.lastName} onChange={handleChange} required /></div></div>
                                        </div>

                                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[0.85fr_1.15fr]">
                                            <div><label className="mb-2 block text-sm font-semibold text-[#384867]">Username</label><div className="relative"><User className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7f8ca8]" size={18} /><input type="text" name="username" placeholder="john.doe" className="input has-icon-left rounded-xl border-[#cbd5e5] bg-[#f8fafd] text-[#1d2b4d] placeholder:text-[#90a0bd] focus:border-[#1e2a4a] focus:bg-white" value={formData.username} onChange={handleChange} required /></div></div>
                                            <div><label className="mb-2 block text-sm font-semibold text-[#384867]">Institutional Email</label><div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7f8ca8]" size={18} /><input type="email" name="email" placeholder="your.email@nsu.edu" className="input has-icon-left rounded-xl border-[#cbd5e5] bg-[#f8fafd] text-[#1d2b4d] placeholder:text-[#90a0bd] focus:border-[#1e2a4a] focus:bg-white" value={formData.email} onChange={handleChange} required /></div></div>
                                        </div>

                                        <div className="rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,#fbfdff_0%,#f6f9fd_100%)] p-5">
                                            <label className="block text-sm font-semibold text-[#384867]">CV for SRC Chair Review</label>
                                            <p className="mt-1 text-xs leading-6 text-[#66758f]">Optional. Upload PDF, DOC, or DOCX up to 5 MB to support reviewer approval.</p>
                                            <div className="relative mt-4"><input type="file" name="cv" accept=".pdf,.doc,.docx" className="input rounded-xl border-[#cbd5e5] bg-white file:mr-3 file:rounded-lg file:border-0 file:bg-[#1e2a4a]/8 file:px-3 file:py-2 file:text-sm file:font-medium file:text-[#1e2a4a]" onChange={handleChange} /></div>
                                        </div>

                                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                            <div><label className="mb-2 block text-sm font-semibold text-[#384867]">Password</label><div className="relative"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7f8ca8]" size={18} /><input type={showPassword ? 'text' : 'password'} name="password" placeholder="Create a secure password" className="input has-icon-left has-icon-right rounded-xl border-[#cbd5e5] bg-[#f8fafd] text-[#1d2b4d] placeholder:text-[#90a0bd] focus:border-[#1e2a4a] focus:bg-white" value={formData.password} onChange={handleChange} required /><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7b89a6] transition-colors hover:text-[#1e2a4a]">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></div>
                                            <div><label className="mb-2 block text-sm font-semibold text-[#384867]">Confirm Password</label><div className="relative"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7f8ca8]" size={18} /><input type={showConfirmPassword ? 'text' : 'password'} name="confirmPassword" placeholder="Repeat your password" className="input has-icon-left has-icon-right rounded-xl border-[#cbd5e5] bg-[#f8fafd] text-[#1d2b4d] placeholder:text-[#90a0bd] focus:border-[#1e2a4a] focus:bg-white" value={formData.confirmPassword} onChange={handleChange} required /><button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7b89a6] transition-colors hover:text-[#1e2a4a]">{showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></div>
                                        </div>

                                        <div className="rounded-2xl border border-[#d4a017]/28 bg-[linear-gradient(140deg,rgba(212,160,23,0.1)_0%,rgba(212,160,23,0.04)_100%)] px-4 py-3">
                                            <p className="text-sm font-medium text-[#5b4000]">Reviewer accounts remain inactive until SRC Chair approval.</p>
                                        </div>

                                        <button type="submit" disabled={isSubmitting} className="btn w-full rounded-xl border border-[#b8850c] bg-[linear-gradient(140deg,#d4a017_0%,#f1c350_100%)] py-3 text-base font-bold text-[#1b2747] shadow-[0_14px_26px_rgba(184,133,12,0.28)] transition-all duration-200 hover:translate-y-[-1px] hover:shadow-[0_18px_30px_rgba(184,133,12,0.34)] disabled:cursor-not-allowed disabled:opacity-70">
                                            {isSubmitting ? 'Registering...' : 'Register as Reviewer'}
                                        </button>

                                        <div className="border-t border-[#e7edf5] pt-5 text-center text-sm text-[#5f6e8b]">
                                            Already have an account? <button type="button" onClick={() => navigate('/login')} className="font-semibold text-[#1e2a4a] underline decoration-[#d4a017] decoration-2 underline-offset-4 transition-colors hover:text-[#b8850c]">Sign In</button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default ReviewerRegistration;


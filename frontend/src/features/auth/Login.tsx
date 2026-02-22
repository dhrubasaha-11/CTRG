import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import { useNavigate } from 'react-router-dom';
import {
    GraduationCap,
    Shield,
    ClipboardCheck,
    BarChart3,
    Users,
    Mail,
    Lock,
    Eye,
    EyeOff
} from 'lucide-react';

type Role = 'src_chair' | 'reviewer' | 'pi';

const Login: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [selectedRole, setSelectedRole] = useState<Role>('src_chair');
    const [rememberMe, setRememberMe] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const roleOptions = [
        { value: 'src_chair' as Role, label: 'SRC Chair', icon: Shield },
        { value: 'reviewer' as Role, label: 'Reviewer', icon: ClipboardCheck },
    ];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMessage('');
        setIsSubmitting(true);
        try {
            const response = await login(email, password);

            if (response.redirect_to) {
                navigate(response.redirect_to);
                return;
            }

            // Redirect based on actual user role from backend response
            const userRole = response.role?.toLowerCase();

            if (userRole === 'src_chair' || userRole === 'admin' || response.user.is_staff) {
                navigate('/admin/dashboard');
            } else if (userRole === 'reviewer') {
                navigate('/reviewer/dashboard');
            } else if (userRole === 'pi') {
                navigate('/pi/dashboard');
            } else {
                // Fallback based on email if role is missing (legacy)
                if (email.includes('admin')) {
                    navigate('/admin/dashboard');
                } else {
                    navigate('/reviewer/dashboard');
                }
            }
        } catch (error: any) {
            const message = error?.message ||
                                error.response?.data?.non_field_errors?.[0] ||
                                error.response?.data?.password?.[0] ||
                                error.response?.data?.email?.[0] ||
                                error.response?.data?.detail ||
                                'Login failed. Please check your credentials.';
            setErrorMessage(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="app-background relative min-h-screen overflow-hidden bg-[#edf2f8]">
            <div className="pointer-events-none absolute inset-0">
                <div className="absolute -left-28 top-[-150px] h-[360px] w-[360px] rounded-full bg-[radial-gradient(circle,_rgba(212,160,23,0.34)_0%,_rgba(212,160,23,0.02)_72%)]" />
                <div className="absolute right-[-170px] top-16 h-[440px] w-[440px] rounded-full bg-[radial-gradient(circle,_rgba(30,42,74,0.25)_0%,_rgba(30,42,74,0.02)_72%)]" />
                <div className="absolute bottom-[-180px] left-1/2 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,_rgba(42,58,95,0.2)_0%,_rgba(42,58,95,0.01)_70%)]" />
            </div>

            <div className="relative mx-auto min-h-screen max-w-[1360px] lg:grid lg:grid-cols-[1.06fr_0.94fr]">
                <section className="relative hidden lg:block">
                    <div className="absolute inset-6 overflow-hidden rounded-[32px] border border-white/10 shadow-[0_28px_70px_rgba(15,23,42,0.34)]">
                        <div className="absolute inset-0 bg-[linear-gradient(145deg,#0f172d_0%,#1e2a4a_46%,#27365b_100%)]" />
                        <div className="absolute inset-0 opacity-[0.14]" style={{ backgroundImage: 'linear-gradient(to right, rgba(255,255,255,0.24) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.24) 1px, transparent 1px)', backgroundSize: '34px 34px' }} />
                        <div className="absolute -right-20 top-[-110px] h-[300px] w-[300px] rounded-full bg-[radial-gradient(circle,_rgba(212,160,23,0.52)_0%,_rgba(212,160,23,0)_72%)]" />
                        <div className="absolute left-0 top-16 h-[220px] w-[220px] rounded-full bg-[radial-gradient(circle,_rgba(132,156,206,0.2)_0%,_rgba(132,156,206,0)_72%)]" />

                        <div className="relative z-10 flex h-full flex-col justify-between p-12 text-[#ecf2ff]">
                            <div>
                                <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-2xl border border-[#d4a017]/80 bg-[#d4a017]/12">
                                    <GraduationCap size={36} className="text-[#f4ca5b]" />
                                </div>
                                <h1 className="font-serif text-5xl leading-tight text-white">CTRG Portal</h1>
                                <p className="mt-4 max-w-xl text-base leading-relaxed text-[#c9d5ef]">
                                    Two-stage research grant evaluation platform for NSU.
                                    Track submissions, reviews, revisions, and final approvals in one secured workflow.
                                </p>
                                <div className="mt-8 inline-flex items-center rounded-full border border-[#d4a017]/60 bg-[#d4a017]/14 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#f7d98a]">
                                    School of Engineering and Physical Sciences
                                </div>
                            </div>

                            <div className="grid gap-4">
                                <div className="rounded-2xl border border-white/20 bg-white/6 p-4 backdrop-blur-sm">
                                    <div className="flex items-center gap-3">
                                        <Shield size={18} className="text-[#f4ca5b]" />
                                        <p className="text-sm font-semibold text-white">Secure Role-Based Access</p>
                                    </div>
                                    <p className="mt-2 text-xs text-[#ced8ee]">SRC Chair and Reviewer workflows are isolated and auditable.</p>
                                </div>
                                <div className="rounded-2xl border border-white/20 bg-white/6 p-4 backdrop-blur-sm">
                                    <div className="flex items-center gap-3">
                                        <BarChart3 size={18} className="text-[#f4ca5b]" />
                                        <p className="text-sm font-semibold text-white">Decision Intelligence</p>
                                    </div>
                                    <p className="mt-2 text-xs text-[#ced8ee]">Stage-wise scoring and comments remain visible through final decisioning.</p>
                                </div>
                                <div className="rounded-2xl border border-white/20 bg-white/6 p-4 backdrop-blur-sm">
                                    <div className="flex items-center gap-3">
                                        <Users size={18} className="text-[#f4ca5b]" />
                                        <p className="text-sm font-semibold text-white">Collaborative Review Ops</p>
                                    </div>
                                    <p className="mt-2 text-xs text-[#ced8ee]">Assignments, reminders, revisions, and reporting in one lifecycle.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="relative flex items-center justify-center px-5 py-8 sm:px-10 sm:py-10 lg:px-12">
                    <div className="w-full max-w-[520px] animate-fade-in">
                        <div className="mb-6 rounded-2xl border border-[#1e2a4a]/20 bg-[linear-gradient(110deg,_#1e2a4a_0%,_#27365b_100%)] px-5 py-4 text-white shadow-[0_20px_48px_rgba(30,42,74,0.28)] lg:hidden">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#d4a017]/16">
                                    <GraduationCap size={20} className="text-[#f6d47a]" />
                                </div>
                                <div>
                                    <h1 className="font-serif text-2xl leading-none">CTRG</h1>
                                    <p className="mt-1 text-xs text-[#c8d4ee]">North South University</p>
                                </div>
                            </div>
                        </div>

                        <div className="rounded-[28px] border border-[#1e2a4a]/12 bg-white/95 p-6 shadow-[0_24px_60px_rgba(15,23,42,0.16)] backdrop-blur-xl sm:p-8">
                            <div className="mb-8">
                                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7a8aa8]">Welcome back</p>
                                <h2 className="font-serif text-4xl leading-tight text-[#1b2747]">Sign in to continue</h2>
                                <p className="mt-2 text-sm text-[#5f6e8b]">Use your institutional account credentials.</p>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                {errorMessage && (
                                    <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                                        {errorMessage}
                                    </div>
                                )}
                                <div>
                                    <label className="mb-3 block text-sm font-semibold text-[#384867]">Select your role</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        {roleOptions.map((role) => {
                                            const Icon = role.icon;
                                            const isSelected = selectedRole === role.value;

                                            return (
                                                <button
                                                    key={role.value}
                                                    type="button"
                                                    onClick={() => setSelectedRole(role.value)}
                                                    className={`group rounded-xl border px-3 py-3 text-left transition-all duration-200 ${
                                                        isSelected
                                                            ? 'border-[#d4a017] bg-[linear-gradient(145deg,rgba(212,160,23,0.16)_0%,rgba(212,160,23,0.06)_100%)] shadow-[0_12px_24px_rgba(212,160,23,0.24)]'
                                                            : 'border-[#d6ddea] bg-white hover:border-[#a9b6cf] hover:bg-[#f7f9fd]'
                                                    }`}
                                                >
                                                    <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-[#1e2a4a]/10 text-[#1e2a4a] group-hover:bg-[#1e2a4a]/12">
                                                        <Icon size={16} className={isSelected ? 'text-[#9d7103]' : 'text-[#3d4d70]'} />
                                                    </div>
                                                    <p className={`text-sm font-semibold ${isSelected ? 'text-[#5b4000]' : 'text-[#2e3e62]'}`}>
                                                        {role.label}
                                                    </p>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-semibold text-[#384867]">Email</label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7f8ca8]" size={18} />
                                        <input
                                            type="email"
                                            placeholder="your.email@nsu.edu"
                                            className="input has-icon-left rounded-xl border-[#cbd5e5] bg-[#f8fafd] text-[#1d2b4d] placeholder:text-[#90a0bd] focus:border-[#1e2a4a] focus:bg-white"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-semibold text-[#384867]">Password</label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7f8ca8]" size={18} />
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            placeholder="Enter your password"
                                            className="input has-icon-left has-icon-right rounded-xl border-[#cbd5e5] bg-[#f8fafd] text-[#1d2b4d] placeholder:text-[#90a0bd] focus:border-[#1e2a4a] focus:bg-white"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7b89a6] transition-colors hover:text-[#1e2a4a]"
                                        >
                                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between text-sm">
                                    <label className="flex cursor-pointer items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={rememberMe}
                                            onChange={(e) => setRememberMe(e.target.checked)}
                                            className="h-4 w-4 rounded border-[#c4cfdf] text-[#d4a017] focus:ring-[#d4a017]"
                                        />
                                        <span className="text-[#425274]">Remember me</span>
                                    </label>
                                    <span className="text-sm text-[#425274]">
                                        Forgot password? Contact your administrator.
                                    </span>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="btn w-full rounded-xl border border-[#b8850c] bg-[linear-gradient(140deg,#d4a017_0%,#f1c350_100%)] py-3 text-base font-bold text-[#1b2747] shadow-[0_14px_26px_rgba(184,133,12,0.34)] transition-all duration-200 hover:translate-y-[-1px] hover:shadow-[0_18px_30px_rgba(184,133,12,0.36)] disabled:cursor-not-allowed disabled:opacity-70"
                                >
                                    {isSubmitting ? 'Signing in...' : 'Sign In'}
                                </button>

                                <div className="border-t border-[#e7edf5] pt-5 text-center text-sm text-[#5f6e8b]">
                                    <p className="mb-2">Do not have an account?</p>
                                    <button
                                        type="button"
                                        onClick={() => navigate('/register-reviewer')}
                                        className="font-semibold text-[#1e2a4a] underline decoration-[#d4a017] decoration-2 underline-offset-4 transition-colors hover:text-[#b8850c]"
                                    >
                                        Register as Reviewer
                                    </button>
                                </div>

                                <p className="text-center text-sm text-[#5f6e8b]">
                                    Need help?{' '}
                                    <a href="mailto:src@nsu.edu" className="font-semibold text-[#1e2a4a] transition-colors hover:text-[#b8850c]">
                                        Contact src@nsu.edu
                                    </a>
                                </p>
                            </form>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default Login;

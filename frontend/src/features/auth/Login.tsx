import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, Mail, Lock, Eye, EyeOff, ArrowRight, Sparkles, Shield, BarChart3, Users } from 'lucide-react';

const features = [
    { icon: Shield,   title: 'Secure Role-Based Access',  desc: 'Isolated, auditable workflows for SRC Chair, Reviewers, and PIs.' },
    { icon: BarChart3, title: 'Decision Intelligence',    desc: 'Stage-wise scoring with full comment history through final decisions.' },
    { icon: Users,    title: 'Collaborative Review Ops',  desc: 'Assignments, reminders, revisions, and reports in one lifecycle.' },
];

const Login: React.FC = () => {
    const [email, setEmail]         = useState('');
    const [password, setPassword]   = useState('');
    const [showPw, setShowPw]       = useState(false);
    const [error, setError]         = useState('');
    const [loading, setLoading]     = useState(false);
    const { login } = useAuth();
    const navigate  = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const res = await login(email, password);
            if (res.redirect_to) { navigate(res.redirect_to); return; }
            const r = res.role?.toLowerCase();
            if      (r === 'src_chair' || res.user?.is_staff) navigate('/admin/dashboard');
            else if (r === 'reviewer') navigate('/reviewer/dashboard');
            else                       navigate('/pi/dashboard');
        } catch (err: any) {
            setError(
                err?.response?.data?.non_field_errors?.[0] ||
                err?.response?.data?.detail ||
                err?.message ||
                'Login failed. Please check your credentials.'
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="app-bg relative min-h-screen flex" style={{ position: 'relative', overflow: 'hidden' }}>
            {/* Ambient blobs */}
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
                <div style={{ position: 'absolute', left: '-120px', top: '-80px', width: '500px', height: '500px', background: 'radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 65%)', borderRadius: '50%' }} />
                <div style={{ position: 'absolute', right: '-60px', top: '40%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(139,92,246,0.14) 0%, transparent 65%)', borderRadius: '50%' }} />
                <div style={{ position: 'absolute', bottom: '-100px', left: '35%', width: '380px', height: '380px', background: 'radial-gradient(circle, rgba(6,182,212,0.1) 0%, transparent 65%)', borderRadius: '50%' }} />
            </div>

            <div className="relative z-10 flex flex-1 min-h-screen">

                {/* ── Left Panel (branding) ── */}
                <div className="hidden xl:flex xl:flex-col xl:w-[52%] relative overflow-hidden"
                     style={{ background: 'linear-gradient(145deg, #060c1c 0%, #0c1428 50%, #111b38 100%)' }}>
                    {/* Grid texture */}
                    <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)', backgroundSize: '32px 32px', pointerEvents: 'none' }} />
                    {/* Glow accents */}
                    <div style={{ position: 'absolute', right: '-80px', top: '0', width: '360px', height: '360px', background: 'radial-gradient(circle, rgba(99,102,241,0.3) 0%, transparent 65%)', borderRadius: '50%' }} />
                    <div style={{ position: 'absolute', left: '20%', bottom: '10%', width: '240px', height: '240px', background: 'radial-gradient(circle, rgba(139,92,246,0.2) 0%, transparent 65%)', borderRadius: '50%' }} />

                    <div className="relative z-10 flex flex-col h-full p-12 justify-between">
                        {/* Logo */}
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-2xl"
                                 style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', boxShadow: '0 0 24px rgba(99,102,241,0.5)' }}>
                                <GraduationCap className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-400">North South University</p>
                                <p className="text-sm font-semibold text-white">CTRG Grant Portal</p>
                            </div>
                        </div>

                        {/* Hero text */}
                        <div className="max-w-md">
                            <div className="mb-5 inline-flex items-center gap-2 rounded-full px-3 py-1.5"
                                 style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)' }}>
                                <Sparkles className="h-3.5 w-3.5 text-brand-400" />
                                <span className="text-xs font-semibold text-brand-300 uppercase tracking-widest">Two-Stage Review System</span>
                            </div>

                            <h1 className="text-5xl font-extrabold leading-tight mb-4"
                                style={{ color: '#f1f5f9', letterSpacing: '-0.03em' }}>
                                Research Grant{' '}
                                <span className="text-gradient">Management</span>
                            </h1>
                            <p className="text-base leading-relaxed" style={{ color: 'rgba(148,163,184,0.9)' }}>
                                Track submissions, peer reviews, revisions, and final approvals across the complete grant lifecycle — in one controlled workflow.
                            </p>

                            {/* Feature cards */}
                            <div className="mt-8 space-y-3">
                                {features.map((f) => (
                                    <div key={f.title} className="flex items-start gap-4 rounded-2xl p-4"
                                         style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl"
                                             style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.25)' }}>
                                            <f.icon className="h-4.5 w-4.5 text-brand-400" size={18} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-slate-200 mb-0.5">{f.title}</p>
                                            <p className="text-xs leading-relaxed" style={{ color: 'rgba(148,163,184,0.75)' }}>{f.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Footer */}
                        <p className="text-xs" style={{ color: 'rgba(100,116,139,0.7)' }}>
                            © {new Date().getFullYear()} North South University · CTRG · SEPS
                        </p>
                    </div>
                </div>

                {/* ── Right Panel (form) ── */}
                <div className="flex flex-1 items-center justify-center px-5 py-10 sm:px-10">
                    <div className="w-full max-w-[420px] animate-slide-up">

                        {/* Mobile logo */}
                        <div className="mb-6 flex items-center gap-3 xl:hidden">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl"
                                 style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 0 16px rgba(99,102,241,0.45)' }}>
                                <GraduationCap className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-brand-400">NSU · CTRG</p>
                                <p className="text-sm font-semibold text-slate-200">Grant Portal</p>
                            </div>
                        </div>

                        {/* Card */}
                        <div className="rounded-3xl p-7 sm:p-8"
                             style={{ background: 'rgba(13,21,41,0.8)', border: '1px solid rgba(255,255,255,0.09)', backdropFilter: 'blur(24px)', boxShadow: '0 24px 60px rgba(0,0,0,0.55)' }}>

                            <div className="mb-7">
                                <p className="section-label mb-1.5">Welcome back</p>
                                <h2 className="text-2xl font-bold text-slate-100" style={{ letterSpacing: '-0.025em' }}>
                                    Sign in to continue
                                </h2>
                                <p className="mt-1.5 text-sm" style={{ color: 'rgba(100,116,139,0.9)' }}>
                                    Use your institutional account credentials.
                                </p>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-5">
                                {error && (
                                    <div className="rounded-xl px-4 py-3 text-sm font-medium"
                                         style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5' }}>
                                        {error}
                                    </div>
                                )}

                                {/* Email */}
                                <div>
                                    <label className="mb-2 block text-sm font-semibold text-slate-400">Email</label>
                                    <div className="relative">
                                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600" />
                                        <input
                                            type="email"
                                            autoComplete="email"
                                            placeholder="your.email@nsu.edu"
                                            className="input has-icon-left"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Password */}
                                <div>
                                    <label className="mb-2 block text-sm font-semibold text-slate-400">Password</label>
                                    <div className="relative">
                                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600" />
                                        <input
                                            type={showPw ? 'text' : 'password'}
                                            autoComplete="current-password"
                                            placeholder="Enter your password"
                                            className="input has-icon-left has-icon-right"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPw(!showPw)}
                                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-600 transition-colors hover:text-slate-300"
                                        >
                                            {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    </div>
                                </div>

                                <p className="text-right text-sm" style={{ color: 'rgba(100,116,139,0.8)' }}>
                                    Forgot password? Contact your administrator.
                                </p>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="btn btn-primary w-full btn-lg"
                                >
                                    {loading ? (
                                        <span className="flex items-center gap-2">
                                            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                                                <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                                                <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                            </svg>
                                            Signing in...
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-2">
                                            Sign In
                                            <ArrowRight className="h-4 w-4" />
                                        </span>
                                    )}
                                </button>

                                <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: '16px' }}>
                                    <p className="text-center text-sm" style={{ color: 'rgba(100,116,139,0.75)' }}>
                                        Reviewer registration is by invitation only. Contact the SRC Chair for access.
                                    </p>
                                    <p className="mt-2 text-center text-sm" style={{ color: 'rgba(100,116,139,0.75)' }}>
                                        Need help?{' '}
                                        <a href="mailto:src@nsu.edu" className="font-semibold text-brand-400 hover:text-brand-300 transition-colors">
                                            src@nsu.edu
                                        </a>
                                    </p>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;

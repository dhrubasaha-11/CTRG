import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, Mail, Lock, Eye, EyeOff, ArrowRight, BookOpen, FlaskConical, Atom, BrainCircuit, Microscope } from 'lucide-react';

const floatingEquations = [
    { text: 'H-index = f(citations)', x: '8%', y: '12%', delay: '0s', duration: '18s', size: '0.85rem', opacity: 0.12 },
    { text: '∂R/∂t = αP − βD', x: '72%', y: '8%', delay: '3s', duration: '22s', size: '0.95rem', opacity: 0.10 },
    { text: 'IF = C(y) / A(y−1) + A(y−2)', x: '15%', y: '78%', delay: '5s', duration: '20s', size: '0.8rem', opacity: 0.09 },
    { text: 'p < 0.05', x: '82%', y: '72%', delay: '2s', duration: '16s', size: '1.1rem', opacity: 0.14 },
    { text: 'R² = 1 − SS_res/SS_tot', x: '60%', y: '85%', delay: '7s', duration: '24s', size: '0.75rem', opacity: 0.08 },
    { text: 'σ = √(Σ(x−μ)²/N)', x: '5%', y: '45%', delay: '4s', duration: '19s', size: '0.9rem', opacity: 0.11 },
    { text: 'Σ grants × impact', x: '88%', y: '38%', delay: '6s', duration: '21s', size: '0.85rem', opacity: 0.10 },
    { text: 'n = z²pq/e²', x: '35%', y: '5%', delay: '1s', duration: '17s', size: '0.8rem', opacity: 0.09 },
    { text: 'χ² = Σ(O−E)²/E', x: '50%', y: '92%', delay: '8s', duration: '23s', size: '0.9rem', opacity: 0.07 },
    { text: '∇²ψ + V(r)ψ = Eψ', x: '25%', y: '60%', delay: '2.5s', duration: '20s', size: '0.75rem', opacity: 0.08 },
];

const floatingLabels = [
    { text: 'Peer Review', x: '10%', y: '22%', delay: '0s', color: '#818cf8' },
    { text: 'Grant Cycle', x: '78%', y: '18%', delay: '2s', color: '#a78bfa' },
    { text: 'Impact Factor', x: '65%', y: '75%', delay: '4s', color: '#22d3ee' },
    { text: 'NSU', x: '20%', y: '68%', delay: '1s', color: '#6366f1' },
    { text: 'SRC', x: '85%', y: '55%', delay: '3s', color: '#8b5cf6' },
    { text: 'CTRG', x: '42%', y: '10%', delay: '5s', color: '#06b6d4' },
];

const researchTracks = [
    { icon: GraduationCap, label: 'PI', title: 'Principal Investigator', desc: 'Submit and track grant proposals, respond to revision requests, and monitor review progress' },
    { icon: Microscope, label: 'Reviewer', title: 'Reviewer', desc: 'Evaluate assigned proposals across Stage 1 and Stage 2 using structured rubrics' },
    { icon: BrainCircuit, label: 'SRC Chair', title: 'SRC Chair', desc: 'Manage grant cycles, oversee reviewers, and make final adjudication decisions' },
];

const Login: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPw, setShowPw] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const res = await login(email.trim(), password);
            if (res.redirect_to) { navigate(res.redirect_to); return; }
            const r = res.role?.toLowerCase();
            if (r === 'src_chair' || res.user?.is_staff) navigate('/admin/dashboard');
            else if (r === 'reviewer') navigate('/reviewer/dashboard');
            else navigate('/pi/dashboard');
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
        <div className="login-research-bg relative min-h-screen flex">

            <div className="login-decorative-layer" aria-hidden="true">
                {floatingEquations.map((eq, i) => (
                    <span
                        key={`eq-${i}`}
                        className="login-float-equation"
                        style={{
                            left: eq.x,
                            top: eq.y,
                            fontSize: eq.size,
                            opacity: eq.opacity,
                            animationDelay: eq.delay,
                            animationDuration: eq.duration,
                        }}
                    >
                        {eq.text}
                    </span>
                ))}

                {floatingLabels.map((lb, i) => (
                    <span
                        key={`lb-${i}`}
                        className="login-float-label"
                        style={{
                            left: lb.x,
                            top: lb.y,
                            animationDelay: lb.delay,
                            color: lb.color,
                            borderColor: lb.color,
                        }}
                    >
                        {lb.text}
                    </span>
                ))}

                <div className="login-aurora" />
                <div className="login-orb login-orb-1" />
                <div className="login-orb login-orb-2" />
                <div className="login-orb login-orb-3" />
                <div className="login-orb login-orb-4" />
                <div className="login-orb login-orb-5" />
                <div className="login-grid-overlay" />
            </div>

            <div className="relative z-10 flex flex-1 min-h-screen">

                {/* ━━ Left Panel ━━ */}
                <div className="hidden xl:flex xl:flex-col xl:w-[54%] relative overflow-hidden"
                     style={{ background: 'linear-gradient(155deg, #010510 0%, #050b20 30%, #08102a 60%, #0a1433 100%)' }}>

                    <svg className="login-network-svg" viewBox="0 0 600 800" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                        <circle cx="120" cy="150" r="4" fill="rgba(99,102,241,0.55)" />
                        <circle cx="350" cy="100" r="3.5" fill="rgba(139,92,246,0.5)" />
                        <circle cx="480" cy="220" r="3" fill="rgba(6,182,212,0.45)" />
                        <circle cx="200" cy="350" r="4" fill="rgba(99,102,241,0.45)" />
                        <circle cx="450" cy="400" r="3.5" fill="rgba(139,92,246,0.4)" />
                        <circle cx="100" cy="550" r="3" fill="rgba(6,182,212,0.4)" />
                        <circle cx="380" cy="600" r="4" fill="rgba(99,102,241,0.35)" />
                        <circle cx="530" cy="500" r="3" fill="rgba(139,92,246,0.35)" />
                        <circle cx="260" cy="480" r="2.5" fill="rgba(168,85,247,0.35)" />
                        <circle cx="560" cy="320" r="2" fill="rgba(6,182,212,0.3)" />
                        <circle cx="60" cy="700" r="2.5" fill="rgba(99,102,241,0.3)" />
                        <line x1="120" y1="150" x2="350" y2="100" stroke="rgba(99,102,241,0.2)" strokeWidth="1" />
                        <line x1="350" y1="100" x2="480" y2="220" stroke="rgba(139,92,246,0.18)" strokeWidth="1" />
                        <line x1="120" y1="150" x2="200" y2="350" stroke="rgba(6,182,212,0.16)" strokeWidth="1" />
                        <line x1="200" y1="350" x2="450" y2="400" stroke="rgba(99,102,241,0.15)" strokeWidth="1" />
                        <line x1="480" y1="220" x2="450" y2="400" stroke="rgba(139,92,246,0.14)" strokeWidth="1" />
                        <line x1="100" y1="550" x2="200" y2="350" stroke="rgba(6,182,212,0.14)" strokeWidth="1" />
                        <line x1="100" y1="550" x2="380" y2="600" stroke="rgba(99,102,241,0.12)" strokeWidth="1" />
                        <line x1="450" y1="400" x2="530" y2="500" stroke="rgba(139,92,246,0.12)" strokeWidth="1" />
                        <line x1="530" y1="500" x2="380" y2="600" stroke="rgba(6,182,212,0.1)" strokeWidth="1" />
                        <line x1="200" y1="350" x2="260" y2="480" stroke="rgba(168,85,247,0.12)" strokeWidth="1" />
                        <line x1="480" y1="220" x2="560" y2="320" stroke="rgba(6,182,212,0.1)" strokeWidth="1" />
                        <line x1="100" y1="550" x2="60" y2="700" stroke="rgba(99,102,241,0.1)" strokeWidth="1" />
                    </svg>

                    <div className="relative z-10 flex flex-col h-full p-12">

                        {/* Logo — fixed at top */}
                        <div className="flex items-center gap-3 flex-shrink-0">
                            <div className="login-logo-icon">
                                <GraduationCap className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <p className="text-[10.5px] font-bold uppercase tracking-[0.2em] text-brand-400">North South University</p>
                                <p className="text-sm font-semibold text-white/90">CTRG Grant Portal</p>
                            </div>
                        </div>

                        {/* Hero content — vertically centered */}
                        <div className="flex-1 flex flex-col justify-center max-w-lg py-8">
                            <div className="mb-6 inline-flex items-center gap-2 rounded-full px-4 py-2"
                                 style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)' }}>
                                <Atom className="h-4 w-4 text-cyan-400 login-spin-slow" />
                                <span className="text-xs font-bold text-brand-300 uppercase tracking-[0.15em]">Unified Research Portal</span>
                            </div>

                            <h1 className="login-hero-heading">
                                Scientific{' '}
                                <span className="login-hero-gradient">Research</span>
                                <br />
                                Grant Review
                            </h1>
                            <p className="mt-4 text-base leading-relaxed text-slate-500 max-w-md">
                                One portal for all roles — PIs submit proposals, Reviewers evaluate them, and the SRC Chair oversees the full grant lifecycle at NSU.
                            </p>

                            <div className="mt-8 space-y-3">
                                {researchTracks.map((t) => (
                                    <div key={t.title} className="login-track-card">
                                        <div className="login-track-icon">
                                            <t.icon className="h-[18px] w-[18px]" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <span className="login-track-label">{t.label}</span>
                                                <span className="text-[13px] font-semibold text-slate-800">{t.title}</span>
                                            </div>
                                            <p className="text-xs text-slate-500 leading-relaxed">{t.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-8 flex gap-8">
                                {[
                                    { value: '2-Stage', label: 'Review Process' },
                                    { value: '3 Roles', label: 'PI · Reviewer · SRC' },
                                    { value: '100%', label: 'Audit Trail' },
                                ].map(s => (
                                    <div key={s.label}>
                                        <p className="text-lg font-bold text-gradient">{s.value}</p>
                                        <p className="text-[11px] text-slate-600 mt-0.5">{s.label}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Copyright — fixed at bottom */}
                        <p className="text-xs text-slate-700 flex-shrink-0">
                            © {new Date().getFullYear()} North South University · CTRG · SEPS
                        </p>
                    </div>
                </div>

                {/* ━━ Right Panel (Form) ━━ */}
                <div className="flex flex-1 items-center justify-center px-5 py-10 sm:px-10 overflow-y-auto"
                     style={{ background: 'linear-gradient(160deg, rgba(3,6,20,0.97) 0%, rgba(6,9,26,0.98) 40%, rgba(8,12,32,1) 100%)' }}>
                    <div className="w-full max-w-[420px] animate-slide-up">

                        <div className="mb-7 flex items-center gap-3 xl:hidden">
                            <div className="login-logo-icon" style={{ height: '36px', width: '36px' }}>
                                <GraduationCap className="h-4.5 w-4.5 text-white" />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-brand-400">NSU · CTRG</p>
                                <p className="text-sm font-semibold text-slate-800">Grant Portal</p>
                            </div>
                        </div>

                        <div className="text-center mb-4" aria-hidden="true">
                            <span className="text-[11px] font-mono text-slate-700 tracking-wider">
                                ∂(Research)/∂t = Σ(Review) + ε
                            </span>
                        </div>

                        <div className="login-form-card">
                            <div className="login-form-glow" />

                            <div className="relative z-10">
                                <div className="mb-7">
                                    <div className="flex items-center gap-2 mb-3">
                                        <BookOpen className="h-4 w-4 text-brand-400" />
                                        <p className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-brand-400">Welcome Back</p>
                                    </div>
                                    <h2 className="text-[22px] font-bold text-slate-800" style={{ letterSpacing: '-0.025em' }}>
                                        Sign in to continue
                                    </h2>
                                    <p className="mt-1.5 text-[13px] text-slate-500">
                                        This portal is for <span className="text-brand-400 font-medium">PIs</span>,{' '}
                                        <span className="text-cyan-400 font-medium">Reviewers</span>, and{' '}
                                        <span className="text-violet-400 font-medium">SRC Chair</span>. Use your institutional email and password.
                                    </p>
                                </div>

                                <form onSubmit={handleSubmit} className="space-y-5">
                                    {error && (
                                        <div role="alert" aria-live="assertive" className="rounded-xl px-4 py-3 text-sm font-medium"
                                             style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5' }}>
                                            {error}
                                        </div>
                                    )}

                                    <div>
                                        <label htmlFor="login-email" className="mb-2 block text-[13px] font-semibold text-slate-400">Email</label>
                                        <div className="relative">
                                            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600" aria-hidden="true" />
                                            <input
                                                id="login-email"
                                                type="email"
                                                autoComplete="email"
                                                placeholder="researcher@nsu.edu"
                                                className="input has-icon-left"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label htmlFor="login-password" className="mb-2 block text-[13px] font-semibold text-slate-400">Password</label>
                                        <div className="relative">
                                            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600" aria-hidden="true" />
                                            <input
                                                id="login-password"
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
                                                aria-label={showPw ? 'Hide password' : 'Show password'}
                                                aria-pressed={showPw}
                                                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-600 transition-colors hover:text-slate-300"
                                            >
                                                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                            </button>
                                        </div>
                                    </div>

                                    <p className="text-right text-[12.5px] text-slate-600">
                                        Forgot password? Contact your administrator.
                                    </p>

                                    <div className="login-submit-wrap">
                                        <button type="submit" disabled={loading} className="login-submit-btn">
                                            {loading ? (
                                                <>
                                                    <span className="login-submit-icon">
                                                        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                                            <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                                                            <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                                        </svg>
                                                    </span>
                                                    <span className="login-submit-label">Authenticating...</span>
                                                    <span className="login-submit-arrow" style={{ opacity: 0.3 }}>
                                                        <ArrowRight className="h-4 w-4" />
                                                    </span>
                                                </>
                                            ) : (
                                                <>
                                                    <span className="login-submit-icon">
                                                        <FlaskConical className="h-[18px] w-[18px]" aria-hidden="true" />
                                                    </span>
                                                    <span className="login-submit-label">Enter Research Portal</span>
                                                    <span className="login-submit-arrow">
                                                        <ArrowRight className="h-[18px] w-[18px]" aria-hidden="true" />
                                                    </span>
                                                </>
                                            )}
                                        </button>
                                    </div>

                                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px' }}>
                                        <p className="text-center text-[12.5px] text-slate-600">
                                            Principal Investigator?{' '}
                                            <button type="button" onClick={() => navigate('/register-pi')} className="font-semibold text-brand-400 hover:text-brand-300 transition-colors">
                                                Register as PI
                                            </button>
                                        </p>
                                        <p className="mt-2 text-center text-[12.5px] text-slate-600">
                                            Reviewer accounts are created by invitation only.
                                        </p>
                                    </div>
                                </form>
                            </div>
                        </div>

                        <div className="mt-5 flex items-center justify-center gap-3" aria-hidden="true">
                            <span className="h-px w-10" style={{ background: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.3))' }} />
                            <span className="text-[10px] font-mono text-slate-700 tracking-wider">CTRG · SEPS · NSU</span>
                            <span className="h-px w-10" style={{ background: 'linear-gradient(90deg, rgba(99,102,241,0.3), transparent)' }} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;

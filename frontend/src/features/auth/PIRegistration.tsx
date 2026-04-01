import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FlaskConical, Mail, Lock, Eye, EyeOff, User, ArrowLeft } from 'lucide-react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const PIRegistration: React.FC = () => {
    const navigate = useNavigate();
    const [form, setForm] = useState({
        first_name: '',
        last_name: '',
        username: '',
        email: '',
        password: '',
        confirmPassword: '',
    });
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
        setError('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (form.password !== form.confirmPassword) {
            setError('Passwords do not match.');
            return;
        }
        if (form.password.length < 8) {
            setError('Password must be at least 8 characters.');
            return;
        }
        setSubmitting(true);
        try {
            await axios.post(`${API_URL}/auth/register-pi/`, {
                first_name: form.first_name,
                last_name: form.last_name,
                username: form.username,
                email: form.email,
                password: form.password,
                role: 'PI',
            });
            alert('Account created successfully! You can now log in.');
            navigate('/login');
        } catch (err: any) {
            const data = err.response?.data;
            if (data && typeof data === 'object') {
                const msgs = Object.entries(data)
                    .map(([f, v]) => `${f}: ${Array.isArray(v) ? v[0] : v}`)
                    .join('\n');
                setError(msgs);
            } else {
                setError('Registration failed. Please try again.');
            }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="app-background relative min-h-screen overflow-hidden bg-[#ecf1f7]">
            <div className="pointer-events-none absolute inset-0">
                <div className="absolute left-[-180px] top-[-120px] h-[360px] w-[360px] rounded-full bg-[radial-gradient(circle,_rgba(30,42,74,0.22)_0%,_rgba(30,42,74,0)_70%)]" />
                <div className="absolute right-[-140px] top-[90px] h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle,_rgba(212,160,23,0.16)_0%,_rgba(212,160,23,0)_72%)]" />
            </div>

            <div className="relative mx-auto flex min-h-screen max-w-[1240px] items-center px-4 py-8 sm:px-6 lg:px-8">
                <div className="grid w-full gap-6 lg:grid-cols-[0.92fr_1.08fr]">
                    {/* Left panel */}
                    <section className="relative overflow-hidden rounded-[32px] border border-[#1e2a4a]/10 bg-[linear-gradient(155deg,#111b34_0%,#1e2a4a_50%,#30446f_100%)] p-6 text-white shadow-[0_26px_60px_rgba(15,23,42,0.26)] sm:p-8 lg:p-10">
                        <div className="absolute inset-0 opacity-[0.14]" style={{ backgroundImage: 'linear-gradient(to right, rgba(255,255,255,0.18) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.18) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
                        <div className="relative z-10 flex h-full flex-col">
                            <button onClick={() => navigate('/login')} className="inline-flex items-center gap-2 self-start rounded-full border border-slate-300 bg-white/8 px-4 py-2 text-sm font-medium text-white/90 transition hover:bg-white/14">
                                <ArrowLeft size={16} /> Back to Login
                            </button>
                            <div className="mt-8">
                                <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl border border-[#d4a017]/80 bg-[#d4a017]/10">
                                    <FlaskConical size={30} className="text-[#f4ca5b]" />
                                </div>
                                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#f3d27d]">Principal Investigator</p>
                                <h1 className="mt-3 font-serif text-4xl leading-tight text-white sm:text-5xl">Create your PI account.</h1>
                                <p className="mt-4 max-w-[26rem] text-sm leading-7 text-[#d5dff5] sm:text-base">
                                    Register as a Principal Investigator to submit and manage research grant proposals through the CTRG portal.
                                </p>
                            </div>
                            <div className="mt-8 grid gap-4 sm:grid-cols-2">
                                <div className="rounded-2xl border border-white/16 bg-white/8 p-4 backdrop-blur-sm">
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#f1d27e]">Step 1</p>
                                    <p className="mt-2 text-sm font-semibold text-white">Create account</p>
                                    <p className="mt-2 text-xs leading-6 text-[#d7e1f6]">Fill in your details and set a secure password.</p>
                                </div>
                                <div className="rounded-2xl border border-white/16 bg-white/8 p-4 backdrop-blur-sm">
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#f1d27e]">Step 2</p>
                                    <p className="mt-2 text-sm font-semibold text-white">Submit proposals</p>
                                    <p className="mt-2 text-xs leading-6 text-[#d7e1f6]">Log in and start submitting research grant proposals.</p>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Right panel — form */}
                    <section className="flex items-center justify-center">
                        <div className="w-full max-w-[760px]">
                            <div className="surface-glass overflow-hidden rounded-[32px] border border-white/70 shadow-[0_24px_60px_rgba(15,23,42,0.14)]">
                                <div className="border-b border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.88)_0%,rgba(248,250,252,0.92)_100%)] px-6 py-6 sm:px-8">
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7b89a5]">Self Registration</p>
                                    <h2 className="mt-2 font-serif text-3xl leading-tight text-[#1b2747] sm:text-4xl">PI Account</h2>
                                    <p className="mt-3 text-sm leading-6 text-[#5f6e8b]">Use your institutional email to register.</p>
                                </div>

                                <div className="px-6 py-6 sm:px-8 sm:py-8">
                                    {error && (
                                        <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
                                            <p className="text-sm text-rose-700 whitespace-pre-line">{error}</p>
                                        </div>
                                    )}

                                    <form onSubmit={handleSubmit} className="space-y-5">
                                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                            <div>
                                                <label className="mb-2 block text-sm font-semibold text-[#384867]">First Name</label>
                                                <div className="relative">
                                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7f8ca8]" size={18} />
                                                    <input type="text" name="first_name" required value={form.first_name} onChange={handleChange}
                                                        placeholder="John"
                                                        className="input has-icon-left rounded-xl border-[#cbd5e5] bg-[#f8fafd] text-[#1d2b4d] placeholder:text-[#90a0bd] focus:border-[#1e2a4a] focus:bg-white" />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="mb-2 block text-sm font-semibold text-[#384867]">Last Name</label>
                                                <div className="relative">
                                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7f8ca8]" size={18} />
                                                    <input type="text" name="last_name" required value={form.last_name} onChange={handleChange}
                                                        placeholder="Doe"
                                                        className="input has-icon-left rounded-xl border-[#cbd5e5] bg-[#f8fafd] text-[#1d2b4d] placeholder:text-[#90a0bd] focus:border-[#1e2a4a] focus:bg-white" />
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="mb-2 block text-sm font-semibold text-[#384867]">Username</label>
                                            <div className="relative">
                                                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7f8ca8]" size={18} />
                                                <input type="text" name="username" required value={form.username} onChange={handleChange}
                                                    placeholder="john.doe"
                                                    className="input has-icon-left rounded-xl border-[#cbd5e5] bg-[#f8fafd] text-[#1d2b4d] placeholder:text-[#90a0bd] focus:border-[#1e2a4a] focus:bg-white" />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="mb-2 block text-sm font-semibold text-[#384867]">Institutional Email</label>
                                            <div className="relative">
                                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7f8ca8]" size={18} />
                                                <input type="email" name="email" required value={form.email} onChange={handleChange}
                                                    placeholder="john.doe@nsu.edu"
                                                    className="input has-icon-left rounded-xl border-[#cbd5e5] bg-[#f8fafd] text-[#1d2b4d] placeholder:text-[#90a0bd] focus:border-[#1e2a4a] focus:bg-white" />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                            <div>
                                                <label className="mb-2 block text-sm font-semibold text-[#384867]">Password</label>
                                                <div className="relative">
                                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7f8ca8]" size={18} />
                                                    <input type={showPassword ? 'text' : 'password'} name="password" required value={form.password} onChange={handleChange}
                                                        placeholder="Min. 8 characters"
                                                        className="input has-icon-left has-icon-right rounded-xl border-[#cbd5e5] bg-[#f8fafd] text-[#1d2b4d] placeholder:text-[#90a0bd] focus:border-[#1e2a4a] focus:bg-white" />
                                                    <button type="button" onClick={() => setShowPassword(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7b89a6]">
                                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                                    </button>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="mb-2 block text-sm font-semibold text-[#384867]">Confirm Password</label>
                                                <div className="relative">
                                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7f8ca8]" size={18} />
                                                    <input type={showConfirm ? 'text' : 'password'} name="confirmPassword" required value={form.confirmPassword} onChange={handleChange}
                                                        placeholder="Repeat password"
                                                        className="input has-icon-left has-icon-right rounded-xl border-[#cbd5e5] bg-[#f8fafd] text-[#1d2b4d] placeholder:text-[#90a0bd] focus:border-[#1e2a4a] focus:bg-white" />
                                                    <button type="button" onClick={() => setShowConfirm(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7b89a6]">
                                                        {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        <button type="submit" disabled={submitting}
                                            className="btn w-full rounded-xl border border-[#1e2a4a] bg-[linear-gradient(140deg,#1e2a4a_0%,#2a3a5f_100%)] py-3 text-base font-bold text-white shadow-[0_14px_26px_rgba(30,42,74,0.32)] transition-all hover:brightness-110 disabled:opacity-70 disabled:cursor-not-allowed">
                                            {submitting ? 'Creating account...' : 'Create PI Account'}
                                        </button>

                                        <div className="border-t border-[#e7edf5] pt-5 text-center text-sm text-[#5f6e8b]">
                                            Already have an account?{' '}
                                            <button type="button" onClick={() => navigate('/login')}
                                                className="font-semibold text-[#1e2a4a] underline decoration-[#d4a017] decoration-2 underline-offset-4 hover:text-[#b8850c]">
                                                Sign In
                                            </button>
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

export default PIRegistration;

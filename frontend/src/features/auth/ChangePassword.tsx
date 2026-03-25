/**
 * Change Password Component.
 * Allows any authenticated user to change their password.
 */
import React, { useState } from 'react';
import { Key, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';
import { authApi } from '../../services/api';

const ChangePassword: React.FC = () => {
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showOld, setShowOld] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(false);

        if (newPassword !== confirmPassword) {
            setError('New passwords do not match.');
            return;
        }
        if (newPassword.length < 8) {
            setError('Password must be at least 8 characters.');
            return;
        }

        try {
            setLoading(true);
            await authApi.changePassword(oldPassword, newPassword);
            setSuccess(true);
            setOldPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err: any) {
            const msg = err.response?.data?.error
                || err.response?.data?.old_password?.[0]
                || err.response?.data?.new_password?.[0]
                || 'Failed to change password.';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full max-w-[32rem] mx-auto">
            <div className="w-full rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_10px_24px_rgba(15,23,42,0.08)]">
                <div className="flex items-center gap-3 mb-6">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[linear-gradient(140deg,#1e2a4a_0%,#2a3a5f_100%)]">
                        <Key size={20} className="text-white" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>Change Password</h2>
                        <p className="text-sm text-slate-500">Update your account password</p>
                    </div>
                </div>

                {success && (
                    <div className="mb-4 flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
                        <CheckCircle size={18} className="flex-shrink-0" />
                        Password changed successfully.
                    </div>
                )}

                {error && (
                    <div role="alert" className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                        <AlertCircle size={18} className="flex-shrink-0" />
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-700">Current Password</label>
                        <div className="relative w-full">
                            <input
                                type={showOld ? 'text' : 'password'}
                                value={oldPassword}
                                onChange={(e) => setOldPassword(e.target.value)}
                                required
                                className="block w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 pr-10 text-sm text-slate-900 focus:border-[#1e2a4a] focus:ring-2 focus:ring-[#1e2a4a]/20 focus:outline-none"
                            />
                            <button
                                type="button"
                                onClick={() => setShowOld(!showOld)}
                                className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
                            >
                                {showOld ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-700">New Password</label>
                        <div className="relative w-full">
                            <input
                                type={showNew ? 'text' : 'password'}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                                minLength={8}
                                className="block w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 pr-10 text-sm text-slate-900 focus:border-[#1e2a4a] focus:ring-2 focus:ring-[#1e2a4a]/20 focus:outline-none"
                            />
                            <button
                                type="button"
                                onClick={() => setShowNew(!showNew)}
                                className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
                            >
                                {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>
                    {newPassword && (
                        <div className="text-xs text-slate-500 -mt-3 ml-1 space-y-0.5">
                            <p className={newPassword.length >= 8 ? 'text-green-600' : 'text-red-500'}>
                                {newPassword.length >= 8 ? '\u2713' : '\u2717'} At least 8 characters
                            </p>
                            <p className={/[A-Z]/.test(newPassword) ? 'text-green-600' : 'text-slate-400'}>
                                {/[A-Z]/.test(newPassword) ? '\u2713' : '\u2717'} Uppercase letter (recommended)
                            </p>
                            <p className={/[0-9]/.test(newPassword) ? 'text-green-600' : 'text-slate-400'}>
                                {/[0-9]/.test(newPassword) ? '\u2713' : '\u2717'} Number (recommended)
                            </p>
                        </div>
                    )}

                    <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-700">Confirm New Password</label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            className="block w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-[#1e2a4a] focus:ring-2 focus:ring-[#1e2a4a]/20 focus:outline-none"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full rounded-xl bg-[linear-gradient(140deg,#1e2a4a_0%,#2a3a5f_100%)] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(30,42,74,0.28)] transition hover:brightness-110 disabled:opacity-50"
                    >
                        {loading ? 'Changing...' : 'Change Password'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ChangePassword;

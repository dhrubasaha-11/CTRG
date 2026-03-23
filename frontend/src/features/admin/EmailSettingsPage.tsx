import { useEffect, useState } from 'react';
import { Mail, Send, CheckCircle, XCircle, AlertCircle, Settings, RefreshCw } from 'lucide-react';
import { authApi } from '../../services/api';

interface EmailConfig {
    backend: string;
    is_smtp: boolean;
    host: string;
    port: number;
    use_tls: boolean;
    from_email: string;
    user_configured: boolean;
}

export default function EmailSettingsPage() {
    const [config, setConfig] = useState<EmailConfig | null>(null);
    const [loading, setLoading] = useState(true);
    const [recipient, setRecipient] = useState('');
    const [sending, setSending] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

    const fetchConfig = async () => {
        setLoading(true);
        try {
            const res = await authApi.getEmailConfig();
            setConfig(res.data);
        } catch {
            setConfig(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchConfig(); }, []);

    const handleSendTest = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!recipient.trim()) return;
        setSending(true);
        setTestResult(null);
        try {
            const res = await authApi.sendTestEmail(recipient.trim());
            setTestResult({
                success: true,
                message: res.data.note || `Test email sent to ${res.data.sent_to}.`,
            });
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
                || 'Failed to send test email. Check the SMTP settings below.';
            setTestResult({ success: false, message: msg });
        } finally {
            setSending(false);
        }
    };

    const smtpInstructions = [
        { label: 'EMAIL_BACKEND', value: 'django.core.mail.backends.smtp.EmailBackend' },
        { label: 'EMAIL_HOST', value: 'smtp.gmail.com  (or your NSU mail server)' },
        { label: 'EMAIL_PORT', value: '587' },
        { label: 'EMAIL_USE_TLS', value: 'True' },
        { label: 'EMAIL_HOST_USER', value: 'your-email@nsu.edu' },
        { label: 'EMAIL_HOST_PASSWORD', value: 'your-app-password' },
        { label: 'DEFAULT_FROM_EMAIL', value: 'CTRG Grant System <noreply@nsu.edu>' },
    ];

    return (
        <div className="space-y-6 max-w-3xl">
            <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg" style={{ background: 'rgba(99,102,241,0.1)' }}>
                    <Mail size={22} className="text-indigo-400" />
                </div>
                <div>
                    <h1 className="text-xl font-semibold text-slate-800">Email Configuration</h1>
                    <p className="text-sm text-slate-500">Manage SMTP settings and send test emails</p>
                </div>
                <button onClick={fetchConfig} className="ml-auto p-2 rounded-lg hover:bg-slate-100 text-slate-500" title="Refresh">
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                </button>
            </div>

            {/* Current Status */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <h2 className="font-semibold text-slate-700 mb-4 flex items-center gap-2">
                    <Settings size={16} /> Current Status
                </h2>
                {loading ? (
                    <div className="text-slate-400 text-sm">Loading configuration…</div>
                ) : config ? (
                    <div className="space-y-3">
                        <div className="flex items-center gap-3">
                            {config.is_smtp ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-50 border border-green-200 text-green-700 text-sm font-medium">
                                    <CheckCircle size={14} /> SMTP Active
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-sm font-medium">
                                    <AlertCircle size={14} /> Console Backend (emails print to server log, not sent)
                                </span>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm mt-3">
                            <div className="text-slate-500">Backend</div>
                            <div className="text-slate-800 font-mono text-xs break-all">{config.backend}</div>
                            {config.is_smtp && (
                                <>
                                    <div className="text-slate-500">SMTP Host</div>
                                    <div className="text-slate-800">{config.host}:{config.port}</div>
                                    <div className="text-slate-500">TLS</div>
                                    <div className="text-slate-800">{config.use_tls ? 'Enabled' : 'Disabled'}</div>
                                    <div className="text-slate-500">Credentials</div>
                                    <div className={config.user_configured ? 'text-green-600' : 'text-amber-600'}>
                                        {config.user_configured ? 'Configured' : 'Not set'}
                                    </div>
                                </>
                            )}
                            <div className="text-slate-500">From Address</div>
                            <div className="text-slate-800">{config.from_email}</div>
                        </div>
                    </div>
                ) : (
                    <div className="text-red-500 text-sm">Could not load email configuration.</div>
                )}
            </div>

            {/* Send Test Email */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <h2 className="font-semibold text-slate-700 mb-4 flex items-center gap-2">
                    <Send size={16} /> Send Test Email
                </h2>
                <p className="text-sm text-slate-500 mb-4">
                    Send a test email to verify your configuration. If using the console backend, the email will appear in the server logs instead of being delivered.
                </p>
                <form onSubmit={handleSendTest} className="flex gap-3">
                    <input
                        type="email"
                        placeholder="recipient@example.com"
                        value={recipient}
                        onChange={e => setRecipient(e.target.value)}
                        required
                        className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400"
                    />
                    <button
                        type="submit"
                        disabled={sending || !recipient.trim()}
                        className="px-4 py-2 rounded-lg text-sm font-medium text-white flex items-center gap-2 disabled:opacity-50"
                        style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)' }}
                    >
                        {sending ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
                        {sending ? 'Sending…' : 'Send Test'}
                    </button>
                </form>

                {testResult && (
                    <div className={`mt-4 flex items-start gap-2 p-3 rounded-lg text-sm ${
                        testResult.success
                            ? 'bg-green-50 border border-green-200 text-green-700'
                            : 'bg-red-50 border border-red-200 text-red-700'
                    }`}>
                        {testResult.success
                            ? <CheckCircle size={16} className="mt-0.5 flex-shrink-0" />
                            : <XCircle size={16} className="mt-0.5 flex-shrink-0" />}
                        {testResult.message}
                    </div>
                )}
            </div>

            {/* SMTP Setup Guide */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <h2 className="font-semibold text-slate-700 mb-1 flex items-center gap-2">
                    <Settings size={16} /> How to Configure Real Email (SMTP)
                </h2>
                <p className="text-sm text-slate-500 mb-4">
                    Update the following environment variables in the <code className="bg-slate-100 px-1 rounded text-xs">backend/.env</code> file to enable real email delivery:
                </p>
                <div className="rounded-lg border border-slate-200 overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="text-left px-4 py-2 font-medium text-slate-600">Variable</th>
                                <th className="text-left px-4 py-2 font-medium text-slate-600">Value</th>
                            </tr>
                        </thead>
                        <tbody>
                            {smtpInstructions.map((row, i) => (
                                <tr key={row.label} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                                    <td className="px-4 py-2 font-mono text-xs text-indigo-700">{row.label}</td>
                                    <td className="px-4 py-2 text-slate-700 text-xs">{row.value}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="mt-4 p-3 rounded-lg bg-blue-50 border border-blue-200 text-sm text-blue-700">
                    <strong>NSU Mail Server:</strong> Contact ICT Division for the NSU SMTP host address and credentials. For Gmail, generate an App Password under Google Account → Security → 2-Step Verification → App Passwords.
                </div>

                <div className="mt-4 p-3 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-600">
                    <strong>Automatic Deadline Enforcement:</strong> Run the following command daily to auto-flag missed revision deadlines:
                    <pre className="mt-2 font-mono text-xs bg-slate-100 p-2 rounded overflow-x-auto">python manage.py check_revision_deadlines</pre>
                    For production, schedule this with cron or a task scheduler.
                </div>
            </div>

            {/* Notification Summary */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <h2 className="font-semibold text-slate-700 mb-4">Automatic Email Notifications</h2>
                <div className="space-y-2">
                    {[
                        { event: 'Reviewer assigned to a proposal', recipient: 'Reviewer', status: 'active' },
                        { event: 'Stage 1 review reminder (48h before deadline)', recipient: 'Reviewer', status: 'active' },
                        { event: 'Stage 1 decision — Rejected', recipient: 'PI', status: 'active' },
                        { event: 'Stage 1 decision — Accepted (no corrections)', recipient: 'PI', status: 'active' },
                        { event: 'Revision requested (tentatively accepted)', recipient: 'PI', status: 'active' },
                        { event: 'Revision deadline missed', recipient: 'PI', status: 'active' },
                        { event: 'Final decision (accepted or rejected)', recipient: 'PI', status: 'active' },
                        { event: 'Chair emails reviewers with proposal details', recipient: 'Reviewer(s)', status: 'manual' },
                    ].map(row => (
                        <div key={row.event} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                            <div>
                                <div className="text-sm text-slate-700">{row.event}</div>
                                <div className="text-xs text-slate-400">Recipient: {row.recipient}</div>
                            </div>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                row.status === 'active'
                                    ? 'bg-green-50 text-green-700 border border-green-200'
                                    : 'bg-blue-50 text-blue-700 border border-blue-200'
                            }`}>
                                {row.status === 'active' ? 'Automatic' : 'Manual'}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

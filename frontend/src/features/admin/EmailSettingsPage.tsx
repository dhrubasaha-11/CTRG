import { useEffect, useState, useCallback } from 'react';
import {
    Mail, Send, CheckCircle, XCircle, Settings,
    RefreshCw, Save, ChevronDown, ChevronUp, ExternalLink,
} from 'lucide-react';
import { authApi, type EmailConfig, type NotificationLog } from '../../services/api';

export default function EmailSettingsPage() {
    // SMTP config state
    const [config, setConfig] = useState<EmailConfig | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saveMsg, setSaveMsg] = useState<{ ok: boolean; text: string } | null>(null);

    // Form fields
    const [form, setForm] = useState({
        smtp_host: '',
        smtp_port: 587,
        smtp_username: '',
        smtp_password: '',
        use_tls: true,
        from_email: '',
        from_name: 'CTRG Grant System',
        is_active: false,
    });

    // Test email state
    const [recipient, setRecipient] = useState('');
    const [sending, setSending] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

    // Notification logs state
    const [logs, setLogs] = useState<NotificationLog[]>([]);
    const [logsLoading, setLogsLoading] = useState(false);
    const [logsPage, setLogsPage] = useState(1);
    const [logsHasMore, setLogsHasMore] = useState(false);
    const [expandedLogId, setExpandedLogId] = useState<number | null>(null);

    // Active tab
    const [activeTab, setActiveTab] = useState<'settings' | 'logs'>('settings');

    const fetchConfig = useCallback(async () => {
        setLoading(true);
        try {
            const res = await authApi.getEmailConfig();
            const data = res.data;
            setConfig(data);
            setForm({
                smtp_host: data.smtp_host || '',
                smtp_port: data.smtp_port || 587,
                smtp_username: data.smtp_username || '',
                smtp_password: '', // never returned from backend
                use_tls: data.use_tls ?? true,
                from_email: data.from_email || '',
                from_name: data.from_name || 'CTRG Grant System',
                is_active: data.is_active ?? false,
            });
        } catch {
            setConfig(null);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchLogs = useCallback(async (page = 1) => {
        setLogsLoading(true);
        try {
            const res = await authApi.getNotificationLogs({ page });
            const data = res.data;
            // Handle both paginated and array responses
            const items = Array.isArray(data) ? data : (data as any).results ?? data;
            const pagination = (res as any).pagination;
            setLogs(items);
            setLogsPage(page);
            setLogsHasMore(pagination?.next != null);
        } catch {
            setLogs([]);
        } finally {
            setLogsLoading(false);
        }
    }, []);

    useEffect(() => { fetchConfig(); }, [fetchConfig]);
    useEffect(() => {
        if (activeTab === 'logs') fetchLogs(1);
    }, [activeTab, fetchLogs]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setSaveMsg(null);
        try {
            const payload: Record<string, unknown> = { ...form };
            // Only send password if user typed something
            if (!form.smtp_password) {
                delete payload.smtp_password;
            }
            await authApi.updateEmailConfig(payload as any);
            setSaveMsg({ ok: true, text: 'Settings saved successfully.' });
            await fetchConfig();
        } catch (err: unknown) {
            const msg = (err as any)?.response?.data?.detail
                || (err as any)?.response?.data?.error
                || 'Failed to save settings.';
            setSaveMsg({ ok: false, text: typeof msg === 'string' ? msg : JSON.stringify(msg) });
        } finally {
            setSaving(false);
        }
    };

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
            // Refresh logs if on that tab
            if (activeTab === 'logs') fetchLogs(1);
        } catch (err: unknown) {
            const msg = (err as any)?.response?.data?.error || 'Failed to send test email.';
            setTestResult({ success: false, message: msg });
        } finally {
            setSending(false);
        }
    };

    const updateField = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
        setForm(prev => ({ ...prev, [key]: value }));
    };

    return (
        <div className="space-y-6 max-w-4xl">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg" style={{ background: 'rgba(99,102,241,0.1)' }}>
                    <Mail size={22} className="text-indigo-400" />
                </div>
                <div>
                    <h1 className="text-xl font-semibold text-slate-800">Email Configuration</h1>
                    <p className="text-sm text-slate-500">Manage SMTP settings, send test emails, and view notification logs</p>
                </div>
            </div>

            {/* Tab Switcher */}
            <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit">
                <button
                    onClick={() => setActiveTab('settings')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        activeTab === 'settings'
                            ? 'bg-white shadow-sm text-slate-800'
                            : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                    <Settings size={14} className="inline mr-1.5 -mt-0.5" />
                    SMTP Settings
                </button>
                <button
                    onClick={() => setActiveTab('logs')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        activeTab === 'logs'
                            ? 'bg-white shadow-sm text-slate-800'
                            : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                    <Mail size={14} className="inline mr-1.5 -mt-0.5" />
                    Notification Log
                </button>
            </div>

            {/* ============ SETTINGS TAB ============ */}
            {activeTab === 'settings' && (
                <>
                    {/* SMTP Configuration Form */}
                    <form onSubmit={handleSave} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="font-semibold text-slate-700 flex items-center gap-2">
                                <Settings size={16} /> SMTP Configuration
                            </h2>
                            <button
                                onClick={fetchConfig}
                                type="button"
                                className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"
                                title="Refresh"
                            >
                                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                            </button>
                        </div>

                        {loading ? (
                            <div className="text-slate-400 text-sm py-4">Loading configuration...</div>
                        ) : (
                            <div className="space-y-5">
                                {/* Active Toggle */}
                                <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={form.is_active}
                                            onChange={e => updateField('is_active', e.target.checked)}
                                            className="sr-only peer"
                                        />
                                        <div className="w-9 h-5 bg-slate-300 peer-focus:ring-2 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-indigo-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all"></div>
                                    </label>
                                    <div>
                                        <span className="text-sm font-medium text-slate-700">
                                            {form.is_active ? 'Database SMTP Active' : 'Using settings.py Fallback'}
                                        </span>
                                        <p className="text-xs text-slate-500">
                                            {form.is_active
                                                ? 'Emails will be sent using the SMTP settings below.'
                                                : `Emails use server config: ${config?.settings_is_console ? 'Console Backend' : config?.settings_host || 'default'}`
                                            }
                                        </p>
                                    </div>
                                </div>

                                {/* SMTP Fields */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-600 mb-1">SMTP Host</label>
                                        <input
                                            type="text"
                                            value={form.smtp_host}
                                            onChange={e => updateField('smtp_host', e.target.value)}
                                            placeholder="smtp.gmail.com"
                                            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-600 mb-1">SMTP Port</label>
                                        <input
                                            type="number"
                                            value={form.smtp_port}
                                            onChange={e => updateField('smtp_port', parseInt(e.target.value) || 587)}
                                            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-600 mb-1">Username</label>
                                        <input
                                            type="text"
                                            value={form.smtp_username}
                                            onChange={e => updateField('smtp_username', e.target.value)}
                                            placeholder="your-email@nsu.edu"
                                            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-600 mb-1">
                                            Password
                                            {config?.has_password && (
                                                <span className="ml-2 text-xs text-green-600 font-normal">(saved)</span>
                                            )}
                                        </label>
                                        <input
                                            type="password"
                                            value={form.smtp_password}
                                            onChange={e => updateField('smtp_password', e.target.value)}
                                            placeholder={config?.has_password ? '(unchanged — leave blank to keep)' : 'App password or SMTP password'}
                                            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400"
                                        />
                                        <p className="mt-1.5 text-xs text-slate-500">
                                            Using Gmail?{' '}
                                            <a
                                                href="https://myaccount.google.com/apppasswords"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-0.5 text-indigo-600 hover:text-indigo-800 hover:underline font-medium"
                                            >
                                                Generate an App Password here
                                                <ExternalLink size={11} className="ml-0.5" />
                                            </a>
                                            {' '}(requires 2-Step Verification enabled).
                                        </p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-600 mb-1">From Email</label>
                                        <input
                                            type="email"
                                            value={form.from_email}
                                            onChange={e => updateField('from_email', e.target.value)}
                                            placeholder="noreply@nsu.edu"
                                            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-600 mb-1">From Name</label>
                                        <input
                                            type="text"
                                            value={form.from_name}
                                            onChange={e => updateField('from_name', e.target.value)}
                                            placeholder="CTRG Grant System"
                                            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400"
                                        />
                                    </div>
                                </div>

                                {/* TLS Toggle */}
                                <div className="flex items-center gap-3">
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={form.use_tls}
                                            onChange={e => updateField('use_tls', e.target.checked)}
                                            className="sr-only peer"
                                        />
                                        <div className="w-9 h-5 bg-slate-300 peer-focus:ring-2 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-indigo-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all"></div>
                                    </label>
                                    <span className="text-sm text-slate-700">Use TLS (recommended for port 587)</span>
                                </div>

                                {/* Save Button + Result */}
                                <div className="flex items-center gap-4 pt-2">
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="px-5 py-2 rounded-lg text-sm font-medium text-white flex items-center gap-2 disabled:opacity-50"
                                        style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)' }}
                                    >
                                        {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                                        {saving ? 'Saving...' : 'Save Settings'}
                                    </button>
                                    {saveMsg && (
                                        <span className={`text-sm ${saveMsg.ok ? 'text-green-600' : 'text-red-600'}`}>
                                            {saveMsg.ok ? <CheckCircle size={14} className="inline mr-1" /> : <XCircle size={14} className="inline mr-1" />}
                                            {saveMsg.text}
                                        </span>
                                    )}
                                </div>
                            </div>
                        )}
                    </form>

                    {/* Send Test Email */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                        <h2 className="font-semibold text-slate-700 mb-4 flex items-center gap-2">
                            <Send size={16} /> Send Test Email
                        </h2>
                        <p className="text-sm text-slate-500 mb-4">
                            Send a test email to verify your configuration. Uses the saved DB config if active, otherwise falls back to server settings.
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
                                {sending ? 'Sending...' : 'Send Test'}
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

                    {/* Automatic Notifications Summary */}
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
                </>
            )}

            {/* ============ LOGS TAB ============ */}
            {activeTab === 'logs' && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-semibold text-slate-700 flex items-center gap-2">
                            <Mail size={16} /> Notification Log
                        </h2>
                        <button
                            onClick={() => fetchLogs(1)}
                            className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"
                            title="Refresh"
                        >
                            <RefreshCw size={14} className={logsLoading ? 'animate-spin' : ''} />
                        </button>
                    </div>

                    {logsLoading && logs.length === 0 ? (
                        <div className="text-slate-400 text-sm py-8 text-center">Loading notification logs...</div>
                    ) : logs.length === 0 ? (
                        <div className="text-slate-400 text-sm py-8 text-center">No notification logs yet.</div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-slate-200 text-left">
                                            <th className="pb-2 font-medium text-slate-600">Timestamp</th>
                                            <th className="pb-2 font-medium text-slate-600">Recipient</th>
                                            <th className="pb-2 font-medium text-slate-600">Subject</th>
                                            <th className="pb-2 font-medium text-slate-600">Type</th>
                                            <th className="pb-2 font-medium text-slate-600">Status</th>
                                            <th className="pb-2 font-medium text-slate-600 w-8"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {logs.map(log => (
                                            <>
                                                <tr
                                                    key={log.id}
                                                    className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer"
                                                    onClick={() => setExpandedLogId(expandedLogId === log.id ? null : log.id)}
                                                >
                                                    <td className="py-2.5 text-slate-600 text-xs whitespace-nowrap">
                                                        {new Date(log.sent_at).toLocaleString()}
                                                    </td>
                                                    <td className="py-2.5 text-slate-700">{log.recipient_email}</td>
                                                    <td className="py-2.5 text-slate-700 max-w-[200px] truncate">{log.subject}</td>
                                                    <td className="py-2.5">
                                                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                                                            {log.notification_type}
                                                        </span>
                                                    </td>
                                                    <td className="py-2.5">
                                                        {log.status === 'SUCCESS' ? (
                                                            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">
                                                                <CheckCircle size={10} /> Sent
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
                                                                <XCircle size={10} /> Failed
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="py-2.5 text-slate-400">
                                                        {expandedLogId === log.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                                    </td>
                                                </tr>
                                                {expandedLogId === log.id && (
                                                    <tr key={`${log.id}-detail`}>
                                                        <td colSpan={6} className="py-3 px-4 bg-slate-50 text-xs">
                                                            <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                                                                {log.proposal_code && (
                                                                    <>
                                                                        <span className="text-slate-500">Proposal:</span>
                                                                        <span className="text-slate-700">{log.proposal_code}</span>
                                                                    </>
                                                                )}
                                                                {log.trigger_event && (
                                                                    <>
                                                                        <span className="text-slate-500">Trigger:</span>
                                                                        <span className="text-slate-700">{log.trigger_event}</span>
                                                                    </>
                                                                )}
                                                                {log.error_message && (
                                                                    <>
                                                                        <span className="text-slate-500">Error:</span>
                                                                        <span className="text-red-600 break-all">{log.error_message}</span>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-200">
                                <button
                                    onClick={() => fetchLogs(logsPage - 1)}
                                    disabled={logsPage <= 1 || logsLoading}
                                    className="px-3 py-1.5 text-sm rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                                >
                                    Previous
                                </button>
                                <span className="text-sm text-slate-500">Page {logsPage}</span>
                                <button
                                    onClick={() => fetchLogs(logsPage + 1)}
                                    disabled={!logsHasMore || logsLoading}
                                    className="px-3 py-1.5 text-sm rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                                >
                                    Next
                                </button>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

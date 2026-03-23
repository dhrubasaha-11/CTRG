import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Mail, AlertCircle, Check } from 'lucide-react';
import { reviewerApi, type Reviewer } from '../../services/api';

interface Props {
    reviewers: Reviewer[];
    onClose: () => void;
    onSuccess: () => void;
}

const EmailReviewersModal: React.FC<Props> = ({ reviewers, onClose, onSuccess }) => {
    const [subject, setSubject] = useState('Review Assignment Reminder - Pending Proposals');
    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<{ sent_count: number; failed_count: number } | null>(null);

    const handleSend = async () => {
        try {
            setSending(true);
            setError(null);
            const reviewerIds = reviewers.map(r => r.user);
            const response = await reviewerApi.emailReviewers(
                reviewerIds,
                subject || undefined,
                message || undefined
            );
            setResult(response.data);
        } catch (err: any) {
            const data = err.response?.data;
            if (data && typeof data === 'object' && !data.sent_count) {
                const messages = Object.entries(data)
                    .map(([field, errors]) => `${field}: ${Array.isArray(errors) ? errors.join(', ') : errors}`)
                    .join('; ');
                setError(messages || 'Failed to send emails');
            } else {
                setError(err.message || 'Failed to send emails');
            }
        } finally {
            setSending(false);
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="w-[min(640px,calc(100vw-2rem))] max-h-[90vh] overflow-hidden rounded-2xl  shadow-2xl">
                {/* Header */}
                <div className="p-6 border-b  bg-gradient-to-r from-emerald-600 to-teal-600">
                    <div className="flex justify-between items-start">
                        <div className="text-white">
                            <h2 className="text-xl font-semibold">Email Reviewers</h2>
                            <p className="text-emerald-100 text-sm mt-1">
                                {reviewers.length} reviewer{reviewers.length !== 1 ? 's' : ''} selected
                            </p>
                        </div>
                        <button onClick={onClose} className="text-white/80 hover:text-white">
                            <X size={24} />
                        </button>
                    </div>
                </div>

                <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center text-red-700">
                            <AlertCircle size={18} className="mr-2 flex-shrink-0" />
                            {error}
                        </div>
                    )}

                    {result ? (
                        <div className="text-center py-6">
                            <div className="mx-auto w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
                                <Check size={24} className="text-emerald-600" />
                            </div>
                            <h3 className="text-base font-semibold text-slate-200 mb-2">Emails Sent</h3>
                            <p className="text-slate-500">
                                Successfully sent to {result.sent_count} reviewer{result.sent_count !== 1 ? 's' : ''}.
                                {result.failed_count > 0 && (
                                    <span className="text-red-400 block mt-1">
                                        {result.failed_count} failed.
                                    </span>
                                )}
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* Recipients */}
                            <div className="mb-5">
                                <label className="block text-sm font-medium text-slate-400 mb-2">Recipients</label>
                                <div className="flex flex-wrap gap-2 p-3  border  rounded-lg max-h-28 overflow-y-auto">
                                    {reviewers.map((r) => (
                                        <span
                                            key={r.id}
                                            className="inline-flex items-center px-2.5 py-1  border border-gray-300 rounded-full text-sm text-slate-400"
                                        >
                                            <Mail size={12} className="mr-1.5 text-slate-600" />
                                            {r.user_name}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Subject */}
                            <div className="mb-5">
                                <label className="block text-sm font-medium text-slate-400 mb-2">Subject</label>
                                <input
                                    type="text"
                                    value={subject}
                                    onChange={(e) => setSubject(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                />
                            </div>

                            {/* Custom Message */}
                            <div className="mb-5">
                                <label className="block text-sm font-medium text-slate-400 mb-2">
                                    Additional Message from SRC Chair
                                    <span className="font-normal text-slate-600 ml-1">(optional)</span>
                                </label>
                                <textarea
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    rows={4}
                                    placeholder="Add a personal note that will be included at the top of the email..."
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
                                />
                            </div>

                            {/* Info Note */}
                            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700">
                                Each reviewer will receive a personalized email with their pending proposal assignments (title, code, stage, and deadline).
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t   flex justify-end space-x-3">
                    {result ? (
                        <button
                            type="button"
                            onClick={onSuccess}
                            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                        >
                            Close
                        </button>
                    ) : (
                        <>
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 border border-gray-300 text-slate-400 rounded-lg hover:bg-gray-100"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSend}
                                disabled={sending}
                                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                            >
                                {sending ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                        Sending...
                                    </>
                                ) : (
                                    <>
                                        <Mail size={16} className="mr-2" />
                                        Send Email
                                    </>
                                )}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
};

export default EmailReviewersModal;

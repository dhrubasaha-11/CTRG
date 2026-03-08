/**
 * Audit Log Viewer for SRC Chair.
 * Displays audit trail with filtering by action type and proposal.
 */
import React, { useState, useEffect } from 'react';
import { Shield, Filter, ChevronLeft, ChevronRight, Clock, User, FileText } from 'lucide-react';
import { auditApi, type AuditLogEntry } from '../../services/api';

const ACTION_TYPES = [
    { value: '', label: 'All Actions' },
    { value: 'PROPOSAL_SUBMITTED', label: 'Proposal Submitted' },
    { value: 'REVISION_SUBMITTED', label: 'Revision Submitted' },
    { value: 'STAGE1_DECISION_MADE', label: 'Stage 1 Decision' },
    { value: 'STAGE2_REVIEW_STARTED', label: 'Stage 2 Started' },
    { value: 'FINAL_DECISION_MADE', label: 'Final Decision' },
    { value: 'REVIEWER_ASSIGNED', label: 'Reviewer Assigned' },
    { value: 'REVISION_DEADLINE_MISSED', label: 'Deadline Missed' },
];

const ACTION_COLORS: Record<string, string> = {
    PROPOSAL_SUBMITTED: 'bg-blue-100 text-blue-800',
    REVISION_SUBMITTED: 'bg-purple-100 text-purple-800',
    STAGE1_DECISION_MADE: 'bg-yellow-100 text-yellow-800',
    STAGE2_REVIEW_STARTED: 'bg-cyan-100 text-cyan-800',
    FINAL_DECISION_MADE: 'bg-green-100 text-green-800',
    REVIEWER_ASSIGNED: 'bg-indigo-100 text-indigo-800',
    REVISION_DEADLINE_MISSED: 'bg-red-100 text-red-800',
};

const AuditLogViewer: React.FC = () => {
    const [logs, setLogs] = useState<AuditLogEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionFilter, setActionFilter] = useState('');
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);

    useEffect(() => {
        loadLogs();
    }, [actionFilter, page]);

    const loadLogs = async () => {
        try {
            setLoading(true);
            const params: Record<string, any> = { page };
            if (actionFilter) params.action_type = actionFilter;
            const response = await auditApi.getAll(params);
            const data = Array.isArray(response.data) ? response.data : [];
            setLogs(data);
            setHasMore((response as any).pagination?.next != null);
        } catch {
            setLogs([]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
                    <p className="text-gray-500 mt-1">Track all system activities and changes</p>
                </div>
                <Shield size={24} className="text-gray-400" />
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <div className="flex items-center gap-4">
                    <Filter size={18} className="text-gray-400" />
                    <select
                        value={actionFilter}
                        onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                        {ACTION_TYPES.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Logs Table */}
            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Proposal</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IP Address</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {logs.map(log => (
                                <tr key={log.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center text-sm text-gray-900">
                                            <Clock size={14} className="mr-2 text-gray-400" />
                                            {new Date(log.timestamp).toLocaleString()}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${ACTION_COLORS[log.action_type] || 'bg-gray-100 text-gray-800'}`}>
                                            {log.action_type.replace(/_/g, ' ')}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center text-sm text-gray-700">
                                            <User size={14} className="mr-2 text-gray-400" />
                                            {log.user || 'System'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {log.proposal ? (
                                            <div className="flex items-center text-sm text-blue-600">
                                                <FileText size={14} className="mr-1" />
                                                #{log.proposal}
                                            </div>
                                        ) : (
                                            <span className="text-sm text-gray-400">-</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {log.ip_address || '-'}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-xs text-gray-500 max-w-xs truncate">
                                            {log.details && Object.keys(log.details).length > 0
                                                ? JSON.stringify(log.details)
                                                : '-'
                                            }
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {logs.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                        No audit logs found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Pagination */}
            <div className="flex justify-between items-center">
                <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <ChevronLeft size={16} className="mr-1" /> Previous
                </button>
                <span className="text-sm text-gray-600">Page {page}</span>
                <button
                    onClick={() => setPage(p => p + 1)}
                    disabled={!hasMore}
                    className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Next <ChevronRight size={16} className="ml-1" />
                </button>
            </div>
        </div>
    );
};

export default AuditLogViewer;

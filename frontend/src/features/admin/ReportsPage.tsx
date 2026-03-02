/**
 * Reports Page for SRC Chair.
 * Generates proposal-wise PDF/DOCX reports and cycle summary reports.
 */
import React, { useState, useEffect } from 'react';
import { Download, FileText, BarChart3, RefreshCw } from 'lucide-react';
import { proposalApi, cycleApi, type Proposal, type GrantCycle } from '../../services/api';

const ReportsPage: React.FC = () => {
    const [proposals, setProposals] = useState<Proposal[]>([]);
    const [cycles, setCycles] = useState<GrantCycle[]>([]);
    const [loading, setLoading] = useState(true);
    const [downloading, setDownloading] = useState<number | null>(null);

    const downloadBlob = (data: BlobPart, mimeType: string, filename: string) => {
        const blob = new Blob([data], { type: mimeType });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
    };

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [propRes, cycleRes] = await Promise.all([
                proposalApi.getAll(),
                cycleApi.getAll(),
            ]);
            setProposals(Array.isArray(propRes.data) ? propRes.data : []);
            setCycles(Array.isArray(cycleRes.data) ? cycleRes.data : []);
        } catch {
            setProposals([]);
            setCycles([]);
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadProposalReport = async (proposal: Proposal) => {
        try {
            setDownloading(proposal.id);
            const response = await proposalApi.downloadReport(proposal.id);
            downloadBlob(response.data, 'application/pdf', `review_report_${proposal.proposal_code}.pdf`);
        } catch {
            alert('Failed to download report. Please try again.');
        } finally {
            setDownloading(null);
        }
    };

    const handleDownloadProposalReportDocx = async (proposal: Proposal) => {
        try {
            setDownloading(100000 + proposal.id);
            const response = await proposalApi.downloadReportDocx(proposal.id);
            downloadBlob(
                response.data,
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                `review_report_${proposal.proposal_code}.docx`
            );
        } catch {
            alert('Failed to download DOCX report. Please try again.');
        } finally {
            setDownloading(null);
        }
    };

    const handleDownloadCycleSummary = async (cycle: GrantCycle) => {
        try {
            setDownloading(-cycle.id);
            const response = await cycleApi.getSummaryReport(cycle.id);
            downloadBlob(response.data, 'application/pdf', `cycle_summary_${cycle.year}.pdf`);
        } catch {
            alert('Failed to download cycle summary. Please try again.');
        } finally {
            setDownloading(null);
        }
    };

    const handleDownloadCycleSummaryDocx = async (cycle: GrantCycle) => {
        try {
            setDownloading(-100000 - cycle.id);
            const response = await cycleApi.getSummaryReportDocx(cycle.id);
            downloadBlob(
                response.data,
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                `cycle_summary_${cycle.year}.docx`
            );
        } catch {
            alert('Failed to download DOCX cycle summary. Please try again.');
        } finally {
            setDownloading(null);
        }
    };

    const getStatusColor = (status: string) => {
        const colors: Record<string, string> = {
            FINAL_ACCEPTED: 'bg-green-100 text-green-800',
            FINAL_REJECTED: 'bg-red-100 text-red-800',
            UNDER_STAGE_1_REVIEW: 'bg-blue-100 text-blue-800',
            UNDER_STAGE_2_REVIEW: 'bg-purple-100 text-purple-800',
            TENTATIVELY_ACCEPTED: 'bg-yellow-100 text-yellow-800',
        };
        return colors[status] || 'bg-gray-100 text-gray-800';
    };

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
                    <p className="text-gray-500 mt-1">Generate and download proposal and cycle reports</p>
                </div>
                <button
                    onClick={loadData}
                    className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                    <RefreshCw size={16} className="mr-2" /> Refresh
                </button>
            </div>

            {/* Cycle Summary Reports */}
            <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <BarChart3 size={20} className="mr-2 text-purple-600" />
                    Cycle Summary Reports
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {cycles.map(cycle => (
                        <div key={cycle.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <h3 className="font-semibold text-gray-900">{cycle.name}</h3>
                                    <p className="text-sm text-gray-500">{cycle.year}</p>
                                </div>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${cycle.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                    {cycle.is_active ? 'Active' : 'Closed'}
                                </span>
                            </div>
                            {cycle.proposal_count !== undefined && (
                                <p className="text-sm text-gray-600 mb-3">{cycle.proposal_count} proposals</p>
                            )}
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={() => handleDownloadCycleSummary(cycle)}
                                    disabled={downloading === -cycle.id}
                                    className="flex items-center justify-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 text-sm"
                                >
                                    <Download size={16} className="mr-2" />
                                    {downloading === -cycle.id ? '...' : 'PDF'}
                                </button>
                                <button
                                    onClick={() => handleDownloadCycleSummaryDocx(cycle)}
                                    disabled={downloading === -100000 - cycle.id}
                                    className="flex items-center justify-center px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-black disabled:opacity-50 text-sm"
                                >
                                    <Download size={16} className="mr-2" />
                                    {downloading === -100000 - cycle.id ? '...' : 'DOCX'}
                                </button>
                            </div>
                        </div>
                    ))}
                    {cycles.length === 0 && !loading && (
                        <p className="text-gray-500 col-span-full">No grant cycles found.</p>
                    )}
                </div>
            </div>

            {/* Proposal-wise Reports */}
            <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <FileText size={20} className="mr-2 text-blue-600" />
                    Proposal Review Reports
                </h2>

                {loading ? (
                    <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                ) : (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">PI</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Report</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {proposals.map(proposal => (
                                    <tr key={proposal.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{proposal.proposal_code}</td>
                                        <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">{proposal.title}</td>
                                        <td className="px-6 py-4 text-sm text-gray-600">{proposal.pi_name}</td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(proposal.status)}`}>
                                                {proposal.status_display || proposal.status.replace(/_/g, ' ')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="inline-flex gap-2">
                                                <button
                                                    onClick={() => handleDownloadProposalReport(proposal)}
                                                    disabled={downloading === proposal.id}
                                                    className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
                                                >
                                                    <Download size={14} className="mr-1" />
                                                    {downloading === proposal.id ? '...' : 'PDF'}
                                                </button>
                                                <button
                                                    onClick={() => handleDownloadProposalReportDocx(proposal)}
                                                    disabled={downloading === 100000 + proposal.id}
                                                    className="inline-flex items-center px-3 py-1.5 bg-gray-900 text-white rounded-lg hover:bg-black disabled:opacity-50 text-sm"
                                                >
                                                    <Download size={14} className="mr-1" />
                                                    {downloading === 100000 + proposal.id ? '...' : 'DOCX'}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {proposals.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                            No proposals found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ReportsPage;

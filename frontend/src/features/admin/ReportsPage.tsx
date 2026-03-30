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

    const handleDownloadReviewTemplate = async (proposal: Proposal) => {
        try {
            setDownloading(200000 + proposal.id);
            const response = await proposalApi.downloadReviewTemplate(proposal.id);
            downloadBlob(response.data, 'application/pdf', `review_template_${proposal.proposal_code}.pdf`);
        } catch {
            alert('Failed to download review template. Please try again.');
        } finally {
            setDownloading(null);
        }
    };

    const handleDownloadReviewTemplateDocx = async (proposal: Proposal) => {
        try {
            setDownloading(300000 + proposal.id);
            const response = await proposalApi.downloadReviewTemplateDocx(proposal.id);
            downloadBlob(
                response.data,
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                `review_template_${proposal.proposal_code}.docx`
            );
        } catch {
            alert('Failed to download DOCX review template. Please try again.');
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
            FINAL_ACCEPTED: 'badge-green',
            FINAL_REJECTED: 'badge-red',
            UNDER_STAGE_1_REVIEW: 'badge-brand',
            UNDER_STAGE_2_REVIEW: 'badge-violet',
            TENTATIVELY_ACCEPTED: 'badge-amber',
        };
        return colors[status] || 'bg-gray-100 text-slate-300';
    };

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-100">Reports</h1>
                    <p className="text-slate-500 mt-1">Generate and download proposal and cycle reports</p>
                </div>
                <button
                    onClick={loadData}
                    className="flex items-center px-4 py-2 bg-gray-100 text-slate-400 rounded-lg hover:bg-gray-200"
                >
                    <RefreshCw size={16} className="mr-2" /> Refresh
                </button>
            </div>

            {/* Cycle Summary Reports */}
            <div>
                <h2 className="text-base font-semibold text-slate-200 mb-4 flex items-center">
                    <BarChart3 size={20} className="mr-2 text-violet-400" />
                    Cycle Summary Reports
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {cycles.map(cycle => (
                        <div key={cycle.id} className="card p-5">
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <h3 className="font-semibold text-slate-200">{cycle.name}</h3>
                                    <p className="text-sm text-slate-500">{cycle.year}</p>
                                </div>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${cycle.is_active ? 'badge-green' : 'bg-gray-100 text-slate-300'}`}>
                                    {cycle.is_active ? 'Active' : 'Closed'}
                                </span>
                            </div>
                            {cycle.proposal_count !== undefined && (
                                <p className="text-sm text-slate-500 mb-3">{cycle.proposal_count} proposals</p>
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
                        <p className="text-slate-500 col-span-full">No grant cycles found.</p>
                    )}
                </div>
            </div>

            {/* Proposal-wise Reports */}
            <div>
                <h2 className="text-base font-semibold text-slate-200 mb-4 flex items-center">
                    <FileText size={20} className="mr-2 text-brand-400" />
                    Proposal Review Reports
                </h2>

                {loading ? (
                    <div className="flex justify-center py-12">
                        <div className="spinner"></div>
                    </div>
                ) : (
                    <div className="card overflow-hidden">
                        <table className="min-w-full divide-y ">
                            <thead className="">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Code</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Title</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">PI</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Template</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Combined Report</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {proposals.map(proposal => (
                                    <tr key={proposal.id} className="hover:bg-slate-50">
                                        <td className="px-6 py-4 text-sm font-medium text-slate-200">{proposal.proposal_code}</td>
                                        <td className="px-6 py-4 text-sm text-slate-200 max-w-xs truncate">{proposal.title}</td>
                                        <td className="px-6 py-4 text-sm text-slate-500">{proposal.pi_name}</td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(proposal.status)}`}>
                                                {proposal.status_display || proposal.status.replace(/_/g, ' ')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="inline-flex gap-2">
                                                <button
                                                    onClick={() => handleDownloadReviewTemplate(proposal)}
                                                    disabled={downloading === 200000 + proposal.id}
                                                    className="inline-flex items-center px-3 py-1.5 bg-slate-600 text-white rounded-lg hover:bg-slate-700 disabled:opacity-50 text-sm"
                                                >
                                                    <Download size={14} className="mr-1" />
                                                    {downloading === 200000 + proposal.id ? '...' : 'PDF'}
                                                </button>
                                                <button
                                                    onClick={() => handleDownloadReviewTemplateDocx(proposal)}
                                                    disabled={downloading === 300000 + proposal.id}
                                                    className="inline-flex items-center px-3 py-1.5 bg-slate-900 text-white rounded-lg hover:bg-black disabled:opacity-50 text-sm"
                                                >
                                                    <Download size={14} className="mr-1" />
                                                    {downloading === 300000 + proposal.id ? '...' : 'DOCX'}
                                                </button>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="inline-flex gap-2">
                                                <button
                                                    onClick={() => handleDownloadProposalReport(proposal)}
                                                    disabled={downloading === proposal.id}
                                                    className="inline-flex items-center btn btn-primary btn-sm disabled:opacity-50 text-sm"
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
                                        <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
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

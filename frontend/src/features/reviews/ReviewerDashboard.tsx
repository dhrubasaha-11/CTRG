/**
 * Reviewer assignments page.
 * Shows assigned proposals, pending reviews, and completed reviews.
 */
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
    Clock, CheckCircle, FileText, AlertCircle, Calendar,
    ChevronRight, Eye, Edit3
} from 'lucide-react';
import { assignmentApi, type ReviewAssignment } from '../../services/api';

interface ReviewerStats {
    total_assignments: number;
    pending: number;
    completed: number;
    overdue: number;
}

const ReviewerDashboard: React.FC = () => {
    const [assignments, setAssignments] = useState<ReviewAssignment[]>([]);
    const [stats, setStats] = useState<ReviewerStats>({ total_assignments: 0, pending: 0, completed: 0, overdue: 0 });
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');
    const [currentTime, setCurrentTime] = useState(() => Date.now());

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        const intervalId = window.setInterval(() => {
            setCurrentTime(Date.now());
        }, 60 * 1000);

        return () => window.clearInterval(intervalId);
    }, []);

    useEffect(() => {
        setStats((prev) => ({
            ...prev,
            overdue: assignments.filter(a =>
                a.status === 'PENDING' &&
                new Date(a.deadline).getTime() < currentTime
            ).length
        }));
    }, [assignments, currentTime]);

    const loadData = async () => {
        try {
            setLoading(true);
            const response = await assignmentApi.getAll();
            setAssignments(response.data);

            // Calculate stats
            const pending = response.data.filter(a => a.status === 'PENDING').length;
            const completed = response.data.filter(a => a.status === 'COMPLETED').length;
            const overdue = response.data.filter(a =>
                a.status === 'PENDING' &&
                new Date(a.deadline) < new Date()
            ).length;

            setStats({
                total_assignments: response.data.length,
                pending,
                completed,
                overdue
            });
        } catch (err) {
            console.error("Failed to load reviewer assignments", err);
            setAssignments([]);
            setStats({ total_assignments: 0, pending: 0, completed: 0, overdue: 0 });
        } finally {
            setLoading(false);
        }
    };

    const filteredAssignments = assignments.filter(a => {
        if (filter === 'pending') return a.status === 'PENDING';
        if (filter === 'completed') return a.status === 'COMPLETED';
        return true;
    });

    const getStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            PENDING: 'bg-yellow-100 text-yellow-800',
            COMPLETED: 'bg-green-100 text-green-800',
        };
        return styles[status] || 'bg-gray-100 text-gray-800';
    };

    const getProposalOutcomeBadge = (status?: string) => {
        const styles: Record<string, string> = {
            STAGE_1_REJECTED: 'bg-red-100 text-red-800',
            ACCEPTED_NO_CORRECTIONS: 'bg-green-100 text-green-800',
            TENTATIVELY_ACCEPTED: 'bg-amber-100 text-amber-800',
            REVISION_REQUESTED: 'bg-orange-100 text-orange-800',
            FINAL_ACCEPTED: 'bg-emerald-100 text-emerald-800',
            FINAL_REJECTED: 'bg-rose-100 text-rose-800',
        };
        return status ? styles[status] || 'bg-slate-100 text-slate-700' : '';
    };

    const getReviewValidityBadge = (validity?: string) => {
        if (validity === 'REJECTED') {
            return 'bg-red-100 text-red-800';
        }
        return 'bg-emerald-100 text-emerald-700';
    };

    const isOverdue = (deadline: string, status: string) => {
        return status === 'PENDING' && new Date(deadline).getTime() < currentTime;
    };

    const getDaysRemaining = (deadline: string) => {
        const days = Math.ceil((new Date(deadline).getTime() - currentTime) / (1000 * 60 * 60 * 24));
        return days;
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">My Reviews</h1>
                <p className="text-gray-500 mt-1">Manage and complete your assigned proposal reviews</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Assigned Proposals</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total_assignments}</p>
                        </div>
                        <div className="p-3 bg-blue-100 rounded-lg">
                            <FileText size={24} className="text-blue-600" />
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Pending Reviews</p>
                            <p className="text-2xl font-bold text-yellow-600 mt-1">{stats.pending}</p>
                        </div>
                        <div className="p-3 bg-yellow-100 rounded-lg">
                            <Clock size={24} className="text-yellow-600" />
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Submitted Reviews</p>
                            <p className="text-2xl font-bold text-green-600 mt-1">{stats.completed}</p>
                        </div>
                        <div className="p-3 bg-green-100 rounded-lg">
                            <CheckCircle size={24} className="text-green-600" />
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Overdue</p>
                            <p className="text-2xl font-bold text-red-600 mt-1">{stats.overdue}</p>
                        </div>
                        <div className="p-3 bg-red-100 rounded-lg">
                            <AlertCircle size={24} className="text-red-600" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex space-x-2 border-b border-gray-200">
                {(['all', 'pending', 'completed'] as const).map((f) => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-4 py-2 text-sm font-medium transition-colors ${filter === f
                            ? 'text-blue-600 border-b-2 border-blue-600'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        {f.charAt(0).toUpperCase() + f.slice(1)} ({
                            f === 'all' ? assignments.length :
                                f === 'pending' ? stats.pending : stats.completed
                        })
                    </button>
                ))}
            </div>

            {/* Assignments List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {filteredAssignments.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                        <FileText size={40} className="mx-auto mb-3 opacity-30" />
                        <p>No assignments found</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-200">
                        {filteredAssignments.map((assignment) => (
                            <div key={assignment.id} className="p-4 hover:bg-gray-50 transition-colors">
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center space-x-3">
                                            <span className="text-sm font-mono text-gray-500">{assignment.proposal_code}</span>
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(assignment.status)}`}>
                                                {assignment.status_display}
                                            </span>
                                            {assignment.review_validity_display && (
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getReviewValidityBadge(assignment.review_validity)}`}>
                                                    {assignment.review_validity_display}
                                                </span>
                                            )}
                                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                                {assignment.stage_display}
                                            </span>
                                            {isOverdue(assignment.deadline, assignment.status) && (
                                                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                    Overdue
                                                </span>
                                            )}
                                            {assignment.proposal_status_display && (
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getProposalOutcomeBadge(assignment.proposal_status)}`}>
                                                    {assignment.proposal_status_display}
                                                </span>
                                            )}
                                        </div>
                                        <h3 className="text-lg font-medium text-gray-900 mt-1">{assignment.proposal_title}</h3>
                                        <div className="flex items-center text-sm text-gray-500 mt-1">
                                            <Calendar size={14} className="mr-1" />
                                            <span>
                                                Deadline: {new Date(assignment.deadline).toLocaleDateString()}
                                                {!isOverdue(assignment.deadline, assignment.status) && assignment.status !== 'COMPLETED' && (
                                                    <span className={`ml-2 ${getDaysRemaining(assignment.deadline) <= 3 ? 'text-red-600 font-medium' : ''}`}>
                                                        ({getDaysRemaining(assignment.deadline)} days left)
                                                    </span>
                                                )}
                                            </span>
                                        </div>
                                        {assignment.review_validity === 'REJECTED' && assignment.chair_rejection_reason && (
                                            <div className="mt-2 text-sm text-red-700">
                                                Chair reason: {assignment.chair_rejection_reason}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        {assignment.status === 'COMPLETED' ? (
                                            <Link
                                                to={`/reviewer/reviews/${assignment.id}/view`}
                                                className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                                            >
                                                <Eye size={16} className="mr-2" />
                                                View
                                            </Link>
                                        ) : (
                                            <Link
                                                to={assignment.stage === 2 ? `/reviewer/reviews/${assignment.id}/stage2` : `/reviewer/reviews/${assignment.id}`}
                                                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                            >
                                                <Edit3 size={16} className="mr-2" />
                                                {(assignment.stage === 1 && assignment.stage1_score) || (assignment.stage === 2 && assignment.stage2_review)
                                                    ? 'Continue'
                                                    : 'Start Review'}
                                            </Link>
                                        )}
                                        <ChevronRight size={20} className="text-gray-400" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ReviewerDashboard;

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Clock3, FileText, ArrowRight, AlertTriangle } from 'lucide-react';
import { dashboardApi, type ReviewAssignment } from '../../services/api';

interface ReviewerDashboardData {
    total_assigned: number;
    pending: number;
    completed: number;
    pending_assignments: ReviewAssignment[];
}

const ReviewerHome: React.FC = () => {
    const [data, setData] = useState<ReviewerDashboardData>({
        total_assigned: 0,
        pending: 0,
        completed: 0,
        pending_assignments: [],
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);
                const response = await dashboardApi.getReviewerStats();
                setData(response.data);
            } catch (error) {
                console.error('Failed to load reviewer dashboard', error);
                setData({
                    total_assigned: 0,
                    pending: 0,
                    completed: 0,
                    pending_assignments: [],
                });
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, []);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Reviewer Dashboard</h1>
                <p className="text-gray-500 mt-1">Overview of your review workload and next actions</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Total Assigned</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">{data.total_assigned}</p>
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
                            <p className="text-2xl font-bold text-amber-600 mt-1">{data.pending}</p>
                        </div>
                        <div className="p-3 bg-amber-100 rounded-lg">
                            <Clock3 size={24} className="text-amber-600" />
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Completed Reviews</p>
                            <p className="text-2xl font-bold text-green-600 mt-1">{data.completed}</p>
                        </div>
                        <div className="p-3 bg-green-100 rounded-lg">
                            <CheckCircle2 size={24} className="text-green-600" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[1.7fr_1fr] gap-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">Pending Assignments</h2>
                            <p className="text-sm text-gray-500">Assignments that still need your review</p>
                        </div>
                        <Link
                            to="/reviewer/reviews"
                            className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-700"
                        >
                            View all
                            <ArrowRight size={16} className="ml-1" />
                        </Link>
                    </div>

                    {data.pending_assignments.length === 0 ? (
                        <div className="p-10 text-center text-gray-500">
                            <CheckCircle2 size={40} className="mx-auto mb-3 text-green-400" />
                            <p>No pending assignments.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-200">
                            {data.pending_assignments.slice(0, 5).map((assignment) => (
                                <div key={assignment.id} className="px-6 py-4 flex items-center justify-between">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-mono text-gray-500">{assignment.proposal_code}</span>
                                            <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                                {assignment.stage_display}
                                            </span>
                                        </div>
                                        <h3 className="text-base font-medium text-gray-900 mt-1">{assignment.proposal_title}</h3>
                                        <p className="text-sm text-gray-500 mt-1">
                                            Deadline: {new Date(assignment.deadline).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <Link
                                        to={assignment.stage === 2 ? `/reviewer/reviews/${assignment.id}/stage2` : `/reviewer/reviews/${assignment.id}`}
                                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                    >
                                        Open
                                    </Link>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 bg-rose-100 rounded-lg">
                            <AlertTriangle size={22} className="text-rose-600" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">Review Guidance</h2>
                            <p className="text-sm text-gray-500">Keep the workflow clean and timely</p>
                        </div>
                    </div>
                    <div className="space-y-3 text-sm text-gray-600">
                        <p>Use `My Reviews` to access all assigned proposals and continue draft reviews.</p>
                        <p>Stage 1 reviews use the full rubric and are locked after final submission.</p>
                        <p>Stage 2 reviews should focus only on whether revision concerns were addressed.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReviewerHome;

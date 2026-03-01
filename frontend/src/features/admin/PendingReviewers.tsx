/**
 * ============================================================================
 * PENDING REVIEWERS MANAGEMENT COMPONENT
 * ============================================================================
 *
 * PURPOSE:
 * Allows SRC Chair (admin) to review and approve/reject reviewer registrations.
 *
 * WORKFLOW:
 * 1. Reviewer registers via public form → account created as INACTIVE
 * 2. SRC Chair sees pending reviewer in this component
 * 3. SRC Chair can:
 *    - APPROVE: Sets is_active=True, user can login
 *    - REJECT: Permanently deletes the account
 *
 * BUSINESS RULES:
 * - Only inactive reviewers with role='Reviewer' are shown
 * - Approving sets both User.is_active and ReviewerProfile.is_active_reviewer to True
 * - Rejecting permanently deletes the user (cannot reject active reviewers)
 * - Only SRC Chair (admin users) can access this page
 *
 * SECURITY:
 * - Requires admin authentication (IsAdminUser permission)
 * - Confirmation dialogs prevent accidental approve/reject
 * - Cannot reject already active reviewers
 *
 * API ENDPOINTS USED:
 * - GET  /api/auth/pending-reviewers/     - Fetch all inactive reviewers
 * - POST /api/auth/approve-reviewer/<id>/ - Activate reviewer account
 * - DELETE /api/auth/reject-reviewer/<id>/ - Delete pending account
 */

import React, { useState, useEffect } from 'react';
import {
    UserCheck,      // Approve button icon
    UserX,          // Reject button icon
    Clock,          // Pending status icon
    Mail,           // Email display icon
    User,           // Username display icon
    CheckCircle,    // Success/active status icon
    XCircle,        // Inactive status icon
    AlertCircle,    // Alert/warning icon
    FileText        // CV link icon
} from 'lucide-react';
import api from '../../services/api';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * PendingReviewer interface
 * Matches the UserListSerializer from backend with date_joined field
 */
interface PendingReviewer {
    id: number;           // User primary key
    username: string;     // Unique username
    email: string;        // Unique email address
    full_name: string;    // First name + Last name combined
    role: string;         // Should always be "Reviewer" for this list
    is_active: boolean;   // Should always be False for pending reviewers
    date_joined: string;  // ISO timestamp of registration
    cv_url: string | null;
    cv_name: string | null;
}

const PendingReviewers: React.FC = () => {
    // ========================================================================
    // STATE MANAGEMENT
    // ========================================================================

    /**
     * List of pending reviewers (inactive accounts awaiting approval)
     */
    const [pendingReviewers, setPendingReviewers] = useState<PendingReviewer[]>([]);

    /**
     * Loading state while fetching data from backend
     */
    const [loading, setLoading] = useState(true);

    /**
     * Track which reviewer is currently being processed (approve/reject)
     * Prevents multiple simultaneous operations and shows loading state
     */
    const [processing, setProcessing] = useState<number | null>(null);

    // ========================================================================
    // LIFECYCLE: Load pending reviewers on component mount
    // ========================================================================
    useEffect(() => {
        loadPendingReviewers();
    }, []);

    // ========================================================================
    // DATA FETCHING
    // ========================================================================

    /**
     * Load all pending (inactive) reviewer registrations
     *
     * API: GET /api/auth/pending-reviewers/
     * Returns: Users where groups__name='Reviewer' AND is_active=False
     */
    const loadPendingReviewers = async () => {
        try {
            setLoading(true);
            const response = await api.get('/auth/pending-reviewers/');
            setPendingReviewers(response.data);
        } catch (err) {
            console.error("Failed to load pending reviewers", err);
            setPendingReviewers([]); // Set empty array on error
        } finally {
            setLoading(false);
        }
    };

    // ========================================================================
    // APPROVAL HANDLER
    // ========================================================================

    /**
     * Approve a pending reviewer
     *
     * WHAT IT DOES:
     * 1. Sets User.is_active = True (enables login)
     * 2. Sets ReviewerProfile.is_active_reviewer = True (enables review assignments)
     * 3. Removes from pending list in UI
     *
     * SECURITY:
     * - Requires admin authentication
     * - Confirmation dialog prevents accidents
     * - Backend validates user is actually a pending reviewer
     *
     * API: POST /api/auth/approve-reviewer/<id>/
     */
    const handleApprove = async (reviewerId: number) => {
        // Confirmation dialog to prevent accidental approval
        if (!confirm('Are you sure you want to approve this reviewer? They will be able to login and review proposals.')) {
            return;
        }

        try {
            // Set processing state to show loading and disable buttons
            setProcessing(reviewerId);

            // Call approval endpoint
            await api.post(`/auth/approve-reviewer/${reviewerId}/`);

            // Remove from pending list (optimistic UI update)
            setPendingReviewers(prev => prev.filter(r => r.id !== reviewerId));

            // Success feedback
            alert('Reviewer approved successfully! They can now login to the system.');
        } catch (err: any) {
            // Extract error message from backend response
            const errorMsg = err.response?.data?.error || 'Failed to approve reviewer';
            alert(errorMsg);
        } finally {
            // Clear processing state to re-enable buttons
            setProcessing(null);
        }
    };

    // ========================================================================
    // REJECTION HANDLER
    // ========================================================================

    /**
     * Reject a pending reviewer registration
     *
     * WHAT IT DOES:
     * 1. Permanently DELETES the user account
     * 2. Deletes associated ReviewerProfile
     * 3. Removes from pending list in UI
     *
     * SAFETY CHECKS (Backend):
     * - Cannot reject active reviewers
     * - Must be in Reviewer group
     * - Must be inactive
     *
     * WARNING: This is a destructive operation - account cannot be recovered!
     *
     * API: DELETE /api/auth/reject-reviewer/<id>/
     */
    const handleReject = async (reviewerId: number) => {
        // Strong confirmation dialog for destructive action
        if (!confirm('Are you sure you want to reject this reviewer registration? This will delete their account permanently.')) {
            return;
        }

        try {
            // Set processing state
            setProcessing(reviewerId);

            // Call deletion endpoint
            await api.delete(`/auth/reject-reviewer/${reviewerId}/`);

            // Remove from pending list (optimistic UI update)
            setPendingReviewers(prev => prev.filter(r => r.id !== reviewerId));

            // Success feedback
            alert('Reviewer registration rejected.');
        } catch (err: any) {
            // Extract error message from backend response
            const errorMsg = err.response?.data?.error || 'Failed to reject reviewer';
            alert(errorMsg);
        } finally {
            // Clear processing state
            setProcessing(null);
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Pending Reviewer Registrations</h1>
                    <p className="text-gray-500 mt-1">Review and approve new reviewer registrations</p>
                </div>
                {pendingReviewers.length > 0 && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg">
                        <AlertCircle size={20} />
                        <span className="font-medium">{pendingReviewers.length} Pending</span>
                    </div>
                )}
            </div>

            {/* Stats Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-gray-500">Awaiting Approval</p>
                        <p className="text-3xl font-bold text-yellow-600 mt-1">{pendingReviewers.length}</p>
                    </div>
                    <div className="p-4 bg-yellow-100 rounded-lg">
                        <Clock size={32} className="text-yellow-600" />
                    </div>
                </div>
            </div>

            {/* Pending Reviewers List */}
            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
            ) : pendingReviewers.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                    <CheckCircle size={48} className="mx-auto text-green-500 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">All Caught Up!</h3>
                    <p className="text-gray-500">There are no pending reviewer registrations at the moment.</p>
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Reviewer
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Registration Date
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {pendingReviewers.map((reviewer) => (
                                <tr key={reviewer.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center">
                                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-white font-semibold">
                                                {reviewer.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                                            </div>
                                            <div className="ml-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="text-sm font-medium text-gray-900">{reviewer.full_name}</div>
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                                                        <Clock size={12} className="mr-1" />
                                                        Pending
                                                    </span>
                                                </div>
                                                <div className="text-sm text-gray-500 flex items-center mt-1">
                                                    <Mail size={12} className="mr-1" />
                                                    {reviewer.email}
                                                </div>
                                                <div className="text-sm text-gray-400 flex items-center mt-1">
                                                    <User size={12} className="mr-1" />
                                                    {reviewer.username}
                                                </div>
                                                <div className="text-sm text-gray-400 flex items-center mt-1">
                                                    <FileText size={12} className="mr-1" />
                                                    {reviewer.cv_url ? (
                                                        <a
                                                            href={reviewer.cv_url}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="text-blue-600 hover:text-blue-700 hover:underline"
                                                        >
                                                            {reviewer.cv_name || 'View CV'}
                                                        </a>
                                                    ) : (
                                                        <span>No CV uploaded</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-900">{formatDate(reviewer.date_joined)}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                            <XCircle size={12} className="mr-1" />
                                            Inactive
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                        <button
                                            onClick={() => handleApprove(reviewer.id)}
                                            disabled={processing === reviewer.id}
                                            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {processing === reviewer.id ? (
                                                <>Processing...</>
                                            ) : (
                                                <>
                                                    <UserCheck size={14} className="mr-1" />
                                                    Approve
                                                </>
                                            )}
                                        </button>
                                        <button
                                            onClick={() => handleReject(reviewer.id)}
                                            disabled={processing === reviewer.id}
                                            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {processing === reviewer.id ? (
                                                <>Processing...</>
                                            ) : (
                                                <>
                                                    <UserX size={14} className="mr-1" />
                                                    Reject
                                                </>
                                            )}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default PendingReviewers;

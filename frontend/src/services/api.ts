/**
 * API Service for backend communication.
 * Handles all HTTP requests to the Django REST API.
 */
import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { getToken, clearAuthData } from './authService';

// Use environment variable for API URL (fallback to localhost for development)
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

// Create axios instance with defaults
const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 30000, // 30 second timeout
});

// Request retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second base delay

// Helper: Exponential backoff delay
const getRetryDelay = (retryCount: number) => {
    return RETRY_DELAY * Math.pow(2, retryCount);
};

// Helper: Check if error is retryable
const isRetryableError = (error: AxiosError): boolean => {
    if (!error.response) {
        // Network errors, timeouts - retry
        return true;
    }

    const status = error.response.status;
    // Retry on 5xx server errors and 429 (rate limit)
    return status >= 500 || status === 429;
};

// Add auth token to requests
// Using Django REST Framework Token Authentication format: "Token <token>"
api.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        const token = getToken();
        if (token) {
            config.headers.Authorization = `Token ${token}`;
        }

        // Add retry count to config
        if (!config.headers['X-Retry-Count']) {
            config.headers['X-Retry-Count'] = '0';
        }

        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Auto-unwrap paginated responses: {count, results} -> results array
api.interceptors.response.use(
    (response) => {
        if (response.data && typeof response.data === 'object' &&
            'results' in response.data && 'count' in response.data) {
            // Preserve pagination metadata on the response object so callers
            // can implement page navigation when needed.
            (response as any).pagination = {
                count: (response.data as any).count,
                next: (response.data as any).next ?? null,
                previous: (response.data as any).previous ?? null,
            };
            response.data = response.data.results;
        }
        return response;
    },
    (error) => Promise.reject(error)
);

// Global error interceptor with retry logic
api.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const config = error.config as InternalAxiosRequestConfig & { _retryCount?: number };

        if (!config) {
            return Promise.reject(error);
        }

        // Initialize retry count
        config._retryCount = config._retryCount || 0;

        // Handle specific error cases
        if (error.response) {
            const status = error.response.status;

            // 401 Unauthorized - Clear auth and redirect to login
            if (status === 401) {
                clearAuthData();
                if (window.location.pathname !== '/login') {
                    window.location.href = '/login';
                }
                return Promise.reject(error);
            }

            // 403 Forbidden - Redirect to unauthorized page
            if (status === 403) {
                if (window.location.pathname !== '/unauthorized') {
                    window.location.href = '/unauthorized';
                }
                return Promise.reject(error);
            }

            // 404 Not Found - Don't retry
            if (status === 404) {
                return Promise.reject(error);
            }
        }

        // Retry logic for retryable errors
        if (isRetryableError(error) && config._retryCount < MAX_RETRIES) {
            config._retryCount++;

            // Calculate delay with exponential backoff
            const delay = getRetryDelay(config._retryCount - 1);

            // Log retry attempt (replace with proper logging service in production)
            console.warn(
                `Retry attempt ${config._retryCount}/${MAX_RETRIES} for ${config.url} after ${delay}ms`
            );

            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, delay));

            // Update retry count header
            config.headers['X-Retry-Count'] = String(config._retryCount);

            // Retry the request
            return api(config);
        }

        // Max retries reached or non-retryable error
        if (config._retryCount >= MAX_RETRIES) {
            console.error(`Max retries (${MAX_RETRIES}) reached for ${config.url}`);
        }

        // Handle offline/network errors
        if (!error.response) {
            const errorMessage = error.message.toLowerCase();
            if (errorMessage.includes('network') || errorMessage.includes('timeout')) {
                console.error('Network error detected:', error.message);
                // You can dispatch a global notification here
                // Example: toast.error('Network error. Please check your connection.');
            }
        }

        return Promise.reject(error);
    }
);

// Types - Flexible interface supporting multiple workflows
export interface GrantCycle {
    id: number;
    name: string;
    year: string | number;
    // All date fields are optional to support different backend implementations
    submission_start?: string;
    submission_end?: string;
    review_deadline_stage1?: string;
    revision_deadline_days?: number;
    review_deadline_stage2?: string;
    stage1_threshold?: number;
    final_decision_date?: string;
    start_date?: string;
    end_date?: string;
    stage1_review_start_date?: string;
    stage1_review_end_date?: string;
    stage2_review_start_date?: string;
    stage2_review_end_date?: string;
    revision_window_days?: number;
    acceptance_threshold?: number;
    max_reviewers_per_proposal?: number;
    is_active: boolean;
    proposal_count?: number;
}

export interface Proposal {
    id: number;
    proposal_code: string;
    title: string;
    abstract: string;
    pi_name: string;
    pi_department: string;
    pi_email: string;
    co_investigators?: string;
    fund_requested: number;
    cycle: number;
    cycle_name: string;
    status: string;
    status_display: string;
    created_at: string;
    submitted_at?: string;
    revision_deadline?: string;
    is_revision_overdue?: boolean;
    proposal_file?: string;
    approved_amount?: number;
}

export interface Reviewer {
    id: number;
    user: number;
    user_email: string;
    user_name: string;
    department: string;
    area_of_expertise: string;
    max_review_load: number;
    is_active_reviewer: boolean;
    current_workload: number;
    can_accept_more: boolean;
}

export interface ReviewAssignment {
    id: number;
    proposal: number;
    proposal_title: string;
    proposal_code: string;
    reviewer: number;
    reviewer_name: string;
    reviewer_email: string;
    stage: number;
    stage_display: string;
    status: string;
    status_display: string;
    deadline: string;
    stage1_score?: Stage1Score;
    stage2_review?: Stage2Review;
    stage1_summary?: Stage1Score;
}

export interface AutoAssignResult {
    requested_count: number;
    assigned_count: number;
    candidates_considered: number;
    assigned: ReviewAssignment[];
    skipped_candidates: Array<{
        reviewer_id: number;
        reviewer_email: string;
        reason: string;
    }>;
    errors: Array<{
        reviewer_id: number;
        reviewer_email: string;
        reason: string;
    }>;
}

export interface Stage1Score {
    id: number;
    originality_score: number;
    clarity_score: number;
    literature_review_score: number;
    methodology_score: number;
    impact_score: number;
    publication_potential_score: number;
    budget_appropriateness_score: number;
    timeline_practicality_score: number;
    narrative_comments: string;
    recommendation: string;
    detailed_recommendation: string;
    total_score: number;
    percentage_score: number;
    weighted_percentage_score: number;
}

export interface Stage2Review {
    id: number;
    concerns_addressed: string;
    revised_recommendation: string;
    technical_comments: string;
    budget_comments: string;
    revised_score?: number;
}

export interface DashboardStats {
    total_proposals: number;
    pending_reviews: number;
    awaiting_decision: number;
    awaiting_revision: number;
    status_breakdown: Record<string, number>;
}

// ===== Grant Cycle APIs =====
export const cycleApi = {
    getAll: () => api.get<GrantCycle[]>('/cycles/'),
    getActive: () => api.get<GrantCycle[]>('/cycles/active/'),
    getById: (id: number) => api.get<GrantCycle>(`/cycles/${id}/`),
    create: (data: Record<string, unknown>) => api.post<GrantCycle>('/cycles/', data),
    update: (id: number, data: Record<string, unknown>) => api.put<GrantCycle>(`/cycles/${id}/`, data),
    delete: (id: number) => api.delete(`/cycles/${id}/`),
    getStatistics: (id: number) => api.get(`/cycles/${id}/statistics/`),
    getSummaryReport: (id: number) => api.get(`/cycles/${id}/summary_report/`, { responseType: 'blob' }),
};

// ===== Proposal APIs =====
export const proposalApi = {
    getAll: () => api.get<Proposal[]>('/proposals/'),
    getById: (id: number) => api.get<Proposal>(`/proposals/${id}/`),
    getMyProposals: () => api.get<Proposal[]>('/proposals/my_proposals/'),
    create: (data: FormData) => api.post<Proposal>('/proposals/', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
    }),
    update: (id: number, data: FormData) => api.put<Proposal>(`/proposals/${id}/`, data, {
        headers: { 'Content-Type': 'multipart/form-data' },
    }),
    submit: (id: number) => api.post(`/proposals/${id}/submit/`),
    submitRevision: (id: number, data: FormData) => api.post(`/proposals/${id}/submit_revision/`, data, {
        headers: { 'Content-Type': 'multipart/form-data' },
    }),
    stage1Decision: (id: number, decision: string, chair_comments?: string) =>
        api.post(`/proposals/${id}/stage1_decision/`, { decision, chair_comments }),
    startStage2: (id: number) => api.post(`/proposals/${id}/start_stage2/`),
    finalDecision: (id: number, decision: string, approved_grant_amount: number, final_remarks: string) =>
        api.post(`/proposals/${id}/final_decision/`, { decision, approved_grant_amount, final_remarks }),
    getReviews: (id: number) => api.get<ReviewAssignment[]>(`/proposals/${id}/reviews/`),
    downloadReport: (id: number) => api.get(`/proposals/${id}/download_report/`, { responseType: 'blob' }),
};

// ===== Dashboard APIs =====
export const dashboardApi = {
    getSrcChairStats: () => api.get<DashboardStats>('/dashboard/src_chair/'),
    getReviewerStats: () => api.get('/dashboard/reviewer/'),
    getPIStats: () => api.get('/dashboard/pi/'),
};

// ===== Reviewer APIs =====
export const reviewerApi = {
    getAll: () => api.get<Reviewer[]>('/reviewers/'),
    getWorkloads: () => api.get<Reviewer[]>('/reviewers/workloads/'),
    getMyProfile: () => api.get<Reviewer>('/reviewers/my_profile/'),
    update: (id: number, data: Partial<Reviewer>) => api.patch<Reviewer>(`/reviewers/${id}/`, data),
};

// ===== Review Assignment APIs =====
export const assignmentApi = {
    getAll: () => api.get<ReviewAssignment[]>('/assignments/'),
    getById: (id: number) => api.get<ReviewAssignment>(`/assignments/${id}/`),
    assignReviewers: (proposal_id: number, reviewer_ids: number[], stage: number, deadline: string) =>
        api.post('/assignments/assign_reviewers/', { proposal_id, reviewer_ids, stage, deadline }),
    autoAssignReviewers: (
        proposal_id: number,
        stage: number,
        deadline: string,
        reviewer_count?: number,
        expertise_keywords?: string[],
        exclude_reviewer_ids?: number[]
    ) =>
        api.post<AutoAssignResult>('/assignments/auto_assign_reviewers/', {
            proposal_id,
            stage,
            deadline,
            reviewer_count,
            expertise_keywords,
            exclude_reviewer_ids,
        }),
    sendNotification: (id: number) => api.post(`/assignments/${id}/send_notification/`),
    bulkNotify: (assignment_ids: number[]) => api.post('/assignments/bulk_notify/', { assignment_ids }),
    submitScore: (id: number, data: Record<string, unknown>) =>
        api.post(`/assignments/${id}/submit_score/`, data),
    submitStage2Review: (id: number, data: Record<string, unknown>) =>
        api.post(`/assignments/${id}/submit_score/`, data),
    getProposalDetails: (id: number) => api.get<ReviewAssignment>(`/assignments/${id}/proposal_details/`),
};

// ===== Audit Log APIs =====
export const auditApi = {
    getAll: (params?: { proposal?: number; action_type?: string }) =>
        api.get('/audit-logs/', { params }),
};

export default api;

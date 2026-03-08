/**
 * Stage 1 Review Form Component.
 *
 * Implements the CTRG 8-criteria scoring rubric (total: 100 points):
 *   - 5 criteria scored 0-15 (Originality, Clarity, Literature Review, Methodology, Impact)
 *   - 2 criteria scored 0-10 (Publication Potential, Budget Appropriateness)
 *   - 1 criterion  scored 0-5  (Timeline Practicality)
 *
 * Supports two submit paths (same pattern as ProposalForm):
 *   - Save Draft: persists scores without validation, reviewer can return later
 *   - Submit Review: validates all scores + comments, then finalizes (irreversible)
 *
 * Score input uses both a range slider and a number input for accessibility.
 * A color-coded progress bar provides visual feedback on each criterion.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Save, Send, ArrowLeft, FileText, AlertCircle } from 'lucide-react';
import { assignmentApi, resolveBackendFileUrl, type ReviewAssignment, type Stage1Score } from '../../services/api';

/** Configuration for a single scoring criterion — drives the form UI. */
interface CriteriaConfig {
    key: keyof Omit<
        Stage1Score,
        'id' | 'narrative_comments' | 'recommendation' | 'detailed_recommendation' |
        'total_score' | 'percentage_score' | 'weighted_percentage_score'
    >;
    label: string;
    description: string;
    maxScore: number;
}

type Stage1Recommendation = 'ACCEPT' | 'TENTATIVELY_ACCEPT' | 'REJECT' | '';

/**
 * Default scoring criteria definitions — single source of truth for the review form.
 * The order here determines the display order in the UI.
 * maxScore values match the backend Stage1ScoreSerializer validation limits by default,
 * but can be overridden by cycle-specific score_weights.
 */
const DEFAULT_CRITERIA: CriteriaConfig[] = [
    { key: 'originality_score', label: 'Originality', description: 'Innovation and novelty of the research idea', maxScore: 15 },
    { key: 'clarity_score', label: 'Clarity', description: 'Clear presentation of objectives and methodology', maxScore: 15 },
    { key: 'literature_review_score', label: 'Literature Review', description: 'Comprehensive review of relevant literature', maxScore: 15 },
    { key: 'methodology_score', label: 'Methodology', description: 'Appropriateness and rigor of research methods', maxScore: 15 },
    { key: 'impact_score', label: 'Impact', description: 'Potential contribution to the field and society', maxScore: 15 },
    { key: 'publication_potential_score', label: 'Publication Potential', description: 'Likelihood of peer-reviewed publications', maxScore: 10 },
    { key: 'budget_appropriateness_score', label: 'Budget Appropriateness', description: 'Budget justification and cost-effectiveness', maxScore: 10 },
    { key: 'timeline_practicality_score', label: 'Timeline Practicality', description: 'Realistic and achievable project timeline', maxScore: 5 },
];

/** Build criteria with cycle-specific weight overrides if available. */
const buildCriteria = (scoreWeights?: Record<string, number>): CriteriaConfig[] => {
    if (!scoreWeights || Object.keys(scoreWeights).length === 0) return DEFAULT_CRITERIA;
    return DEFAULT_CRITERIA.map(c => ({
        ...c,
        maxScore: scoreWeights[c.key] ?? c.maxScore,
    }));
};

const Stage1ReviewForm: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [assignment, setAssignment] = useState<ReviewAssignment | null>(null);
    const [criteria, setCriteria] = useState<CriteriaConfig[]>(DEFAULT_CRITERIA);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [scores, setScores] = useState<Record<string, number>>({
        originality_score: 0,
        clarity_score: 0,
        literature_review_score: 0,
        methodology_score: 0,
        impact_score: 0,
        publication_potential_score: 0,
        budget_appropriateness_score: 0,
        timeline_practicality_score: 0,
    });
    const [comments, setComments] = useState('');
    const [recommendation, setRecommendation] = useState<Stage1Recommendation>('');
    const [detailedRecommendation, setDetailedRecommendation] = useState('');

    const loadAssignment = useCallback(async () => {
        try {
            setLoading(true);
            const response = await assignmentApi.getProposalDetails(Number(id));
            setAssignment(response.data);

            // Apply cycle-specific score weights if available
            const weights = (response.data as any).score_weights;
            setCriteria(buildCriteria(weights));

            // Load existing score if any
            if (response.data.stage1_score) {
                const existing = response.data.stage1_score;
                setScores({
                    originality_score: existing.originality_score,
                    clarity_score: existing.clarity_score,
                    literature_review_score: existing.literature_review_score,
                    methodology_score: existing.methodology_score,
                    impact_score: existing.impact_score,
                    publication_potential_score: existing.publication_potential_score,
                    budget_appropriateness_score: existing.budget_appropriateness_score,
                    timeline_practicality_score: existing.timeline_practicality_score,
                });
                setComments(existing.narrative_comments || '');
                setRecommendation((existing.recommendation as Stage1Recommendation) || '');
                setDetailedRecommendation(existing.detailed_recommendation || '');
            }
        } catch (err) {
            console.error("Failed to load assignment", err);
            setError("Failed to load review assignment. Please try again.");
            setAssignment(null);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        loadAssignment();
    }, [loadAssignment]);

    // Derived values — recalculated on every render (cheap since it's just 8 additions)
    const totalScore = Object.values(scores).reduce((sum, score) => sum + score, 0);
    const maxTotal = criteria.reduce((sum, c) => sum + c.maxScore, 0);
    const percentageScore = maxTotal > 0 ? Math.round((totalScore / maxTotal) * 100) : 0;

    /** Clamp the score to [0, maxScore] to prevent out-of-range values from manual input. */
    const handleScoreChange = (key: string, value: number, maxScore: number) => {
        const clampedValue = Math.max(0, Math.min(value, maxScore));
        setScores(prev => ({ ...prev, [key]: clampedValue }));
    };

    const handleSaveDraft = async () => {
        try {
            setSubmitting(true);
            setError(null);
            await assignmentApi.submitScore(Number(id), {
                ...scores,
                narrative_comments: comments,
                recommendation,
                detailed_recommendation: detailedRecommendation,
                is_draft: true,
            });
            alert('Draft saved successfully!');
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to save draft');
        } finally {
            setSubmitting(false);
        }
    };

    const handleSubmit = async () => {
        // Validate all scores are filled
        const hasEmptyScores = Object.values(scores).some(s => s == null);
        if (hasEmptyScores) {
            setError('Please provide scores for all criteria');
            return;
        }
        if (!comments.trim()) {
            setError('Please provide narrative comments');
            return;
        }
        if (!recommendation) {
            setError('Please select a recommendation');
            return;
        }
        if (!detailedRecommendation.trim()) {
            setError('Please provide detailed recommendation notes');
            return;
        }

        if (!window.confirm('Are you sure you want to submit this review? This action cannot be undone.')) {
            return;
        }

        try {
            setSubmitting(true);
            setError(null);
            await assignmentApi.submitScore(Number(id), {
                ...scores,
                narrative_comments: comments,
                recommendation,
                detailed_recommendation: detailedRecommendation,
                is_draft: false,
            });
            alert('Review submitted successfully!');
            navigate('/reviewer/dashboard');
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to submit review');
        } finally {
            setSubmitting(false);
        }
    };

    /**
     * Map a score ratio to a color band for the progress bar indicator.
     * Bands: >=80% green, >=60% yellow, >=40% orange, <40% red.
     */
    const getScoreColor = (score: number, max: number) => {
        const ratio = score / max;
        if (ratio >= 0.8) return 'bg-green-500';
        if (ratio >= 0.6) return 'bg-yellow-500';
        if (ratio >= 0.4) return 'bg-orange-500';
        return 'bg-red-500';
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <button
                        onClick={() => navigate('/reviewer/dashboard')}
                        className="flex items-center text-gray-600 hover:text-gray-900 mb-2"
                    >
                        <ArrowLeft size={16} className="mr-1" />
                        Back to Dashboard
                    </button>
                    <h1 className="text-2xl font-bold text-gray-900">Stage 1 Review</h1>
                    <p className="text-gray-500">{assignment?.proposal_code} - {assignment?.proposal_title}</p>
                </div>
                <div className="text-right">
                    <div className="text-sm text-gray-500">Deadline</div>
                    <div className="font-medium text-gray-900">
                        {assignment?.deadline && new Date(assignment.deadline).toLocaleDateString()}
                    </div>
                </div>
            </div>

            {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center text-red-700">
                    <AlertCircle size={20} className="mr-2" />
                    {error}
                </div>
            )}

            {/* Proposal Info Card */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-6 text-white">
                <div className="flex items-center mb-4">
                    <FileText size={24} className="mr-3" />
                    <h2 className="text-lg font-semibold">Proposal Details</h2>
                </div>
                <p className="text-blue-100 mb-4">
                    Please review the proposal document thoroughly before providing your scores.
                </p>
                <button
                    type="button"
                    onClick={() => handleOpenDocument(assignment?.proposal_file)}
                    className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                >
                    Download Proposal PDF
                </button>
            </div>

            {/* Scoring Form */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-6">Evaluation Criteria</h2>

                <div className="space-y-6">
                    {criteria.map((criterion) => (
                        <div key={criterion.key} className="border-b border-gray-100 pb-6 last:border-0">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <label className="block font-medium text-gray-900">
                                        {criterion.label}
                                        <span className="text-gray-400 font-normal ml-2">(0-{criterion.maxScore})</span>
                                    </label>
                                    <p className="text-sm text-gray-500">{criterion.description}</p>
                                </div>
                                <div className="text-right">
                                    <span className="text-2xl font-bold text-gray-900">{scores[criterion.key]}</span>
                                    <span className="text-gray-400">/{criterion.maxScore}</span>
                                </div>
                            </div>
                            <div className="flex items-center space-x-4">
                                <input
                                    type="range"
                                    min="0"
                                    max={criterion.maxScore}
                                    value={scores[criterion.key]}
                                    onChange={(e) => handleScoreChange(criterion.key, parseInt(e.target.value), criterion.maxScore)}
                                    className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                                />
                                <input
                                    type="number"
                                    min="0"
                                    max={criterion.maxScore}
                                    value={scores[criterion.key]}
                                    onChange={(e) => handleScoreChange(criterion.key, parseInt(e.target.value) || 0, criterion.maxScore)}
                                    className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-center"
                                />
                            </div>
                            <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                    className={`h-full ${getScoreColor(scores[criterion.key], criterion.maxScore)} transition-all`}
                                    style={{ width: `${(scores[criterion.key] / criterion.maxScore) * 100}%` }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Total Score */}
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl p-6 text-white">
                <div className="flex justify-between items-center">
                    <div>
                        <h3 className="text-lg font-semibold opacity-90">Total Score</h3>
                        <p className="text-sm opacity-75">Sum of all criteria scores</p>
                    </div>
                    <div className="text-right">
                        <div className="text-4xl font-bold">{totalScore}<span className="text-2xl opacity-75">/{maxTotal}</span></div>
                        <div className="text-lg opacity-90">{percentageScore}%</div>
                    </div>
                </div>
            </div>

            {/* Comments */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <label className="block font-medium text-gray-900 mb-2">
                    Narrative Comments <span className="text-red-500">*</span>
                </label>
                <p className="text-sm text-gray-500 mb-3">
                    Provide detailed feedback on the proposal's strengths, weaknesses, and suggestions for improvement.
                </p>
                <textarea
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    rows={6}
                    placeholder="Enter your detailed comments here..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
            </div>

            {/* Recommendation */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
                <div>
                    <label className="block font-medium text-gray-900 mb-2">
                        Recommendation <span className="text-red-500">*</span>
                    </label>
                    <select
                        value={recommendation}
                        onChange={(e) => setRecommendation(e.target.value as Stage1Recommendation)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="">Select recommendation</option>
                        <option value="ACCEPT">Accept</option>
                        <option value="TENTATIVELY_ACCEPT">Tentatively Accept</option>
                        <option value="REJECT">Reject</option>
                    </select>
                </div>
                <div>
                    <label className="block font-medium text-gray-900 mb-2">
                        Detailed Recommendation Notes <span className="text-red-500">*</span>
                    </label>
                    <p className="text-sm text-gray-500 mb-3">
                        Write detailed recommendation text to be included in Stage 1 reporting.
                    </p>
                    <textarea
                        value={detailedRecommendation}
                        onChange={(e) => setDetailedRecommendation(e.target.value)}
                        rows={5}
                        placeholder="Enter detailed recommendation and rationale..."
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
            </div>

            {/* Actions */}
            <div className="flex justify-between items-center">
                <button
                    onClick={() => navigate('/reviewer/dashboard')}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                    Cancel
                </button>
                <div className="flex space-x-3">
                    <button
                        onClick={handleSaveDraft}
                        disabled={submitting}
                        className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50"
                    >
                        <Save size={18} className="mr-2" />
                        Save Draft
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                        <Send size={18} className="mr-2" />
                        Submit Review
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Stage1ReviewForm;

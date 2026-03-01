/**
 * ============================================================================
 * CTRG PROCESS FLOW VISUALIZER
 * ============================================================================
 *
 * PURPOSE:
 * A visual, interactive diagram of the complete CTRG grant proposal lifecycle.
 * Helps SRC Chairs, Reviewers and PIs understand how proposals flow through
 * the two-stage review process.
 *
 * BASED ON:
 * "CTRG Two-Stage Research Grant Review Management System" requirements document
 *
 * SHOWS:
 * - All 10 proposal statuses (Mandatory from requirements §12)
 * - Stage 1 & Stage 2 review pipeline
 * - Decision points (Reject / Accept / Tentatively Accept)
 * - Which role acts at each step (SRC Chair / Reviewer / PI)
 * - Color-coded nodes matching the badge system in the app
 */

import React, { useState } from 'react';
import {
    FileText, Users, ClipboardCheck, CheckCircle, XCircle,
    AlertCircle, RefreshCw, ArrowRight, ArrowDown, Shield,
    GraduationCap, Eye, ChevronDown, ChevronUp, Info
} from 'lucide-react';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/** A single step/node in the process flow */
interface FlowNode {
    id: string;
    label: string;          // Short label shown on the node
    fullLabel: string;      // Full status name (from §12)
    description: string;    // What happens at this step
    role: 'PI' | 'Reviewer' | 'SRC Chair' | 'System';
    color: string;          // Tailwind bg color class
    borderColor: string;    // Tailwind border color class
    textColor: string;      // Tailwind text color class
    icon: React.ElementType;
    type: 'status' | 'decision' | 'action';
}

/** A clickable detail panel shown when a node is selected */
interface NodeDetail {
    who: string;            // Who performs this action
    does: string[];         // What they do
    next: string[];         // What happens next
    rule?: string;          // Special business rule
}

// ============================================================================
// FLOW NODE DATA (Based on §12 Proposal Status List)
// ============================================================================

const NODE_DETAILS: Record<string, NodeDetail> = {
    submitted: {
        who: 'PI / SRC Chair',
        does: [
            'Uploads full research proposal (PDF)',
            'Uploads Grant Application Template (PDF/Word)',
            'Provides title, department, email, fund requested',
            'Lists co-investigators (optional)',
        ],
        next: ['SRC Chair assigns reviewers → Under Stage 1 Review'],
        rule: 'Each proposal gets a unique identifier code',
    },
    stage1_review: {
        who: 'Reviewer (1–4 assigned)',
        does: [
            'Scores proposal on 8 criteria (0–100% total)',
            'Writes narrative comments',
            'Can save as draft before final submission',
            'Final submission is locked — cannot edit',
        ],
        next: ['SRC Chair sees all scores and makes Stage 1 Decision'],
        rule: 'SRC Chair can email reviewers with proposal details',
    },
    stage1_decision: {
        who: 'SRC Chair',
        does: [
            'Reviews all reviewer scores and average',
            'Reads all narrative comments',
            'Chooses: Reject / Accept / Tentatively Accept',
            'Adds optional chair comments',
        ],
        next: [
            'Reject → Stage 1 Rejected (final)',
            'Accept → Accepted No Corrections (final)',
            'Tentatively Accept → Revision Requested',
        ],
        rule: 'Decision date is recorded in the system',
    },
    revision: {
        who: 'PI',
        does: [
            'Views combined reviewer comments',
            'Uploads revised proposal (PDF)',
            'Optionally uploads "Response to Reviewers" document',
            'Sees countdown timer to deadline',
        ],
        next: ['Revised Proposal Submitted → Under Stage 2 Review'],
        rule: 'Default revision window: 7 days. Missed deadline → flagged/auto-rejected',
    },
    stage2_review: {
        who: 'Reviewer / SRC Chair',
        does: [
            'Views original proposal, revised proposal, original comments, PI responses',
            'Answers: Have concerns been addressed? (Yes/Partially/No)',
            'Gives revised recommendation (Accept/Reject)',
            'Optionally provides revised score',
        ],
        next: ['SRC Chair makes Final Decision'],
    },
    final_decision: {
        who: 'SRC Chair',
        does: [
            'Reviews Stage 1 reviews, revision, Stage 2 reviews',
            'Enters Final Decision: Accepted or Rejected',
            'Enters final approved grant amount',
            'Enters final remarks',
        ],
        next: ['Proposal is locked — no further changes'],
        rule: 'After finalization, proposal is permanently locked',
    },
};

// ============================================================================
// ROLE BADGE COMPONENT
// ============================================================================

/** Shows who acts at this step */
const RoleBadge: React.FC<{ role: FlowNode['role'] }> = ({ role }) => {
    const styles: Record<string, string> = {
        'PI': 'bg-purple-100 text-purple-800 border-purple-200',
        'Reviewer': 'bg-blue-100 text-blue-800 border-blue-200',
        'SRC Chair': 'bg-amber-100 text-amber-800 border-amber-200',
        'System': 'bg-gray-100 text-gray-600 border-gray-200',
    };
    const icons: Record<string, React.ElementType> = {
        'PI': GraduationCap,
        'Reviewer': ClipboardCheck,
        'SRC Chair': Shield,
        'System': RefreshCw,
    };
    const Icon = icons[role];
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${styles[role]}`}>
            <Icon size={10} />
            {role}
        </span>
    );
};

// ============================================================================
// CONNECTOR ARROW COMPONENT
// ============================================================================

const ArrowDown_: React.FC<{ label?: string }> = ({ label }) => (
    <div className="flex flex-col items-center my-1">
        <div className="w-0.5 h-4 bg-gray-300" />
        {label && (
            <span className="text-xs text-gray-500 bg-white px-2 py-0.5 rounded border border-gray-200 my-1 whitespace-nowrap">
                {label}
            </span>
        )}
        <div className="w-0.5 h-4 bg-gray-300" />
        <div className="w-0 h-0 border-l-4 border-r-4 border-t-8 border-l-transparent border-r-transparent border-t-gray-400" />
    </div>
);

// ============================================================================
// STATUS NODE COMPONENT
// ============================================================================

interface StatusNodeProps {
    id: string;
    number?: number;       // Status number from §12
    label: string;
    sublabel?: string;
    role: FlowNode['role'];
    color: string;
    icon: React.ElementType;
    isSelected: boolean;
    onClick: () => void;
    pulse?: boolean;       // Highlight as "active" node
}

const StatusNode: React.FC<StatusNodeProps> = ({
    id, number, label, sublabel, role, color, icon: Icon,
    isSelected, onClick, pulse
}) => (
    <button
        onClick={onClick}
        className={`
            relative w-full max-w-xs text-left rounded-xl border-2 p-3 transition-all duration-200
            hover:shadow-md hover:scale-105 focus:outline-none
            ${color}
            ${isSelected ? 'ring-4 ring-offset-2 ring-blue-400 shadow-lg scale-105' : ''}
            ${pulse ? 'animate-pulse' : ''}
        `}
    >
        {/* Status number badge */}
        {number && (
            <span className="absolute -top-2.5 -left-2.5 w-6 h-6 rounded-full bg-gray-700 text-white text-xs flex items-center justify-center font-bold shadow">
                {number}
            </span>
        )}

        <div className="flex items-start gap-2">
            <div className="p-1.5 rounded-lg bg-white/50 flex-shrink-0">
                <Icon size={16} />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold leading-tight">{label}</p>
                {sublabel && <p className="text-xs opacity-70 mt-0.5">{sublabel}</p>}
                <div className="mt-1.5">
                    <RoleBadge role={role} />
                </div>
            </div>
            <Info size={14} className="opacity-40 flex-shrink-0 mt-0.5" />
        </div>
    </button>
);

// ============================================================================
// DECISION DIAMOND COMPONENT
// ============================================================================

const DecisionDiamond: React.FC<{ label: string; isSelected: boolean; onClick: () => void }> = ({
    label, isSelected, onClick
}) => (
    <button
        onClick={onClick}
        className={`
            relative transition-all duration-200 hover:scale-105 focus:outline-none
            ${isSelected ? 'scale-110' : ''}
        `}
        title="Click to see decision options"
    >
        {/* Diamond shape using CSS transform */}
        <div className={`
            w-32 h-32 bg-amber-100 border-2 border-amber-400 rotate-45 mx-auto
            flex items-center justify-center
            ${isSelected ? 'ring-4 ring-offset-2 ring-amber-400 bg-amber-200' : ''}
            hover:bg-amber-200 transition-colors
        `} />
        {/* Text overlay (counter-rotated) */}
        <div className="absolute inset-0 flex items-center justify-center">
            <div className="-rotate-0 text-center px-2">
                <Shield size={16} className="mx-auto text-amber-700 mb-1" />
                <p className="text-xs font-bold text-amber-800 leading-tight">{label}</p>
                <p className="text-xs text-amber-600 mt-0.5">SRC Chair</p>
            </div>
        </div>
    </button>
);

// ============================================================================
// DETAIL PANEL COMPONENT
// ============================================================================

const DetailPanel: React.FC<{ nodeId: string | null; onClose: () => void }> = ({ nodeId, onClose }) => {
    if (!nodeId || !NODE_DETAILS[nodeId]) return null;
    const detail = NODE_DETAILS[nodeId];

    const titles: Record<string, string> = {
        submitted: '1. Proposal Submission',
        stage1_review: '2. Stage 1 Review',
        stage1_decision: '3. Stage 1 Decision',
        revision: '4. Revision Process',
        stage2_review: '5. Stage 2 Review',
        final_decision: '6. Final Decision',
    };

    return (
        <div className="mt-6 bg-white rounded-xl border-2 border-blue-200 shadow-lg overflow-hidden animate-fade-in">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-5 py-3 flex items-center justify-between">
                <h3 className="text-white font-semibold text-sm">{titles[nodeId] || nodeId}</h3>
                <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
                    <XCircle size={18} />
                </button>
            </div>

            <div className="p-5 space-y-4">
                {/* Who */}
                <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                        Who acts here
                    </p>
                    <p className="text-sm font-medium text-gray-800 flex items-center gap-2">
                        <Users size={14} className="text-blue-500" />
                        {detail.who}
                    </p>
                </div>

                {/* What they do */}
                <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                        Actions performed
                    </p>
                    <ul className="space-y-1.5">
                        {detail.does.map((action, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                                <CheckCircle size={13} className="text-green-500 flex-shrink-0 mt-0.5" />
                                {action}
                            </li>
                        ))}
                    </ul>
                </div>

                {/* What happens next */}
                <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                        What happens next
                    </p>
                    <ul className="space-y-1.5">
                        {detail.next.map((next, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                                <ArrowRight size={13} className="text-blue-500 flex-shrink-0 mt-0.5" />
                                {next}
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Business rule */}
                {detail.rule && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                        <p className="text-xs font-semibold text-amber-800 uppercase tracking-wider mb-1">
                            Business Rule
                        </p>
                        <p className="text-sm text-amber-900">{detail.rule}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

// ============================================================================
// STATUS LEGEND COMPONENT
// ============================================================================

const StatusLegend: React.FC = () => {
    const [open, setOpen] = useState(false);

    // All 10 mandatory statuses from §12
    const statuses = [
        { n: 1,  label: 'Submitted',                    color: 'bg-blue-100 text-blue-800 border-blue-200' },
        { n: 2,  label: 'Under Stage 1 Review',         color: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
        { n: 3,  label: 'Stage 1 Rejected',             color: 'bg-red-100 text-red-800 border-red-200' },
        { n: 4,  label: 'Accepted (No Corrections)',    color: 'bg-green-100 text-green-800 border-green-200' },
        { n: 5,  label: 'Tentatively Accepted',         color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
        { n: 6,  label: 'Revision Requested',           color: 'bg-orange-100 text-orange-800 border-orange-200' },
        { n: 7,  label: 'Revised Proposal Submitted',   color: 'bg-cyan-100 text-cyan-800 border-cyan-200' },
        { n: 8,  label: 'Under Stage 2 Review',         color: 'bg-violet-100 text-violet-800 border-violet-200' },
        { n: 9,  label: 'Final Accepted',               color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
        { n: 10, label: 'Final Rejected',               color: 'bg-red-100 text-red-800 border-red-200' },
    ];

    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <button
                onClick={() => setOpen(!open)}
                className="w-full px-5 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
                <span className="font-semibold text-sm text-gray-700 flex items-center gap-2">
                    <FileText size={16} className="text-blue-500" />
                    All 10 Proposal Statuses (§12 Mandatory)
                </span>
                {open ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
            </button>
            {open && (
                <div className="px-5 pb-4 pt-1 grid grid-cols-2 gap-2">
                    {statuses.map(s => (
                        <div key={s.n} className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium ${s.color}`}>
                            <span className="w-5 h-5 rounded-full bg-white/60 flex items-center justify-center text-xs font-bold">
                                {s.n}
                            </span>
                            {s.label}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// ============================================================================
// SCORING REFERENCE COMPONENT
// ============================================================================

const ScoringReference: React.FC = () => {
    const [open, setOpen] = useState(false);

    // Stage 1 scoring criteria from §7
    const criteria = [
        { label: 'Originality of proposed research',           max: 15 },
        { label: 'Clarity & rationality of research question', max: 15 },
        { label: 'Literature review',                          max: 15 },
        { label: 'Appropriateness of methodology',             max: 15 },
        { label: 'Potential impact / Policy implication',      max: 15 },
        { label: 'Potential for publication / dissemination',  max: 10 },
        { label: 'Appropriateness of proposed budget',         max: 10 },
        { label: 'Practicality of proposed time frame',        max:  5 },
    ];
    const total = criteria.reduce((s, c) => s + c.max, 0); // Should be 100

    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <button
                onClick={() => setOpen(!open)}
                className="w-full px-5 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
                <span className="font-semibold text-sm text-gray-700 flex items-center gap-2">
                    <ClipboardCheck size={16} className="text-indigo-500" />
                    Stage 1 Scoring Criteria (Total: {total} pts = 100%)
                </span>
                {open ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
            </button>
            {open && (
                <div className="px-5 pb-4 pt-1 space-y-2">
                    {criteria.map((c, i) => (
                        <div key={i} className="flex items-center gap-3">
                            {/* Score bar */}
                            <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden relative">
                                <div
                                    className="h-full bg-gradient-to-r from-indigo-500 to-blue-500 rounded-full flex items-center"
                                    style={{ width: `${(c.max / 15) * 100}%` }}
                                />
                                <span className="absolute inset-0 flex items-center px-2 text-xs text-gray-700 font-medium">
                                    {c.label}
                                </span>
                            </div>
                            <span className="text-xs font-bold text-indigo-700 w-10 text-right flex-shrink-0">
                                0–{c.max}
                            </span>
                        </div>
                    ))}
                    <div className="flex justify-end pt-1 border-t border-gray-100">
                        <span className="text-xs font-bold text-gray-700">
                            Total → converted to 0–100%
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const ProcessFlowVisualizer: React.FC = () => {
    // Track which node is currently selected (shows detail panel)
    const [selectedNode, setSelectedNode] = useState<string | null>(null);

    /** Toggle: clicking same node deselects, clicking different selects */
    const handleNodeClick = (id: string) => {
        setSelectedNode(prev => prev === id ? null : id);
    };

    return (
        <div className="space-y-6">

            {/* ================================================================
                PAGE HEADER
            ================================================================ */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Process Flow Visualizer</h1>
                    <p className="text-gray-500 mt-1 text-sm">
                        Complete CTRG two-stage grant review lifecycle — click any node to explore
                    </p>
                </div>
                {/* Legend chips */}
                <div className="flex flex-wrap gap-2 text-xs">
                    {[
                        { label: 'PI', color: 'bg-purple-100 text-purple-800 border-purple-200' },
                        { label: 'Reviewer', color: 'bg-blue-100 text-blue-800 border-blue-200' },
                        { label: 'SRC Chair', color: 'bg-amber-100 text-amber-800 border-amber-200' },
                        { label: 'System', color: 'bg-gray-100 text-gray-600 border-gray-200' },
                    ].map(r => (
                        <span key={r.label} className={`px-2 py-1 rounded-full border font-medium ${r.color}`}>
                            {r.label}
                        </span>
                    ))}
                </div>
            </div>

            {/* ================================================================
                MAIN FLOW DIAGRAM
            ================================================================ */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

                {/* ---- LEFT COLUMN: Flow diagram ---- */}
                <div className="xl:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm p-6">

                    {/* STAGE LABELS */}
                    <div className="grid grid-cols-3 gap-2 mb-6">
                        {[
                            { label: 'SUBMISSION', color: 'bg-blue-50 border-blue-200 text-blue-700' },
                            { label: 'STAGE 1 REVIEW', color: 'bg-indigo-50 border-indigo-200 text-indigo-700' },
                            { label: 'STAGE 2 REVIEW', color: 'bg-violet-50 border-violet-200 text-violet-700' },
                        ].map(s => (
                            <div key={s.label} className={`rounded-lg border px-3 py-2 text-center text-xs font-bold tracking-wider ${s.color}`}>
                                {s.label}
                            </div>
                        ))}
                    </div>

                    {/* FLOW — rendered as a centered vertical/branching layout */}
                    <div className="flex flex-col items-center space-y-0">

                        {/* ── STEP 1: Submission ── */}
                        <StatusNode
                            id="submitted"
                            number={1}
                            label="Proposal Submitted"
                            sublabel="Unique ID assigned"
                            role="PI"
                            color="bg-blue-50 border-blue-400 text-blue-900"
                            icon={FileText}
                            isSelected={selectedNode === 'submitted'}
                            onClick={() => handleNodeClick('submitted')}
                        />

                        <ArrowDown_ label="SRC Chair assigns reviewers" />

                        {/* ── STEP 2: Stage 1 Review ── */}
                        <StatusNode
                            id="stage1_review"
                            number={2}
                            label="Under Stage 1 Review"
                            sublabel="1–4 reviewers score proposal"
                            role="Reviewer"
                            color="bg-indigo-50 border-indigo-400 text-indigo-900"
                            icon={ClipboardCheck}
                            isSelected={selectedNode === 'stage1_review'}
                            onClick={() => handleNodeClick('stage1_review')}
                        />

                        <ArrowDown_ label="All reviews submitted" />

                        {/* ── DECISION 1: Stage 1 Decision (Diamond) ── */}
                        <DecisionDiamond
                            label="Stage 1 Decision"
                            isSelected={selectedNode === 'stage1_decision'}
                            onClick={() => handleNodeClick('stage1_decision')}
                        />

                        {/* ── THREE BRANCHES from Stage 1 Decision ── */}
                        <div className="w-full flex justify-center gap-2 mt-2">
                            {/* Branch divider line */}
                            <div className="w-full max-w-2xl relative flex items-start justify-between">
                                {/* Horizontal connector line */}
                                <div className="absolute top-0 left-1/6 right-1/6 h-0.5 bg-gray-300" />

                                {/* Branch A: Reject */}
                                <div className="flex flex-col items-center gap-1 w-1/3 px-2">
                                    <div className="w-0.5 h-6 bg-red-300" />
                                    <div className="w-full">
                                        <div className="text-center text-xs text-red-500 font-semibold mb-1">❌ Reject</div>
                                        <div className={`
                                            rounded-xl border-2 p-3 text-center cursor-pointer transition-all hover:scale-105
                                            bg-red-50 border-red-400 text-red-900
                                            ${selectedNode === 'stage1_rejected' ? 'ring-4 ring-red-300 shadow-lg scale-105' : ''}
                                        `} onClick={() => setSelectedNode(prev => prev === 'stage1_rejected' ? null : 'stage1_rejected')}>
                                            <XCircle size={20} className="mx-auto text-red-500 mb-1" />
                                            <p className="text-xs font-bold">Stage 1 Rejected</p>
                                            <p className="text-xs opacity-60 mt-0.5">Status #3</p>
                                            <div className="mt-1.5 flex justify-center">
                                                <span className="text-xs bg-white/60 px-2 py-0.5 rounded-full border border-red-200 font-semibold text-red-700">
                                                    FINAL
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Branch B: Accept */}
                                <div className="flex flex-col items-center gap-1 w-1/3 px-2">
                                    <div className="w-0.5 h-6 bg-green-300" />
                                    <div className="w-full">
                                        <div className="text-center text-xs text-green-600 font-semibold mb-1">✅ Accept</div>
                                        <div className={`
                                            rounded-xl border-2 p-3 text-center cursor-pointer transition-all hover:scale-105
                                            bg-green-50 border-green-400 text-green-900
                                            ${selectedNode === 'accepted_no_corrections' ? 'ring-4 ring-green-300 shadow-lg scale-105' : ''}
                                        `} onClick={() => setSelectedNode(prev => prev === 'accepted_no_corrections' ? null : 'accepted_no_corrections')}>
                                            <CheckCircle size={20} className="mx-auto text-green-500 mb-1" />
                                            <p className="text-xs font-bold">Accepted</p>
                                            <p className="text-xs opacity-60 mt-0.5">No Corrections — #4</p>
                                            <div className="mt-1.5 flex justify-center">
                                                <span className="text-xs bg-white/60 px-2 py-0.5 rounded-full border border-green-200 font-semibold text-green-700">
                                                    FINAL
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Branch C: Tentatively Accept → continues down */}
                                <div className="flex flex-col items-center gap-1 w-1/3 px-2">
                                    <div className="w-0.5 h-6 bg-yellow-300" />
                                    <div className="w-full">
                                        <div className="text-center text-xs text-yellow-600 font-semibold mb-1">⚠️ Tentative</div>
                                        <div className={`
                                            rounded-xl border-2 p-3 text-center cursor-pointer transition-all hover:scale-105
                                            bg-yellow-50 border-yellow-400 text-yellow-900
                                            ${selectedNode === 'tentatively_accepted' ? 'ring-4 ring-yellow-300 shadow-lg scale-105' : ''}
                                        `} onClick={() => setSelectedNode(prev => prev === 'tentatively_accepted' ? null : 'tentatively_accepted')}>
                                            <AlertCircle size={20} className="mx-auto text-yellow-500 mb-1" />
                                            <p className="text-xs font-bold">Tentatively Accepted</p>
                                            <p className="text-xs opacity-60 mt-0.5">Status #5</p>
                                            <div className="mt-1.5 flex justify-center">
                                                <ArrowDown size={14} className="text-yellow-500" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ── Continue from Tentatively Accepted ── */}
                        <div className="flex flex-col items-center w-full mt-2">
                            <div className="text-xs text-gray-400 italic mb-1">
                                (Stage 2 path — only for Tentatively Accepted proposals)
                            </div>

                            <ArrowDown_ label="System notifies PI · starts 7-day timer" />

                            {/* ── STEP 3: Revision ── */}
                            <StatusNode
                                id="revision"
                                number={6}
                                label="Revision Requested"
                                sublabel="PI uploads revised proposal"
                                role="PI"
                                color="bg-orange-50 border-orange-400 text-orange-900"
                                icon={RefreshCw}
                                isSelected={selectedNode === 'revision'}
                                onClick={() => handleNodeClick('revision')}
                            />

                            {/* Deadline missed branch */}
                            <div className="flex items-center gap-3 my-1">
                                <div className="flex-1 border-t border-dashed border-red-300" />
                                <span className="text-xs text-red-400 flex items-center gap-1">
                                    <AlertCircle size={10} />
                                    If deadline missed → flagged/auto-rejected
                                </span>
                                <div className="flex-1 border-t border-dashed border-red-300" />
                            </div>

                            <ArrowDown_ label="PI submits revision" />

                            {/* ── STEP 4: Revised Submitted ── */}
                            <StatusNode
                                id="revised_submitted"
                                number={7}
                                label="Revised Proposal Submitted"
                                sublabel="PI responses included"
                                role="System"
                                color="bg-cyan-50 border-cyan-400 text-cyan-900"
                                icon={FileText}
                                isSelected={selectedNode === 'revised_submitted'}
                                onClick={() => setSelectedNode(prev => prev === 'revised_submitted' ? null : 'revised_submitted')}
                            />

                            <ArrowDown_ label="SRC Chair starts Stage 2" />

                            {/* ── STEP 5: Stage 2 Review ── */}
                            <StatusNode
                                id="stage2_review"
                                number={8}
                                label="Under Stage 2 Review"
                                sublabel="Checks if concerns were addressed"
                                role="Reviewer"
                                color="bg-violet-50 border-violet-400 text-violet-900"
                                icon={Eye}
                                isSelected={selectedNode === 'stage2_review'}
                                onClick={() => handleNodeClick('stage2_review')}
                            />

                            <ArrowDown_ label="Stage 2 reviews submitted" />

                            {/* ── DECISION 2: Final Decision (Diamond) ── */}
                            <DecisionDiamond
                                label="Final Decision"
                                isSelected={selectedNode === 'final_decision'}
                                onClick={() => handleNodeClick('final_decision')}
                            />

                            {/* Final branches */}
                            <div className="w-full max-w-xs flex justify-around mt-2 gap-4">
                                <div className="flex flex-col items-center gap-1 flex-1">
                                    <div className="w-0.5 h-5 bg-emerald-300" />
                                    <div className={`
                                        w-full rounded-xl border-2 p-3 text-center cursor-pointer transition-all hover:scale-105
                                        bg-emerald-50 border-emerald-400 text-emerald-900
                                        ${selectedNode === 'final_accepted' ? 'ring-4 ring-emerald-300 shadow-lg scale-105' : ''}
                                    `} onClick={() => setSelectedNode(prev => prev === 'final_accepted' ? null : 'final_accepted')}>
                                        <CheckCircle size={18} className="mx-auto text-emerald-500 mb-1" />
                                        <p className="text-xs font-bold">Final Accepted</p>
                                        <p className="text-xs opacity-60">Status #9</p>
                                        <div className="mt-1 flex justify-center">
                                            <span className="text-xs bg-white/60 px-2 py-0.5 rounded-full border border-emerald-200 font-semibold text-emerald-700">
                                                FUNDED 💰
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col items-center gap-1 flex-1">
                                    <div className="w-0.5 h-5 bg-red-300" />
                                    <div className={`
                                        w-full rounded-xl border-2 p-3 text-center cursor-pointer transition-all hover:scale-105
                                        bg-red-50 border-red-400 text-red-900
                                        ${selectedNode === 'final_rejected' ? 'ring-4 ring-red-300 shadow-lg scale-105' : ''}
                                    `} onClick={() => setSelectedNode(prev => prev === 'final_rejected' ? null : 'final_rejected')}>
                                        <XCircle size={18} className="mx-auto text-red-500 mb-1" />
                                        <p className="text-xs font-bold">Final Rejected</p>
                                        <p className="text-xs opacity-60">Status #10</p>
                                        <div className="mt-1 flex justify-center">
                                            <span className="text-xs bg-white/60 px-2 py-0.5 rounded-full border border-red-200 font-semibold text-red-700">
                                                FINAL
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Interaction hint */}
                    <p className="text-center text-xs text-gray-400 mt-6 flex items-center justify-center gap-1">
                        <Info size={12} />
                        Click any node to see detailed actions and business rules
                    </p>
                </div>

                {/* ---- RIGHT COLUMN: Details panel + References ---- */}
                <div className="space-y-4">

                    {/* Detail panel (shown when a node is clicked) */}
                    {selectedNode && NODE_DETAILS[selectedNode] ? (
                        <DetailPanel
                            nodeId={selectedNode}
                            onClose={() => setSelectedNode(null)}
                        />
                    ) : (
                        /* Placeholder when nothing selected */
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 text-center">
                            <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-3">
                                <Info size={24} className="text-blue-400" />
                            </div>
                            <p className="text-sm font-medium text-gray-700 mb-1">Click any node</p>
                            <p className="text-xs text-gray-400">
                                Select a step in the flow to see who acts, what they do, and what happens next.
                            </p>
                        </div>
                    )}

                    {/* Key stats from requirements */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 space-y-3">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Key System Rules</p>
                        {[
                            { icon: Users, label: 'Reviewers per proposal', value: '1–4 (default 2)', color: 'text-blue-600' },
                            { icon: RefreshCw, label: 'Revision window', value: '7 days (default)', color: 'text-orange-600' },
                            { icon: CheckCircle, label: 'Acceptance threshold', value: '70% (editable)', color: 'text-green-600' },
                            { icon: FileText, label: 'Max proposals/cycle', value: '500+', color: 'text-indigo-600' },
                            { icon: AlertCircle, label: 'File upload size', value: 'Min 50 MB', color: 'text-amber-600' },
                        ].map(r => (
                            <div key={r.label} className="flex items-center gap-3 text-sm">
                                <r.icon size={14} className={r.color} />
                                <span className="text-gray-600 flex-1">{r.label}</span>
                                <span className="font-semibold text-gray-800">{r.value}</span>
                            </div>
                        ))}
                    </div>

                    {/* Status legend (collapsible) */}
                    <StatusLegend />

                    {/* Scoring criteria (collapsible) */}
                    <ScoringReference />
                </div>
            </div>
        </div>
    );
};

export default ProcessFlowVisualizer;

/**
 * Proposal Form Component.
 *
 * Handles both creating new proposals and editing existing drafts (determined
 * by the presence of an :id route param). The form supports two submit paths:
 *
 * 1. **Save Draft** — persists the current form state without validation,
 *    allowing the PI to return later and continue editing.
 * 2. **Submit Proposal** — validates all required fields, saves, then
 *    transitions the proposal status from DRAFT to SUBMITTED (irreversible).
 *
 * File uploads are validated client-side for type (PDF/Word) and size (50MB)
 * before being sent as multipart/form-data to the backend.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Save, Send, ArrowLeft, Upload, FileText, AlertCircle, X } from 'lucide-react';
import { proposalApi, cycleApi, type GrantCycle } from '../../services/api';
import { useAuth } from '../auth/AuthContext';

/** Shape of the local form state — matches backend ProposalSerializer fields. */
interface ProposalFormData {
    title: string;
    abstract: string;
    pi_name: string;
    pi_department: string;
    pi_email: string;
    co_investigators: string;
    fund_requested: number;
    cycle: number | '';
    keywords_input: string;
    /** New file selected by the user (not yet uploaded) */
    file: File | null;
    /** New application template file selected by the user */
    templateFile: File | null;
}

/** 50MB — matches the backend's upload size limit */
const MAX_FILE_SIZE = 50 * 1024 * 1024;

const ProposalForm: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { role } = useAuth();
    // When id is present in the URL, we're editing an existing draft
    const isEditing = !!id;
    const returnPath = role === 'SRC_Chair' ? '/admin/proposals' : '/pi/dashboard';
    const returnLabel = role === 'SRC_Chair' ? 'Back to Proposals' : 'Back to Dashboard';

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    // Only active cycles are shown in the dropdown (filtered in loadData)
    const [cycles, setCycles] = useState<GrantCycle[]>([]);

    const [formData, setFormData] = useState<ProposalFormData>({
        title: '',
        abstract: '',
        pi_name: '',
        pi_department: '',
        pi_email: '',
        co_investigators: '',
        fund_requested: 0,
        cycle: '',
        keywords_input: '',
        file: null,
        templateFile: null,
    });
    // Track previously uploaded files so we can display them even when no new file is selected
    const [existingFile, setExistingFile] = useState<string | null>(null);
    const [existingTemplate, setExistingTemplate] = useState<string | null>(null);

    /** Load active grant cycles and (if editing) the existing proposal data. */
    const loadData = useCallback(async () => {
        try {
            setLoading(true);

            // Load grant cycles
            try {
                const cycleRes = await cycleApi.getAll();
                setCycles(cycleRes.data.filter(c => c.is_active));
            } catch (err) {
                console.error("Failed to load cycles", err);
                setError("Failed to load grant cycles.");
            }

            // Load existing proposal if editing
            if (id) {
                try {
                    const propRes = await proposalApi.getById(Number(id));
                    setFormData({
                        title: propRes.data.title,
                        abstract: propRes.data.abstract,
                        pi_name: propRes.data.pi_name || '',
                        pi_department: propRes.data.pi_department || '',
                        pi_email: propRes.data.pi_email || '',
                        co_investigators: propRes.data.co_investigators || '',
                        fund_requested: propRes.data.fund_requested,
                        cycle: propRes.data.cycle,
                        keywords_input: (propRes.data.keywords || []).join(', '),
                        file: null,
                        templateFile: null,
                    });
                    setExistingFile(propRes.data.proposal_file || null);
                    setExistingTemplate((propRes.data as any).application_template_file || null);
                    if (role !== 'SRC_Chair' && propRes.data.status !== 'DRAFT') {
                        navigate(`/pi/proposals/${propRes.data.id}/view`, { replace: true });
                        return;
                    }
                } catch (err) {
                    console.error("Failed to load proposal", err);
                    setError("Failed to load proposal details.");
                    navigate(returnPath);
                }
            }
        } finally {
            setLoading(false);
        }
    }, [id, navigate, returnPath, role]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'fund_requested' || name === 'cycle' ? (value ? Number(value) : '') : value,
        }));
    };

    /** Validate file type and size before accepting the proposal document upload. */
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > MAX_FILE_SIZE) {
                setError('File size exceeds 50MB limit');
                return;
            }
            // Accept PDF (.pdf), legacy Word (.doc), and modern Word (.docx)
            if (!['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(file.type)) {
                setError('Only PDF and Word documents are allowed');
                return;
            }
            setFormData(prev => ({ ...prev, file }));
            setError(null);
        }
    };

    const handleTemplateFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > MAX_FILE_SIZE) {
                setError('File size exceeds 50MB limit');
                return;
            }
            if (!['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(file.type)) {
                setError('Only PDF and Word documents are allowed');
                return;
            }
            setFormData(prev => ({ ...prev, templateFile: file }));
            setError(null);
        }
    };

    const removeFile = () => {
        setFormData(prev => ({ ...prev, file: null }));
    };

    const removeTemplateFile = () => {
        setFormData(prev => ({ ...prev, templateFile: null }));
    };

    /** Validate required fields before formal submission (not needed for drafts). */
    const validateForm = (): boolean => {
        if (!formData.title.trim()) {
            setError('Title is required');
            return false;
        }
        if (!formData.abstract.trim()) {
            setError('Abstract is required');
            return false;
        }
        if (!formData.cycle) {
            setError('Please select a grant cycle');
            return false;
        }
        if (formData.fund_requested <= 0) {
            setError('Please enter a valid funding amount');
            return false;
        }
        if (!formData.keywords_input.trim()) {
            setError('Please add at least one keyword');
            return false;
        }
        if (!isEditing && !formData.file && !existingFile) {
            setError('Please upload a proposal document');
            return false;
        }
        return true;
    };

    /** Convert local state into a FormData object for multipart upload. */
    const buildFormData = () => {
        const data = new FormData();
        data.append('title', formData.title);
        data.append('abstract', formData.abstract);
        if (formData.pi_name) data.append('pi_name', formData.pi_name);
        if (formData.pi_department) data.append('pi_department', formData.pi_department);
        if (formData.pi_email) data.append('pi_email', formData.pi_email);
        if (formData.co_investigators) data.append('co_investigators', formData.co_investigators);
        data.append('fund_requested', String(formData.fund_requested));
        data.append('cycle', String(formData.cycle));
        data.append('keywords_input', formData.keywords_input.trim());
        if (formData.file) data.append('proposal_file', formData.file);
        if (formData.templateFile) data.append('application_template_file', formData.templateFile);
        return data;
    };

    /** Save Draft: persists current form state without validation.
     *  Creates a new proposal or updates the existing one, then navigates away. */
    const handleSaveDraft = async () => {
        try {
            setSubmitting(true);
            setError(null);

            const data = buildFormData();

            if (isEditing) {
                await proposalApi.update(Number(id), data);
            } else {
                await proposalApi.create(data);
            }

            alert('Draft saved successfully!');
            navigate(returnPath);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to save draft');
        } finally {
            setSubmitting(false);
        }
    };

    /** Submit Proposal: validates, saves, then calls the separate submit endpoint.
     *  This is a two-step process because the backend requires the proposal to
     *  exist (with a file) before it can transition to SUBMITTED status. */
    const handleSubmit = async () => {
        if (!validateForm()) return;

        // Confirmation dialog — submission is irreversible
        if (!window.confirm('Are you sure you want to submit this proposal? You will not be able to edit it after submission.')) {
            return;
        }

        try {
            setSubmitting(true);
            setError(null);

            const data = buildFormData();
            let proposalId = isEditing ? Number(id) : null;

            // Step 1: Save/create the proposal with all form data and files
            if (isEditing && proposalId !== null) {
                await proposalApi.update(proposalId, data);
            } else {
                const createResponse = await proposalApi.create(data);
                proposalId = createResponse.data.id;
            }

            if (proposalId === null || Number.isNaN(proposalId)) {
                throw new Error('Unable to determine proposal ID for submission');
            }

            // Step 2: Transition status from DRAFT -> SUBMITTED
            await proposalApi.submit(proposalId);

            alert('Proposal submitted successfully!');
            navigate(returnPath);
        } catch (err: any) {
            setError(err.response?.data?.error || err.message || 'Failed to submit proposal');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            {/* Header */}
            <div>
                <button
                    onClick={() => navigate(returnPath)}
                    className="flex items-center text-gray-600 hover:text-gray-900 mb-2"
                >
                    <ArrowLeft size={16} className="mr-1" />
                    {returnLabel}
                </button>
                <h1 className="text-2xl font-bold text-gray-900">
                    {isEditing ? 'Edit Proposal' : 'New Proposal'}
                </h1>
                <p className="text-gray-500">
                    {isEditing ? 'Continue working on your draft proposal' : 'Submit a new research grant proposal'}
                </p>
            </div>

            {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center text-red-700">
                    <AlertCircle size={20} className="mr-2 flex-shrink-0" />
                    {error}
                </div>
            )}

            {/* Form */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
                {/* Grant Cycle */}
                <div>
                    <label className="block font-medium text-gray-900 mb-2">
                        Grant Cycle <span className="text-red-500">*</span>
                    </label>
                    <select
                        name="cycle"
                        value={formData.cycle}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="">Select a grant cycle</option>
                        {cycles.map(cycle => (
                            <option key={cycle.id} value={cycle.id}>
                                {cycle.name} ({cycle.year}){cycle.end_date ? ` - Deadline: ${new Date(cycle.end_date).toLocaleDateString()}` : ''}
                            </option>
                        ))}
                    </select>
                </div>

                {/* PI Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block font-medium text-gray-900 mb-2">
                            PI Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            name="pi_name"
                            value={formData.pi_name}
                            onChange={handleChange}
                            placeholder="Principal Investigator name"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block font-medium text-gray-900 mb-2">
                            Department <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            name="pi_department"
                            value={formData.pi_department}
                            onChange={handleChange}
                            placeholder="e.g., Computer Science"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block font-medium text-gray-900 mb-2">
                            PI Email <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="email"
                            name="pi_email"
                            value={formData.pi_email}
                            onChange={handleChange}
                            placeholder="pi@nsu.edu"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block font-medium text-gray-900 mb-2">
                            Co-Investigators
                        </label>
                        <input
                            type="text"
                            name="co_investigators"
                            value={formData.co_investigators}
                            onChange={handleChange}
                            placeholder="Comma-separated names (optional)"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                </div>

                {/* Title */}
                <div>
                    <label className="block font-medium text-gray-900 mb-2">
                        Proposal Title <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        name="title"
                        value={formData.title}
                        onChange={handleChange}
                        placeholder="Enter a descriptive title for your research proposal"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>

                {/* Abstract */}
                <div>
                    <label className="block font-medium text-gray-900 mb-2">
                        Abstract <span className="text-red-500">*</span>
                    </label>
                    <p className="text-sm text-gray-500 mb-2">
                        Provide a brief summary of your research proposal (300-500 words recommended)
                    </p>
                    <textarea
                        name="abstract"
                        value={formData.abstract}
                        onChange={handleChange}
                        rows={6}
                        placeholder="Describe the objectives, methodology, and expected outcomes of your research..."
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>

                {/* Funding Amount */}
                <div>
                    <label className="block font-medium text-gray-900 mb-2">
                        Requested Funding (USD) <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                        <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                        <input
                            type="number"
                            name="fund_requested"
                            value={formData.fund_requested || ''}
                            onChange={handleChange}
                            placeholder="0"
                            min="0"
                            step="1000"
                            className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                </div>

                {/* Keywords */}
                <div>
                    <label className="block font-medium text-gray-900 mb-2">
                        Research Keywords <span className="text-red-500">*</span>
                    </label>
                    <p className="text-sm text-gray-500 mb-2">
                        Enter 3-10 keywords separated by commas. Example: machine learning, computer vision, optimization
                    </p>
                    <input
                        type="text"
                        name="keywords_input"
                        value={formData.keywords_input}
                        onChange={handleChange}
                        placeholder="keyword1, keyword2, keyword3"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>

                {/* File Upload */}
                <div>
                    <label className="block font-medium text-gray-900 mb-2">
                        Proposal Document <span className="text-red-500">*</span>
                    </label>
                    <p className="text-sm text-gray-500 mb-3">
                        Upload your full proposal document (PDF or Word, max 50MB)
                    </p>

                    {existingFile && !formData.file && (
                        <div className="mb-3 p-3 bg-gray-50 rounded-lg flex items-center justify-between">
                            <div className="flex items-center">
                                <FileText size={20} className="text-gray-500 mr-2" />
                                <span className="text-sm text-gray-700">Current file: {existingFile}</span>
                            </div>
                        </div>
                    )}

                    {formData.file ? (
                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
                            <div className="flex items-center">
                                <FileText size={24} className="text-blue-600 mr-3" />
                                <div>
                                    <p className="font-medium text-gray-900">{formData.file.name}</p>
                                    <p className="text-sm text-gray-500">
                                        {(formData.file.size / (1024 * 1024)).toFixed(2)} MB
                                    </p>
                                </div>
                            </div>
                            <button onClick={removeFile} className="text-gray-400 hover:text-red-600">
                                <X size={20} />
                            </button>
                        </div>
                    ) : (
                        <label className="block cursor-pointer">
                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 hover:bg-blue-50 transition-colors">
                                <Upload size={40} className="mx-auto text-gray-400 mb-3" />
                                <p className="font-medium text-gray-700">Click to upload or drag and drop</p>
                                <p className="text-sm text-gray-500">PDF or Word document (max 50MB)</p>
                            </div>
                            <input
                                type="file"
                                accept=".pdf,.doc,.docx"
                                onChange={handleFileChange}
                                className="hidden"
                            />
                        </label>
                    )}
                </div>

                {/* Application Template Upload */}
                <div>
                    <label className="block font-medium text-gray-900 mb-2">
                        Application Template
                    </label>
                    <p className="text-sm text-gray-500 mb-3">
                        Upload the Research Grant Application Template (PDF or Word, max 50MB)
                    </p>

                    {existingTemplate && !formData.templateFile && (
                        <div className="mb-3 p-3 bg-gray-50 rounded-lg flex items-center justify-between">
                            <div className="flex items-center">
                                <FileText size={20} className="text-gray-500 mr-2" />
                                <span className="text-sm text-gray-700">Current template: {existingTemplate}</span>
                            </div>
                        </div>
                    )}

                    {formData.templateFile ? (
                        <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
                            <div className="flex items-center">
                                <FileText size={24} className="text-green-600 mr-3" />
                                <div>
                                    <p className="font-medium text-gray-900">{formData.templateFile.name}</p>
                                    <p className="text-sm text-gray-500">
                                        {(formData.templateFile.size / (1024 * 1024)).toFixed(2)} MB
                                    </p>
                                </div>
                            </div>
                            <button onClick={removeTemplateFile} className="text-gray-400 hover:text-red-600">
                                <X size={20} />
                            </button>
                        </div>
                    ) : (
                        <label className="block cursor-pointer">
                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-green-400 hover:bg-green-50 transition-colors">
                                <Upload size={32} className="mx-auto text-gray-400 mb-2" />
                                <p className="font-medium text-gray-700">Click to upload template</p>
                                <p className="text-sm text-gray-500">PDF or Word document (max 50MB)</p>
                            </div>
                            <input
                                type="file"
                                accept=".pdf,.doc,.docx"
                                onChange={handleTemplateFileChange}
                                className="hidden"
                            />
                        </label>
                    )}
                </div>
            </div>

            {/* Actions */}
            <div className="flex justify-between items-center">
                <button
                    onClick={() => navigate(returnPath)}
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
                        Submit Proposal
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ProposalForm;

import React, { useState } from 'react';
import { apiClient } from '../api/client';
import { ConfirmationModal } from './ConfirmationModal';
import { toast } from 'react-hot-toast';
import {
  IBulkImportPreviewResponse,
  IBulkImportExecutionResponse
} from '@hs/shared';
import {
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  ArrowRight,
  RotateCcw,
  Sparkles,
  Layers,
  Users,
  Stethoscope,
  Code,
  Info,
  Check,
  CheckCheck,
  ArrowLeft,
  XCircle
} from 'lucide-react';

interface BulkImportViewProps {
  institutionId: string;
  institutionName: string;
  onImportComplete?: () => void;
  onNavigateTab?: (tab: 'departments' | 'batches' | 'roster') => void;
}

const SAMPLE_TEMPLATE = `{
  "departments": [
    {
      "name": "General Medicine",
      "abbreviation": "MED"
    },
    {
      "name": "General Surgery",
      "abbreviation": "SURG"
    },
    {
      "name": "Pediatrics",
      "abbreviation": "PED"
    },
    {
      "name": "Obstetrics & Gynecology",
      "abbreviation": "OBG"
    }
  ],
  "batches": [
    {
      "name": "A",
      "parent": null,
      "children": ["A1", "A2"]
    },
    {
      "name": "A1",
      "parent": "A",
      "children": []
    },
    {
      "name": "A2",
      "parent": "A",
      "children": []
    },
    {
      "name": "B",
      "parent": null,
      "children": ["B1", "B2"]
    },
    {
      "name": "B1",
      "parent": "B",
      "children": []
    },
    {
      "name": "B2",
      "parent": "B",
      "children": []
    }
  ],
  "students": [
    {
      "name": "ABHIJITH BABU",
      "batches": ["A", "A1"]
    },
    {
      "name": "AISWARYA NAIR",
      "batches": ["A", "A2"]
    },
    {
      "name": "ANAND KRISHNAN",
      "batches": ["B", "B1"]
    },
    {
      "name": "ANJALI MENON",
      "batches": ["B", "B2"]
    }
  ]
}`;

export const BulkImportView: React.FC<BulkImportViewProps> = ({
  institutionId,
  institutionName,
  onImportComplete,
  onNavigateTab
}) => {
  const [jsonText, setJsonText] = useState('');
  const [jsonSyntaxError, setJsonSyntaxError] = useState<string | null>(null);

  // Workflow steps: 'input' -> 'preview' -> 'completed'
  const [step, setStep] = useState<'input' | 'preview' | 'completed'>('input');
  const [previewSubTab, setPreviewSubTab] = useState<'all' | 'departments' | 'batches' | 'students'>('all');

  // Loading states
  const [isValidating, setIsValidating] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  // Preview data
  const [previewData, setPreviewData] = useState<IBulkImportPreviewResponse | null>(null);
  const [executionResult, setExecutionResult] = useState<IBulkImportExecutionResponse | null>(null);

  // Confirmation modal
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  // Helper: Format / Pretty Print JSON
  const handleFormatJson = () => {
    try {
      const parsed = JSON.parse(jsonText);
      setJsonText(JSON.stringify(parsed, null, 2));
      setJsonSyntaxError(null);
      toast.success('JSON formatted successfully');
    } catch (err: any) {
      setJsonSyntaxError(`Syntax Error: ${err.message}`);
      toast.error('Unable to format: invalid JSON syntax');
    }
  };

  // Helper: Load Sample
  const handleLoadSample = () => {
    setJsonText(SAMPLE_TEMPLATE);
    setJsonSyntaxError(null);
    toast.success('Sample JSON loaded');
  };

  // Helper: Clear
  const handleClear = () => {
    setJsonText('');
    setJsonSyntaxError(null);
    setPreviewData(null);
    setStep('input');
  };

  // Step 1: Validate and Preview (Backend dry-run without writing)
  const handleValidateAndPreview = async () => {
    setJsonSyntaxError(null);
    if (!jsonText.trim()) {
      toast.error('Please paste or enter JSON content to validate');
      return;
    }

    let parsedPayload: any;
    try {
      parsedPayload = JSON.parse(jsonText);
    } catch (err: any) {
      setJsonSyntaxError(`JSON Syntax Error: ${err.message}`);
      toast.error('Invalid JSON syntax. Please check brackets, quotes, and commas.');
      return;
    }

    if (typeof parsedPayload !== 'object' || parsedPayload === null) {
      setJsonSyntaxError('Root element must be a JSON object with departments, batches, and/or students arrays.');
      toast.error('Root must be an object');
      return;
    }

    setIsValidating(true);
    try {
      const { data } = await apiClient.post(`/institutions/${institutionId}/bulk-import/preview`, parsedPayload);
      setPreviewData(data.data);
      setStep('preview');

      if (data.data.isValid) {
        toast.success('JSON validated successfully! Review the draft preview below.');
      } else {
        toast.error(`Validation found ${data.data.summary.totalErrors} issue(s) that require attention.`);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Server validation failed');
    } finally {
      setIsValidating(false);
    }
  };

  // Step 2 -> 3: Confirm and Apply Changes
  const handleConfirmAndApply = async () => {
    if (!previewData || !previewData.isValid) return;

    let parsedPayload: any;
    try {
      parsedPayload = JSON.parse(jsonText);
    } catch {
      toast.error('Invalid JSON payload');
      return;
    }

    setIsApplying(true);
    try {
      const { data } = await apiClient.post(`/institutions/${institutionId}/bulk-import/confirm`, parsedPayload);
      setExecutionResult(data.data);
      setStep('completed');
      setIsConfirmOpen(false);
      toast.success('Bulk import executed successfully!');
      onImportComplete?.();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Import execution failed');
      setIsConfirmOpen(false);
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Steps Indicator */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Code className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">JSON Bulk Import</h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Bulk-import departments, batch hierarchies, and house surgeon students for <span className="font-semibold text-slate-700">{institutionName}</span>.
          </p>
        </div>

        {/* Workflow Breadcrumbs */}
        <div className="flex items-center space-x-2 text-xs font-semibold">
          <span
            className={`px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition-colors ${
              step === 'input'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            <span>1. Paste JSON</span>
          </span>
          <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
          <span
            className={`px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition-colors ${
              step === 'preview'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            <span>2. Validate & Preview</span>
          </span>
          <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
          <span
            className={`px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition-colors ${
              step === 'completed'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            <span>3. Completed</span>
          </span>
        </div>
      </div>

      {/* ========================================================= */}
      {/* STEP 1: INPUT JSON EDITOR                                */}
      {/* ========================================================= */}
      {step === 'input' && (
        <div className="space-y-4">
          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handleLoadSample}
                className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold border border-slate-300 shadow-2xs flex items-center space-x-1.5 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Load Sample Template</span>
              </button>
              <button
                type="button"
                onClick={handleFormatJson}
                disabled={!jsonText.trim()}
                className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold border border-slate-300 shadow-2xs flex items-center space-x-1.5 transition-colors disabled:opacity-40"
              >
                <Code className="w-3.5 h-3.5 text-blue-500" />
                <span>Format JSON</span>
              </button>
              {jsonText && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="px-3 py-1.5 bg-white hover:bg-red-50 text-red-600 rounded-lg text-xs font-semibold border border-slate-300 shadow-2xs flex items-center space-x-1.5 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Clear</span>
                </button>
              )}
            </div>

            <div className="text-[11px] text-slate-500 font-mono">
              {jsonText ? `${jsonText.split('\n').length} lines • ${jsonText.length} characters` : 'Empty editor'}
            </div>
          </div>

          {/* Syntax Error Alert */}
          {jsonSyntaxError && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-2.5 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">JSON Syntax Issue</p>
                <p className="mt-0.5 font-mono">{jsonSyntaxError}</p>
              </div>
            </div>
          )}

          {/* Large JSON Editor */}
          <div className="relative">
            <textarea
              value={jsonText}
              onChange={(e) => {
                setJsonText(e.target.value);
                if (jsonSyntaxError) setJsonSyntaxError(null);
              }}
              rows={20}
              placeholder={`Paste your JSON data here...\n\nExample structure:\n{\n  "departments": [{ "name": "General Medicine", "abbreviation": "MED" }],\n  "batches": [{ "name": "A", "parent": null, "children": ["A1", "A2"] }],\n  "students": [{ "name": "DR. JOHN DOE", "batches": ["A", "A1"] }]\n}`}
              className="w-full font-mono text-xs sm:text-sm bg-slate-950 text-emerald-400 p-4 rounded-2xl border border-slate-800 shadow-inner outline-none focus:border-blue-500 leading-relaxed resize-y selection:bg-blue-600 selection:text-white"
            />
          </div>

          {/* Helper Tips */}
          <div className="p-4 bg-blue-50/60 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-start space-x-3">
            <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold">Safe Validation Guarantee</p>
              <p className="text-blue-800 leading-relaxed">
                Clicking <strong>Validate & Preview Draft</strong> performs a comprehensive validation check on both client and server without modifying your database.
                You can review proposed additions, hierarchical batch depths, student batch memberships, and duplicate warnings before confirming.
              </p>
            </div>
          </div>

          {/* Submit Action */}
          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={handleValidateAndPreview}
              disabled={isValidating || !jsonText.trim()}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-md shadow-blue-600/30 flex items-center space-x-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isValidating ? (
                <span>Validating JSON & Resolving References...</span>
              ) : (
                <>
                  <span>Validate & Preview Draft</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* STEP 2: DRAFT PREVIEW & CONFIRMATION                     */}
      {/* ========================================================= */}
      {step === 'preview' && previewData && (
        <div className="space-y-6">
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            {/* Status Card */}
            <div
              className={`p-4 rounded-2xl border shadow-2xs ${
                previewData.isValid
                  ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                  : 'bg-red-50/80 border-red-200 text-red-950'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider">Validation</span>
                {previewData.isValid ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-600" />
                )}
              </div>
              <p className="text-xl font-black mt-2">
                {previewData.isValid ? 'Ready to Import' : `${previewData.summary.totalErrors} Error(s)`}
              </p>
              <p className="text-[11px] opacity-80 mt-0.5">
                {previewData.isValid
                  ? `${previewData.summary.totalWarnings} warning(s) flagged`
                  : 'Must resolve errors before importing'}
              </p>
            </div>

            {/* Departments Metric */}
            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Departments</span>
                <Stethoscope className="w-5 h-5 text-blue-500" />
              </div>
              <p className="text-xl font-black text-slate-900 mt-2">
                {previewData.departments.length}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                <span className="text-emerald-600 font-bold">+{previewData.summary.departments.create} new</span> • {previewData.summary.departments.skip} existing
              </p>
            </div>

            {/* Batches Metric */}
            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Batches</span>
                <Layers className="w-5 h-5 text-indigo-500" />
              </div>
              <p className="text-xl font-black text-slate-900 mt-2">
                {previewData.batches.length}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                <span className="text-emerald-600 font-bold">+{previewData.summary.batches.create} new</span> • {previewData.summary.batches.skip} existing
              </p>
            </div>

            {/* Students Metric */}
            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Students</span>
                <Users className="w-5 h-5 text-purple-500" />
              </div>
              <p className="text-xl font-black text-slate-900 mt-2">
                {previewData.students.length}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                <span className="text-emerald-600 font-bold">+{previewData.summary.students.create} new</span> • {previewData.summary.students.update} update
              </p>
            </div>
          </div>

          {/* Errors Callout if any */}
          {previewData.errors.length > 0 && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl space-y-2">
              <div className="flex items-center space-x-2 text-red-800 font-bold text-sm">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>Validation Errors ({previewData.errors.length}) — Database changes cannot be applied:</span>
              </div>
              <ul className="list-disc list-inside text-xs text-red-700 space-y-1 font-mono pl-1">
                {previewData.errors.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Warnings Callout if any */}
          {previewData.warnings.length > 0 && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-2">
              <div className="flex items-center space-x-2 text-amber-800 font-bold text-sm">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Notice & Warnings ({previewData.warnings.length}):</span>
              </div>
              <ul className="list-disc list-inside text-xs text-amber-700 space-y-1 pl-1">
                {previewData.warnings.map((warn, idx) => (
                  <li key={idx}>{warn}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Preview Detailed Tables Sub-tabs */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="flex border-b border-slate-200 bg-slate-50/70 px-4 pt-2 space-x-2">
              {[
                { key: 'all', label: 'All Records', count: previewData.departments.length + previewData.batches.length + previewData.students.length },
                { key: 'departments', label: 'Departments', count: previewData.departments.length },
                { key: 'batches', label: 'Batches', count: previewData.batches.length },
                { key: 'students', label: 'Students', count: previewData.students.length }
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setPreviewSubTab(tab.key as any)}
                  className={`px-3.5 py-2.5 text-xs font-bold rounded-t-xl border-b-2 transition-colors ${
                    previewSubTab === tab.key
                      ? 'border-blue-600 text-blue-600 bg-white'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {tab.label} <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-slate-100">{tab.count}</span>
                </button>
              ))}
            </div>

            <div className="p-4 space-y-6">
              {/* DEPARTMENTS TABLE */}
              {(previewSubTab === 'all' || previewSubTab === 'departments') && previewData.departments.length > 0 && (
                <div className="space-y-2.5">
                  <div className="flex items-center space-x-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
                    <Stethoscope className="w-4 h-4 text-blue-500" />
                    <span>Proposed Departments ({previewData.departments.length})</span>
                  </div>
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-2.5">Department Name</th>
                          <th className="px-4 py-2.5">Abbreviation</th>
                          <th className="px-4 py-2.5">Color Accent</th>
                          <th className="px-4 py-2.5">Planned Action</th>
                          <th className="px-4 py-2.5">Notes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {previewData.departments.map((d, i) => (
                          <tr key={i} className="hover:bg-slate-50/60">
                            <td className="px-4 py-3 font-semibold text-slate-900">{d.name}</td>
                            <td className="px-4 py-3 font-mono font-bold text-slate-700">{d.abbreviation}</td>
                            <td className="px-4 py-3">
                              <span
                                className="inline-block w-4 h-4 rounded-full border border-black/10 align-middle mr-2"
                                style={{ backgroundColor: d.color }}
                              />
                              <span className="font-mono text-[11px] text-slate-500">{d.color}</span>
                            </td>
                            <td className="px-4 py-3">
                              <ActionBadge action={d.action} />
                            </td>
                            <td className="px-4 py-3 text-slate-500">{d.message || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* BATCHES TABLE */}
              {(previewSubTab === 'all' || previewSubTab === 'batches') && previewData.batches.length > 0 && (
                <div className="space-y-2.5">
                  <div className="flex items-center space-x-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
                    <Layers className="w-4 h-4 text-indigo-500" />
                    <span>Proposed Batches & Hierarchy ({previewData.batches.length})</span>
                  </div>
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-2.5">Batch Code / Name</th>
                          <th className="px-4 py-2.5">Parent Reference</th>
                          <th className="px-4 py-2.5">Declared Children</th>
                          <th className="px-4 py-2.5">Computed Depth</th>
                          <th className="px-4 py-2.5">Planned Action</th>
                          <th className="px-4 py-2.5">Notes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {previewData.batches.map((b, i) => (
                          <tr key={i} className="hover:bg-slate-50/60">
                            <td className="px-4 py-3 font-bold text-slate-900">
                              <span className="px-2 py-0.5 bg-slate-100 rounded border border-slate-200 mr-2 font-mono">
                                {b.code}
                              </span>
                              {b.name !== b.code && <span className="font-normal text-slate-600">{b.name}</span>}
                            </td>
                            <td className="px-4 py-3 text-slate-600">
                              {b.parent ? (
                                <span className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-700 font-mono text-[11px]">
                                  {b.parent}
                                </span>
                              ) : (
                                <span className="text-slate-400 italic">None (Root)</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-slate-600">
                              {b.children && b.children.length > 0 ? (
                                <span className="font-mono text-[11px] text-slate-700">
                                  [{b.children.join(', ')}]
                                </span>
                              ) : (
                                <span className="text-slate-400 italic">None</span>
                              )}
                            </td>
                            <td className="px-4 py-3 font-mono font-semibold text-slate-700">
                              Level {b.computedDepth}
                            </td>
                            <td className="px-4 py-3">
                              <ActionBadge action={b.action} />
                            </td>
                            <td className="px-4 py-3 text-slate-500">{b.message || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* STUDENTS TABLE */}
              {(previewSubTab === 'all' || previewSubTab === 'students') && previewData.students.length > 0 && (
                <div className="space-y-2.5">
                  <div className="flex items-center space-x-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
                    <Users className="w-4 h-4 text-purple-500" />
                    <span>Proposed Students / House Surgeons ({previewData.students.length})</span>
                  </div>
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-2.5">House Surgeon Name</th>
                          <th className="px-4 py-2.5">Input Batch References</th>
                          <th className="px-4 py-2.5">Resolved Batch Codes</th>
                          <th className="px-4 py-2.5">Planned Action</th>
                          <th className="px-4 py-2.5">Notes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {previewData.students.map((s, i) => (
                          <tr key={i} className="hover:bg-slate-50/60">
                            <td className="px-4 py-3 font-semibold text-slate-900">{s.name}</td>
                            <td className="px-4 py-3 font-mono text-[11px] text-slate-600">
                              {s.batches.join(', ')}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap gap-1">
                                {s.resolvedBatchCodes.map((bc, bIdx) => (
                                  <span
                                    key={bIdx}
                                    className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded text-[10px] font-mono font-bold"
                                  >
                                    {bc}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <ActionBadge action={s.action} />
                            </td>
                            <td className="px-4 py-3 text-slate-500">{s.message || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => setStep('input')}
              className="px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold border border-slate-300 shadow-2xs flex items-center space-x-1.5 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Edit JSON</span>
            </button>

            <button
              type="button"
              onClick={() => setIsConfirmOpen(true)}
              disabled={!previewData.isValid || isApplying}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-md shadow-emerald-600/30 flex items-center space-x-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isApplying ? (
                <span>Applying Changes to MongoDB...</span>
              ) : (
                <>
                  <CheckCheck className="w-4 h-4" />
                  <span>Confirm & Apply Bulk Import</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* STEP 3: COMPLETED SUCCESS VIEW                           */}
      {/* ========================================================= */}
      {step === 'completed' && executionResult && (
        <div className="p-8 bg-white rounded-3xl border border-slate-200 shadow-sm text-center max-w-2xl mx-auto space-y-6">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
            <Check className="w-8 h-8 stroke-[3]" />
          </div>

          <div>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">Bulk Import Completed!</h3>
            <p className="text-sm text-slate-500 mt-1">{executionResult.message}</p>
          </div>

          <div className="grid grid-cols-3 gap-3 text-left">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Departments</span>
              <p className="text-xl font-black text-slate-900 mt-1">
                {executionResult.summary.departmentsCreated}
              </p>
              <span className="text-[11px] text-slate-500">
                Created • {executionResult.summary.departmentsSkipped} skipped
              </span>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Batches</span>
              <p className="text-xl font-black text-slate-900 mt-1">
                {executionResult.summary.batchesCreated}
              </p>
              <span className="text-[11px] text-slate-500">
                Created • {executionResult.summary.batchesSkipped} skipped
              </span>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Students</span>
              <p className="text-xl font-black text-slate-900 mt-1">
                {executionResult.summary.studentsCreated}
              </p>
              <span className="text-[11px] text-slate-500">
                Created • {executionResult.summary.studentsUpdated} updated
              </span>
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={handleClear}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
            >
              Import More JSON
            </button>
            {onNavigateTab && (
              <>
                <button
                  type="button"
                  onClick={() => onNavigateTab('departments')}
                  className="px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold transition-colors"
                >
                  View Departments
                </button>
                <button
                  type="button"
                  onClick={() => onNavigateTab('batches')}
                  className="px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition-colors"
                >
                  View Batches
                </button>
                <button
                  type="button"
                  onClick={() => onNavigateTab('roster')}
                  className="px-4 py-2.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-xl text-xs font-bold transition-colors"
                >
                  View Roster
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={isConfirmOpen}
        title="Confirm Bulk Import Changes"
        message={`You are about to import ${previewData?.departments.length || 0} departments, ${previewData?.batches.length || 0} batches, and ${previewData?.students.length || 0} students into ${institutionName}.`}
        warningText="Database changes will be executed safely in topological order with reference resolution. All records will belong to this institution."
        confirmLabel="Yes, Apply Changes"
        variant="primary"
        isLoading={isApplying}
        onConfirm={handleConfirmAndApply}
        onCancel={() => setIsConfirmOpen(false)}
      />
    </div>
  );
};

// Helper badge component
const ActionBadge: React.FC<{ action: string }> = ({ action }) => {
  switch (action) {
    case 'create':
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
          Create
        </span>
      );
    case 'update':
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
          Update
        </span>
      );
    case 'skip':
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
          Skip
        </span>
      );
    case 'error':
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 border border-red-200">
          Error
        </span>
      );
    default:
      return null;
  }
};

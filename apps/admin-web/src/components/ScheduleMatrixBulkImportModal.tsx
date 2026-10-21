import React, { useState, useRef } from 'react';
import { apiClient } from '../api/client';
import { toast } from 'react-hot-toast';
import {
  IScheduleMatrixBulkPreviewResponse,
  IScheduleMatrixBulkExecutionResponse
} from '@hs/shared';
import {
  X,
  FileCode,
  Copy,
  Check,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Layers,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Download,
  Upload,
  ClipboardPaste,
  Trash2
} from 'lucide-react';

interface ScheduleMatrixBulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  institutionId: string;
  versionId?: string;
  versionNumber?: number;
  onImportComplete?: () => void;
}

const SAMPLE_MATRIX_JSON = `{
  "tracks": [
    {
      "name": "Main Clinical Rotation",
      "periods": [
        {
          "startDate": "2026-04-01",
          "endDate": "2026-05-31",
          "assignments": {
            "MED": ["A1", "A2"],
            "SURG": ["B1", "B2"],
            "OBG": ["C1"],
            "PED": ["D1"]
          }
        },
        {
          "startDate": "2026-06-01",
          "endDate": "2026-07-31",
          "assignments": {
            "MED": ["B1", "B2"],
            "SURG": ["C1"],
            "OBG": ["D1"],
            "PED": ["A1", "A2"]
          }
        }
      ]
    },
    {
      "name": "Casualty / Emergency Track",
      "periods": [
        {
          "startDate": "2026-04-01",
          "endDate": "2026-04-30",
          "assignments": {
            "CAS": ["A1", "B1"]
          }
        },
        {
          "startDate": "2026-05-01",
          "endDate": "2026-05-31",
          "assignments": {
            "CAS": ["A2", "B2"]
          }
        }
      ]
    }
  ]
}`;

export const ScheduleMatrixBulkImportModal: React.FC<ScheduleMatrixBulkImportModalProps> = ({
  isOpen,
  onClose,
  institutionId,
  versionId,
  versionNumber,
  onImportComplete
}) => {
  const [jsonText, setJsonText] = useState('');
  const [step, setStep] = useState<'edit' | 'preview'>('edit');
  const [copiedSample, setCopiedSample] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Preview & Loading States
  const [isValidating, setIsValidating] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [previewData, setPreviewData] = useState<IScheduleMatrixBulkPreviewResponse | null>(null);

  const lineCount = jsonText ? jsonText.split('\n').length : 0;
  const byteSize = new Blob([jsonText]).size;
  const formattedSize =
    byteSize > 1024 * 1024
      ? `${(byteSize / (1024 * 1024)).toFixed(2)} MB`
      : `${(byteSize / 1024).toFixed(1)} KB`;

  if (!isOpen) return null;

  const handleCopySample = () => {
    navigator.clipboard.writeText(SAMPLE_MATRIX_JSON);
    setCopiedSample(true);
    toast.success('Sample JSON copied to clipboard');
    setTimeout(() => setCopiedSample(false), 2000);
  };

  const handleLoadSample = () => {
    setJsonText(SAMPLE_MATRIX_JSON);
    toast.success('Loaded sample schedule matrix template');
  };

  const handleClear = () => {
    setJsonText('');
    setPreviewData(null);
    toast.success('Cleared editor content');
  };

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text) {
        toast.error('Clipboard is empty');
        return;
      }
      setJsonText(text);
      const lines = text.split('\n').length;
      toast.success(`Pasted ${lines.toLocaleString()} lines from clipboard`);
    } catch {
      toast.error('Could not access clipboard. Please use Ctrl+V / Cmd+V in the textarea.');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setJsonText(content);
        const lines = content.split('\n').length;
        toast.success(`Loaded file "${file.name}" (${lines.toLocaleString()} lines)`);
      }
    };
    reader.onerror = () => {
      toast.error('Failed to read file');
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleValidate = async () => {
    if (!jsonText.trim()) {
      toast.error('Please paste or enter JSON content before validating');
      return;
    }

    let parsedPayload: any;
    try {
      parsedPayload = JSON.parse(jsonText);
    } catch (err: any) {
      toast.error(`Invalid JSON syntax: ${err.message}`);
      return;
    }

    if (!parsedPayload.tracks || !Array.isArray(parsedPayload.tracks)) {
      toast.error('JSON must contain a top-level "tracks" array');
      return;
    }

    setIsValidating(true);
    try {
      const endpoint = versionId
        ? `/schedules/versions/${versionId}/bulk-import/preview`
        : '/schedules/bulk-import/preview';

      const { data } = await apiClient.post(endpoint, {
        ...parsedPayload,
        institutionId
      });

      setPreviewData(data.data);
      setStep('preview');
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Validation request failed');
    } finally {
      setIsValidating(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!previewData || !previewData.isValid) return;

    let parsedPayload: any;
    try {
      parsedPayload = JSON.parse(jsonText);
    } catch (err: any) {
      toast.error(`Invalid JSON syntax: ${err.message}`);
      return;
    }

    setIsApplying(true);
    try {
      const endpoint = versionId
        ? `/schedules/versions/${versionId}/bulk-import/apply`
        : '/schedules/bulk-import/apply';

      const { data } = await apiClient.post<IScheduleMatrixBulkExecutionResponse>(endpoint, {
        ...parsedPayload,
        institutionId
      });

      toast.success(data.message || 'Schedule matrix imported successfully!');
      onImportComplete?.();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Failed to apply schedule import');
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-600 rounded-xl">
              <FileCode className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Bulk Import Schedule Matrix
              </h3>
              <p className="text-xs text-slate-400">
                {versionNumber
                  ? `Targeting Schedule Version v${versionNumber} (Draft)`
                  : 'Import tracks, date range periods, and department batch allocations'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Workflow Tabs */}
        <div className="flex items-center justify-between px-6 py-2.5 bg-slate-50 border-b border-slate-200 text-xs shrink-0">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setStep('edit')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer flex items-center space-x-1.5 ${
                step === 'edit'
                  ? 'bg-blue-600 text-white font-semibold shadow-xs'
                  : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>1. JSON Editor</span>
            </button>
            <span className="text-slate-300">/</span>
            <button
              onClick={() => {
                if (previewData) setStep('preview');
              }}
              disabled={!previewData}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center space-x-1.5 ${
                step === 'preview'
                  ? 'bg-blue-600 text-white font-semibold shadow-xs'
                  : previewData
                  ? 'text-slate-600 hover:bg-slate-200 cursor-pointer'
                  : 'text-slate-400 cursor-not-allowed opacity-60'
              }`}
            >
              <span>2. Validation & Preview</span>
            </button>
          </div>

          {step === 'edit' && (
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".json,application/json"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center px-2.5 py-1 text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors shadow-2xs cursor-pointer font-medium"
                title="Upload a .json file directly from your computer"
              >
                <Upload className="w-3.5 h-3.5 mr-1 text-blue-600" />
                <span>Upload .json File</span>
              </button>
              <button
                type="button"
                onClick={handlePasteClipboard}
                className="inline-flex items-center px-2.5 py-1 text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors shadow-2xs cursor-pointer font-medium"
                title="Paste full clipboard content"
              >
                <ClipboardPaste className="w-3.5 h-3.5 mr-1 text-blue-600" />
                <span>Paste Clipboard</span>
              </button>
              {jsonText && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="inline-flex items-center px-2.5 py-1 text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 transition-colors shadow-2xs cursor-pointer font-medium"
                  title="Clear editor text"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1 text-red-500" />
                  <span>Clear</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleCopySample}
                className="inline-flex items-center px-2.5 py-1 text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors shadow-2xs cursor-pointer"
                title="Copy sample JSON structure"
              >
                {copiedSample ? <Check className="w-3.5 h-3.5 mr-1 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 mr-1 text-slate-500" />}
                <span>{copiedSample ? 'Copied' : 'Copy Sample'}</span>
              </button>
              <button
                type="button"
                onClick={handleLoadSample}
                className="inline-flex items-center px-2.5 py-1 text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors shadow-2xs cursor-pointer"
                title="Load sample template"
              >
                <Download className="w-3.5 h-3.5 mr-1" />
                <span>Load Template</span>
              </button>
              <button
                type="button"
                onClick={() => setShowGuide((prev) => !prev)}
                className="inline-flex items-center px-2.5 py-1 text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors shadow-2xs cursor-pointer"
              >
                <HelpCircle className="w-3.5 h-3.5 mr-1 text-slate-500" />
                <span>Format Reference</span>
                {showGuide ? <ChevronUp className="w-3.5 h-3.5 ml-1" /> : <ChevronDown className="w-3.5 h-3.5 ml-1" />}
              </button>
            </div>
          )}
        </div>

        {/* Collapsible Format Reference Guide */}
        {showGuide && step === 'edit' && (
          <div className="p-4 bg-blue-50/70 border-b border-blue-200 text-xs text-slate-700 shrink-0 max-h-48 overflow-y-auto space-y-2">
            <h4 className="font-bold text-blue-900 flex items-center space-x-1.5">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span>JSON Structure Reference & Rules</span>
            </h4>
            <ul className="list-disc list-inside space-y-1 text-slate-600">
              <li>
                <strong className="text-slate-800">tracks (required)</strong>: Array of rotation tracks (e.g. <code>Main Rotation Track</code>, <code>Casualty Duty</code>).
              </li>
              <li>
                <strong className="text-slate-800">periods (required)</strong>: Array of date range objects containing:
                <code className="mx-1 bg-white px-1 py-0.5 rounded border border-slate-200">startDate: &quot;YYYY-MM-DD&quot;</code> and
                <code className="mx-1 bg-white px-1 py-0.5 rounded border border-slate-200">endDate: &quot;YYYY-MM-DD&quot;</code>.
              </li>
              <li>
                <strong className="text-slate-800">assignments</strong>: Dictionary mapping department abbreviations or names to an array of batch codes.
                Example: <code className="bg-white px-1 py-0.5 rounded border border-slate-200">&quot;assignments&quot;: &#123; &quot;MED&quot;: [&quot;A1&quot;, &quot;A2&quot;], &quot;SURG&quot;: [&quot;B1&quot;] &#125;</code>.
              </li>
              <li>
                <strong className="text-slate-800">Conflict Rule</strong>: A batch cannot be scheduled under multiple departments during the same period and track.
              </li>
            </ul>
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 'edit' ? (
            <div className="h-full flex flex-col space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Paste Schedule Matrix JSON Payload
                </label>
                <div className="flex items-center space-x-3 text-xs text-slate-500">
                  <span>
                    Lines: <strong className="text-slate-800 font-mono font-semibold">{lineCount.toLocaleString()}</strong>
                  </span>
                  <span>•</span>
                  <span>
                    Size: <strong className="text-slate-800 font-mono font-semibold">{formattedSize}</strong>
                  </span>
                </div>
              </div>

              <textarea
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
                onPaste={(e) => {
                  const pasted = e.clipboardData.getData('text');
                  if (pasted && pasted.length > 5000) {
                    e.preventDefault();
                    const target = e.currentTarget;
                    const start = target.selectionStart;
                    const end = target.selectionEnd;
                    const updated = jsonText.substring(0, start) + pasted + jsonText.substring(end);
                    setJsonText(updated);
                    const lines = pasted.split('\n').length;
                    toast.success(`Pasted ${lines.toLocaleString()} lines successfully!`);
                  }
                }}
                placeholder="Paste your schedule matrix JSON payload here (supports 20,000+ lines or upload directly via the button above)..."
                maxLength={100000000}
                rows={18}
                className="w-full flex-1 p-4 font-mono text-xs bg-slate-950 text-emerald-400 rounded-xl border border-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-inner resize-none leading-relaxed"
                spellCheck={false}
              />

              <div className="flex items-center justify-between text-[11px] text-slate-400 px-1 pt-1">
                <span>Tip: You can paste large JSON payloads (up to 50MB) or use the &ldquo;Upload .json File&rdquo; button.</span>
                <span>Limit: 50MB payload</span>
              </div>
            </div>
          ) : (
            previewData && (
              <div className="space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl text-center">
                    <span className="text-xs font-medium text-blue-600 block">Rotation Tracks</span>
                    <span className="text-2xl font-bold text-blue-900">{previewData.summary.totalTracks}</span>
                  </div>
                  <div className="p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-xl text-center">
                    <span className="text-xs font-medium text-indigo-600 block">Date Periods</span>
                    <span className="text-2xl font-bold text-indigo-900">{previewData.summary.totalPeriods}</span>
                  </div>
                  <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl text-center">
                    <span className="text-xs font-medium text-emerald-600 block">Batch Postings</span>
                    <span className="text-2xl font-bold text-emerald-900">{previewData.summary.totalAssignments}</span>
                  </div>
                  <div
                    className={`p-3.5 rounded-xl text-center border ${
                      previewData.summary.totalErrors > 0
                        ? 'bg-red-50/70 border-red-200'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <span
                      className={`text-xs font-medium block ${
                        previewData.summary.totalErrors > 0 ? 'text-red-600' : 'text-slate-500'
                      }`}
                    >
                      Validation Errors
                    </span>
                    <span
                      className={`text-2xl font-bold ${
                        previewData.summary.totalErrors > 0 ? 'text-red-700' : 'text-slate-700'
                      }`}
                    >
                      {previewData.summary.totalErrors}
                    </span>
                  </div>
                </div>

                {/* Validation Status Banner */}
                {previewData.isValid ? (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start space-x-3 text-emerald-800 text-xs">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="font-semibold block text-sm">Validation Passed!</strong>
                      <span>
                        The payload is syntactically valid and all referenced departments and batches match existing records. You can now apply this import.
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-xl space-y-2 text-red-800 text-xs">
                    <div className="flex items-center space-x-2 text-sm font-bold text-red-900">
                      <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                      <span>Validation Errors Found ({previewData.errors.length})</span>
                    </div>
                    <ul className="list-disc list-inside space-y-1">
                      {previewData.errors.map((err, idx) => (
                        <li key={idx}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Warnings List */}
                {previewData.warnings.length > 0 && (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-1 text-amber-800 text-xs">
                    <div className="flex items-center space-x-2 font-bold text-amber-900">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>Warnings ({previewData.warnings.length})</span>
                    </div>
                    <ul className="list-disc list-inside space-y-0.5">
                      {previewData.warnings.map((warn, idx) => (
                        <li key={idx}>{warn}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Visual Tree of Tracks & Periods */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Draft Schedule Matrix Preview
                  </h4>

                  {previewData.tracks.map((track, tIdx) => (
                    <div key={tIdx} className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                        <div className="flex items-center space-x-2">
                          <Layers className="w-4 h-4 text-blue-600" />
                          <span className="font-bold text-slate-900 text-sm">{track.name}</span>
                          <span className="text-xs px-2 py-0.5 bg-white border border-slate-200 rounded-full text-slate-600">
                            {track.periods.length} period(s)
                          </span>
                        </div>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-semibold uppercase ${
                            track.status === 'valid'
                              ? 'bg-emerald-100 text-emerald-800'
                              : track.status === 'warning'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {track.status}
                        </span>
                      </div>

                      <div className="space-y-2">
                        {track.periods.map((period, pIdx) => (
                          <div
                            key={pIdx}
                            className="bg-white p-3 rounded-lg border border-slate-200 space-y-2 shadow-2xs"
                          >
                            <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                              <div className="flex items-center space-x-1.5">
                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                <span>
                                  Period {pIdx + 1}: {period.startDate} to {period.endDate}
                                </span>
                              </div>
                              <span className="text-[11px] text-slate-400">
                                {period.assignments.length} department(s)
                              </span>
                            </div>

                            <div className="flex flex-wrap gap-2 pt-1">
                              {period.assignments.map((assign, aIdx) => (
                                <div
                                  key={aIdx}
                                  className={`flex items-center space-x-2 px-2.5 py-1 rounded-lg border text-xs ${
                                    assign.status === 'valid'
                                      ? 'bg-slate-50 border-slate-200'
                                      : assign.status === 'warning'
                                      ? 'bg-amber-50 border-amber-300'
                                      : 'bg-red-50 border-red-300'
                                  }`}
                                >
                                  {assign.departmentColor && (
                                    <span
                                      className="w-2.5 h-2.5 rounded-full shrink-0"
                                      style={{ backgroundColor: assign.departmentColor }}
                                    />
                                  )}
                                  <span className="font-bold text-slate-800">
                                    {assign.resolvedDepartmentAbbr || assign.departmentInput}
                                  </span>
                                  <span className="text-slate-400 font-mono">→</span>
                                  <span className="text-blue-700 font-semibold">
                                    {assign.resolvedBatchCodes.join(', ') || 'No valid batches'}
                                  </span>
                                  {assign.unresolvedBatches.length > 0 && (
                                    <span className="text-red-500 font-medium text-[10px]">
                                      (? {assign.unresolvedBatches.join(', ')})
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div>
            {step === 'preview' && (
              <button
                type="button"
                onClick={() => setStep('edit')}
                className="inline-flex items-center px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
                Back to Editor
              </button>
            )}
          </div>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-200 rounded-lg font-medium cursor-pointer transition-colors"
            >
              Cancel
            </button>

            {step === 'edit' ? (
              <button
                type="button"
                onClick={handleValidate}
                disabled={isValidating}
                className="inline-flex items-center px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors cursor-pointer disabled:opacity-50"
              >
                {isValidating ? (
                  'Validating JSON...'
                ) : (
                  <>
                    <span>Validate & Preview</span>
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={isApplying || !previewData?.isValid}
                className="inline-flex items-center px-5 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isApplying ? (
                  'Applying Import...'
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    <span>Confirm & Import Schedule</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

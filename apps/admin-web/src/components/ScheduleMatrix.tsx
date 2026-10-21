import React, { useState, useMemo, useRef, useEffect } from 'react';
import { IFullMatrixResponse, ITrackMatrixData, IBatchNode, IDepartment, ISchedulePeriod, IResolvedPosting, formatRangeDisplay } from '@hs/shared';
import { apiClient } from '../api/client';
import { ConfirmationModal } from './ConfirmationModal';
import { ScheduleMatrixBulkImportModal } from './ScheduleMatrixBulkImportModal';
import { toast } from 'react-hot-toast';
import { Plus, Eye, Send, Calendar, Layers, X, Sparkles, Trash2, Search, ChevronDown, Check, Lock, FileCode } from 'lucide-react';

interface ScheduleMatrixProps {
  matrix: IFullMatrixResponse;
  institutionId: string;
  allBatches: IBatchNode[];
  versions?: any[];
  selectedVersionId?: string | null;
  onSelectVersion?: (versionId: string) => void;
  onCreateVersion?: () => void;
  onRefresh: () => void;
}

export const ScheduleMatrix: React.FC<ScheduleMatrixProps> = ({
  matrix,
  institutionId,
  allBatches,
  versions = [],
  selectedVersionId,
  onSelectVersion,
  onCreateVersion,
  onRefresh
}) => {
  const [selectedTrackIndex, setSelectedTrackIndex] = useState(0);
  const [editingCell, setEditingCell] = useState<{
    trackId: string;
    periodId: string;
    departmentId: string;
    deptName: string;
    periodLabel: string;
    selectedBatchIds: string[];
  } | null>(null);

  const [isSaving, setIsSaving] = useState(false);

  // Bulk Import Matrix Modal
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);

  // New Track Dialog
  const [isAddingTrack, setIsAddingTrack] = useState(false);
  const [newTrackName, setNewTrackName] = useState('');
  const [isCreatingTrack, setIsCreatingTrack] = useState(false);

  // New Period Dialog
  const [isAddingPeriod, setIsAddingPeriod] = useState(false);
  const [newStartDate, setNewStartDate] = useState('');
  const [newEndDate, setNewEndDate] = useState('');

  // Preview Drawer
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [rosterRecords, setRosterRecords] = useState<any[]>([]);
  const [selectedRosterId, setSelectedRosterId] = useState('');
  const [previewSearch, setPreviewSearch] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [previewResults, setPreviewResults] = useState<IResolvedPosting[] | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  const filteredPreviewRoster = useMemo(() => {
    if (!previewSearch.trim()) return rosterRecords;
    const q = previewSearch.toLowerCase();
    return rosterRecords.filter((r) => r.name.toLowerCase().includes(q));
  }, [rosterRecords, previewSearch]);

  // Batch Assignment Search
  const [batchSearch, setBatchSearch] = useState('');
  const filteredBatches = useMemo(() => {
    if (!batchSearch.trim()) return allBatches;
    const q = batchSearch.toLowerCase();
    return allBatches.filter(
      (b) => b.code.toLowerCase().includes(q) || b.name.toLowerCase().includes(q)
    );
  }, [allBatches, batchSearch]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  // Publish state
  const [isPublishing, setIsPublishing] = useState(false);

  // Generic Confirmation Modal
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    warningText?: string;
    confirmLabel?: string;
    variant?: 'danger' | 'warning' | 'primary';
    onConfirm: () => Promise<void> | void;
    isLoading?: boolean;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const currentTrack: ITrackMatrixData | undefined = matrix.tracks[selectedTrackIndex] || matrix.tracks[0];
  const isDraft = matrix.status === 'draft';

  // Open cell editor
  const handleCellClick = (period: ISchedulePeriod, department: IDepartment) => {
    if (!isDraft) return;
    const key = `${department.id}_${period.id}`;
    const assigned = currentTrack?.assignments[key] || [];
    setBatchSearch('');
    setEditingCell({
      trackId: currentTrack!.trackId,
      periodId: period.id,
      departmentId: department.id,
      deptName: department.name,
      periodLabel: formatRangeDisplay(period.startDate, period.endDate),
      selectedBatchIds: assigned.map((b) => b.id)
    });
  };

  const handleToggleBatch = (batchId: string) => {
    if (!editingCell) return;
    const exists = editingCell.selectedBatchIds.includes(batchId);
    setEditingCell({
      ...editingCell,
      selectedBatchIds: exists
        ? editingCell.selectedBatchIds.filter((id) => id !== batchId)
        : [...editingCell.selectedBatchIds, batchId]
    });
  };

  const handleSaveCell = async () => {
    if (!editingCell) return;
    setIsSaving(true);

    try {
      await apiClient.put(`/schedules/versions/${matrix.versionId}/cell`, {
        trackId: editingCell.trackId,
        periodId: editingCell.periodId,
        departmentId: editingCell.departmentId,
        batchNodeIds: editingCell.selectedBatchIds
      });
      toast.success('Cell rotation assignments updated');
      setEditingCell(null);
      onRefresh();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Failed to save cell assignments');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreatePeriod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTrack) return;

    try {
      await apiClient.post(`/schedules/versions/${matrix.versionId}/periods`, {
        trackId: currentTrack.trackId,
        startDate: newStartDate,
        endDate: newEndDate
      });
      toast.success('Date range period added successfully');
      setIsAddingPeriod(false);
      setNewStartDate('');
      setNewEndDate('');
      onRefresh();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Failed to create period');
    }
  };

  const handleOpenDeletePeriodModal = (period: ISchedulePeriod) => {
    if (!isDraft) return;
    setConfirmModal({
      isOpen: true,
      title: 'Delete Date Range Column',
      message: `Are you sure you want to delete period (${formatRangeDisplay(period.startDate, period.endDate)})?`,
      warningText: 'All rotation batch assignments in this date range will be permanently erased.',
      confirmLabel: 'Delete Period',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isLoading: true }));
        try {
          await apiClient.delete(`/schedules/periods/${period.id}`);
          toast.success('Period date range deleted successfully');
          setConfirmModal((prev) => ({ ...prev, isOpen: false, isLoading: false }));
          onRefresh();
        } catch (err: any) {
          toast.error(err.response?.data?.message || err.message || 'Failed to delete period');
          setConfirmModal((prev) => ({ ...prev, isOpen: false, isLoading: false }));
        }
      }
    });
  };

  const handleCreateTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTrackName.trim()) return;
    setIsCreatingTrack(true);

    try {
      await apiClient.post(`/schedules/versions/${matrix.versionId}/tracks`, {
        name: newTrackName.trim()
      });
      toast.success('Rotation track created successfully');
      setIsAddingTrack(false);
      setNewTrackName('');
      setSelectedTrackIndex(matrix.tracks.length);
      onRefresh();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Failed to create track');
    } finally {
      setIsCreatingTrack(false);
    }
  };

  const handleOpenDeleteTrackModal = (track: ITrackMatrixData) => {
    if (!isDraft) return;
    if (matrix.tracks.length <= 1) {
      toast.error('Cannot delete the only rotation track in a schedule');
      return;
    }
    setConfirmModal({
      isOpen: true,
      title: 'Delete Rotation Track',
      message: `Are you sure you want to delete track "${track.trackName}"?`,
      warningText: 'All period date columns and assignments under this track will be permanently erased.',
      confirmLabel: 'Delete Track',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isLoading: true }));
        try {
          await apiClient.delete(`/schedules/tracks/${track.trackId}`);
          toast.success('Rotation track deleted successfully');
          setSelectedTrackIndex((prev) => Math.max(0, prev - 1));
          setConfirmModal((prev) => ({ ...prev, isOpen: false, isLoading: false }));
          onRefresh();
        } catch (err: any) {
          toast.error(err.response?.data?.message || err.message || 'Failed to delete track');
          setConfirmModal((prev) => ({ ...prev, isOpen: false, isLoading: false }));
        }
      }
    });
  };

  const handleOpenPreview = async () => {
    setIsPreviewOpen(true);
    setPreviewSearch('');
    setIsDropdownOpen(false);
    try {
      const { data } = await apiClient.get('/roster', { params: { institutionId, all: 'true' } });
      const records = data.data.items || [];
      setRosterRecords(records);
      if (records.length > 0) {
        // First house surgeon is selected by default
        const defaultId = records[0].id;
        setSelectedRosterId(defaultId);
        fetchPreview(defaultId);
      } else {
        setSelectedRosterId('');
        setPreviewResults([]);
      }
    } catch {
      // ignore
    }
  };

  const fetchPreview = async (rosterId: string) => {
    if (!rosterId) return;
    setIsPreviewLoading(true);
    try {
      const { data } = await apiClient.get(`/schedules/versions/${matrix.versionId}/preview`, {
        params: { rosterRecordId: rosterId }
      });
      setPreviewResults(data.data || []);
    } catch {
      setPreviewResults([]);
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleOpenPublishModal = () => {
    setConfirmModal({
      isOpen: true,
      title: `Publish Schedule Version v${matrix.versionNumber}`,
      message: 'Are you sure you want to validate and publish this schedule version for the entire institution?',
      warningText: "Publishing this version makes it immediately active for all enrolled house surgeons. Any currently published schedule version will be returned to 'draft' status so that it remains fully editable and reusable.",
      confirmLabel: 'Publish Schedule',
      variant: 'primary',
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isLoading: true }));
        setIsPublishing(true);
        try {
          await apiClient.post(`/schedules/versions/${matrix.versionId}/publish`);
          toast.success('Schedule published successfully! Any previous published version was returned to draft.');
          setConfirmModal((prev) => ({ ...prev, isOpen: false, isLoading: false }));
          onRefresh();
        } catch (err: any) {
          toast.error(err.response?.data?.message || err.message || 'Failed to publish schedule');
          setConfirmModal((prev) => ({ ...prev, isOpen: false, isLoading: false }));
        } finally {
          setIsPublishing(false);
        }
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Header Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-slate-500">Version:</span>
            {versions.length > 1 ? (
              <select
                value={selectedVersionId || matrix.versionId}
                onChange={(e) => onSelectVersion?.(e.target.value)}
                className="px-2.5 py-1 text-sm font-bold text-slate-900 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {versions.map((v) => (
                  <option key={v.id} value={v.id}>
                    v{v.versionNumber} ({v.status}) {v.notes ? `- ${v.notes}` : ''}
                  </option>
                ))}
              </select>
            ) : (
              <span className="font-bold text-slate-900 text-base">v{matrix.versionNumber}</span>
            )}
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-semibold uppercase ${
                matrix.status === 'published'
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : matrix.status === 'draft'
                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {matrix.status}
            </span>
          </div>

          {onCreateVersion && (
            <button
              onClick={onCreateVersion}
              className="inline-flex items-center px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors"
              title="Create a new schedule version based on this rotation"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              New Version
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {isDraft && (
            <button
              type="button"
              onClick={() => setIsBulkImportOpen(true)}
              className="inline-flex items-center px-3.5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 shadow-2xs transition-colors cursor-pointer"
              title="Bulk import schedule matrix via JSON"
            >
              <FileCode className="w-4 h-4 mr-2 text-blue-600" />
              <span>Bulk Import Matrix</span>
            </button>
          )}

          <button
            onClick={handleOpenPreview}
            className="inline-flex items-center px-3.5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 shadow-sm transition-colors cursor-pointer"
          >
            <Eye className="w-4 h-4 mr-2 text-slate-500" />
            Preview Resolved Roster
          </button>

          {isDraft && (
            <button
              onClick={handleOpenPublishModal}
              disabled={isPublishing}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors disabled:opacity-50"
            >
              <Send className="w-4 h-4 mr-2" />
              {isPublishing ? 'Publishing...' : 'Validate & Publish Schedule'}
            </button>
          )}
        </div>
      </div>

      {/* Rotation Track Selector Tabs */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center space-x-1.5 px-3 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold uppercase tracking-wider border border-slate-200 shrink-0">
              <Layers className="w-4 h-4 text-blue-600" />
              <span>Rotation Tracks</span>
            </div>

            {matrix.tracks.map((track, idx) => {
              const isSelected = selectedTrackIndex === idx || (!matrix.tracks[selectedTrackIndex] && idx === 0);
              return (
                <div
                  key={track.trackId}
                  className={`flex items-center rounded-lg transition-colors border ${
                    isSelected
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'text-slate-700 bg-slate-50 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedTrackIndex(idx)}
                    className="px-3.5 py-2 text-sm font-medium flex items-center space-x-2 focus:outline-none cursor-pointer"
                  >
                    <span>{track.trackName}</span>
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded-full ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {track.periods.length} {track.periods.length === 1 ? 'period' : 'periods'}
                    </span>
                  </button>

                  {isDraft && matrix.tracks.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenDeleteTrackModal(track);
                      }}
                      className={`p-1.5 mr-1.5 rounded-md transition-colors cursor-pointer ${
                        isSelected
                          ? 'text-white/80 hover:text-white hover:bg-blue-700'
                          : 'text-slate-400 hover:text-red-600 hover:bg-slate-200'
                      }`}
                      title={`Delete track "${track.trackName}"`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}

            {/* CREATE TRACK BUTTON */}
            {isDraft ? (
              <button
                type="button"
                onClick={() => {
                  setNewTrackName('');
                  setIsAddingTrack(true);
                }}
                className="inline-flex items-center px-3.5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs cursor-pointer"
                title="Create a new rotation track (e.g. Casualty Duty, Electives, Night Calls)"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Add Rotation Track
              </button>
            ) : (
              <button
                type="button"
                onClick={() =>
                  toast('Schedule version is published (read-only). Click "New Version" above to edit or add new tracks.', {
                    icon: '🔒'
                  })
                }
                className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-slate-500 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                title="This schedule version is locked. Create a new version to add tracks."
              >
                <Lock className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                + Add Track (Locked)
              </button>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {isDraft && currentTrack && (
              <button
                onClick={() => setIsAddingPeriod(true)}
                className="inline-flex items-center px-3.5 py-2 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Add Date Range Column
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 border-t border-slate-100 pt-2 px-1">
          <span>
            Active Track: <strong className="text-slate-800 font-semibold">{currentTrack?.trackName || 'Main'}</strong> ({currentTrack?.periods.length || 0} date range periods)
          </span>
          <span className="text-slate-400">
            Switch tabs above to view or customize each track&apos;s independent timeline and postings
          </span>
        </div>
      </div>

      {/* The Schedule Matrix Grid: Rows = Departments, Columns = Date Ranges */}
      {currentTrack && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {currentTrack.periods.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="font-semibold text-slate-700">No date range periods defined for {currentTrack.trackName}</p>
              <p className="text-sm mt-1">Click "Add Date Range Column" above to define the rotation periods.</p>
            </div>
          ) : (
            <div className="overflow-x-auto max-w-full">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="bg-slate-100/80 border-b border-slate-200">
                    {/* Sticky Department Header Column */}
                    <th className="sticky left-0 z-20 bg-slate-100 px-4 py-3.5 font-bold text-slate-900 border-r border-slate-200 min-w-[200px]">
                      Department
                    </th>
                    {/* Date Range Period Columns */}
                    {currentTrack.periods.map((period) => (
                      <th
                        key={period.id}
                        className="px-4 py-3.5 font-bold text-slate-800 text-center border-r border-slate-200 min-w-[170px] relative group"
                      >
                        <div className="flex items-center justify-center space-x-1.5">
                          <span className="text-slate-900 font-semibold">
                            {formatRangeDisplay(period.startDate, period.endDate)}
                          </span>
                          {isDraft && (
                            <button
                              type="button"
                              onClick={() => handleOpenDeletePeriodModal(period)}
                              className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-red-600 rounded transition-opacity"
                              title="Delete this period column"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 font-normal mt-0.5">
                          {period.startDate} to {period.endDate}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {currentTrack.departments.map((dept) => (
                    <tr key={dept.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Sticky Department Row Label */}
                      <td className="sticky left-0 z-10 bg-white px-4 py-3 border-r border-slate-200 flex items-center space-x-2.5">
                        <span
                          className="w-3.5 h-3.5 rounded-full flex-shrink-0 shadow-sm"
                          style={{ backgroundColor: dept.color }}
                          title={`Color: ${dept.color}`}
                        />
                        <div>
                          <span className="font-semibold text-slate-900 block">{dept.name}</span>
                          <span className="text-xs text-slate-500 font-mono">{dept.abbreviation}</span>
                        </div>
                      </td>

                      {/* Period Cells */}
                      {currentTrack.periods.map((period) => {
                        const key = `${dept.id}_${period.id}`;
                        const batchesInCell = currentTrack.assignments[key] || [];

                        return (
                          <td
                            key={period.id}
                            onClick={() => handleCellClick(period, dept)}
                            className={`px-3 py-2.5 border-r border-slate-200 text-center align-middle transition-colors ${
                              isDraft ? 'cursor-pointer hover:bg-blue-50/50' : ''
                            } ${batchesInCell.length > 0 ? 'bg-slate-50/30' : ''}`}
                          >
                            {batchesInCell.length === 0 ? (
                              <span className="text-slate-300 select-none text-xs">—</span>
                            ) : (
                              <div className="flex flex-wrap gap-1 justify-center">
                                {batchesInCell.map((b) => (
                                  <span
                                    key={b.id}
                                    className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200 shadow-2xs"
                                  >
                                    {b.code}
                                  </span>
                                ))}
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Cell Editor Modal / Drawer */}
      {editingCell && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex justify-between items-start pb-4 border-b border-slate-200 shrink-0">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Assign Batches to Department</h3>
                <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-500">
                  <span>Department: <strong className="text-slate-800">{editingCell.deptName}</strong></span>
                  <span>•</span>
                  <span>Period: <strong className="text-slate-800">{editingCell.periodLabel}</strong></span>
                  <span>•</span>
                  <span>Track: <strong className="text-blue-600">{currentTrack?.trackName}</strong></span>
                </div>
              </div>
              <button
                onClick={() => setEditingCell(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search Bar & Action Filter Bar */}
            <div className="py-3 border-b border-slate-100 space-y-2 shrink-0">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search batches by code or name (e.g. A1, Batch B, Group 1)..."
                  value={batchSearch}
                  onChange={(e) => setBatchSearch(e.target.value)}
                  className="w-full pl-9 pr-9 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                  autoFocus
                />
                {batchSearch && (
                  <button
                    onClick={() => setBatchSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between text-xs px-1 text-slate-500">
                <span>
                  Showing {filteredBatches.length} of {allBatches.length} batches
                  {editingCell.selectedBatchIds.length > 0 && (
                    <strong className="text-blue-600 font-semibold ml-1.5">
                      ({editingCell.selectedBatchIds.length} assigned)
                    </strong>
                  )}
                </span>
                {editingCell.selectedBatchIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      setEditingCell({
                        ...editingCell,
                        selectedBatchIds: []
                      })
                    }
                    className="text-red-500 hover:text-red-700 font-medium cursor-pointer"
                  >
                    Clear All Assigned
                  </button>
                )}
              </div>
            </div>

            {/* Scrollable Batches List (Longer, comfortable height) */}
            <div className="flex-1 min-h-[300px] max-h-[480px] overflow-y-auto py-3 space-y-2 pr-1">
              {filteredBatches.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-sm">
                  No batches found matching &ldquo;{batchSearch}&rdquo;
                </div>
              ) : (
                filteredBatches.map((b) => {
                  const isChecked = editingCell.selectedBatchIds.includes(b.id);
                  return (
                    <div
                      key={b.id}
                      onClick={() => handleToggleBatch(b.id)}
                      className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                        isChecked
                          ? 'bg-blue-50/90 border-blue-300 text-blue-900 shadow-2xs'
                          : 'hover:bg-slate-50 border-slate-200 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}} // handled by parent onClick
                          className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4 shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-sm text-slate-900">{b.code}</span>
                            <span className="text-xs text-slate-500 truncate">({b.name})</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 shrink-0 ml-3">
                        {isChecked && (
                          <span className="text-[11px] font-semibold text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded-full">
                            Assigned
                          </span>
                        )}
                        <span className="text-[10px] font-mono px-2 py-0.5 bg-slate-100 rounded-md border border-slate-200 text-slate-600">
                          depth {b.depth}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="pt-4 border-t border-slate-200 flex items-center justify-between shrink-0">
              <p className="text-[11px] text-slate-400 max-w-sm leading-tight">
                * Batches cannot be assigned to more than one department within the same period and track.
              </p>
              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={() => setEditingCell(null)}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveCell}
                  disabled={isSaving}
                  className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isSaving ? 'Saving...' : 'Apply Assignments'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Rotation Track Modal */}
      {isAddingTrack && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <form
            onSubmit={handleCreateTrack}
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200"
          >
            <div className="flex justify-between items-center pb-4 border-b border-slate-200">
              <div className="flex items-center space-x-2">
                <Layers className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-bold text-slate-900">Add Rotation Track</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddingTrack(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Track Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Casualty Duty Track, Electives, Night Calls"
                  value={newTrackName}
                  onChange={(e) => setNewTrackName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  autoFocus
                />
              </div>

              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-lg text-xs text-blue-800 leading-relaxed">
                A rotation track allows parallel scheduling timelines (e.g. general clinical rotations vs emergency / night duties) with independent date periods and batch assignments.
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setIsAddingTrack(false)}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isCreatingTrack || !newTrackName.trim()}
                className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm disabled:opacity-50"
              >
                {isCreatingTrack ? 'Creating...' : 'Create Track'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Add Date Range Column Modal */}
      {isAddingPeriod && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <form
            onSubmit={handleCreatePeriod}
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200"
          >
            <div className="flex justify-between items-center pb-4 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-900">Add Date Range Column</h3>
              <button
                type="button"
                onClick={() => setIsAddingPeriod(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Start Date (YYYY-MM-DD)</label>
                <input
                  type="date"
                  required
                  value={newStartDate}
                  onChange={(e) => setNewStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">End Date (Inclusive YYYY-MM-DD)</label>
                <input
                  type="date"
                  required
                  value={newEndDate}
                  onChange={(e) => setNewEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setIsAddingPeriod(false)}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm"
              >
                Create Period
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Schedule Preview Drawer */}
      {isPreviewOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white w-full max-w-xl h-full shadow-2xl flex flex-col p-6 overflow-y-auto border-l border-slate-200">
            <div className="flex justify-between items-center pb-4 border-b border-slate-200">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-bold text-slate-900">Resolved Schedule Preview</h3>
              </div>
              <button
                onClick={() => setIsPreviewOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4" ref={dropdownRef}>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Select House Surgeon Roster Record
              </label>

              <div className="relative">
                {/* Searchable Combobox Trigger Button */}
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen((prev) => !prev)}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-xl hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs transition-all text-left"
                >
                  <span className="font-medium text-slate-900 truncate">
                    {rosterRecords.find((r) => r.id === selectedRosterId)?.name ||
                      (rosterRecords.length > 0 ? rosterRecords[0].name : 'Select a house surgeon...')}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 transition-transform duration-200 ml-2 shrink-0 ${
                      isDropdownOpen ? 'rotate-180 text-blue-600' : ''
                    }`}
                  />
                </button>

                {/* Searchable Dropdown Popup Menu */}
                {isDropdownOpen && (
                  <div className="absolute z-30 left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden flex flex-col">
                    {/* Search inside the dropdown */}
                    <div className="p-2 border-b border-slate-100 bg-slate-50">
                      <div className="relative flex items-center">
                        <Search className="w-3.5 h-3.5 absolute left-3 text-slate-400" />
                        <input
                          autoFocus
                          type="text"
                          placeholder="Search house surgeon by name..."
                          value={previewSearch}
                          onChange={(e) => setPreviewSearch(e.target.value)}
                          className="w-full pl-8 pr-7 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder:text-slate-400"
                        />
                        {previewSearch && (
                          <button
                            type="button"
                            onClick={() => setPreviewSearch('')}
                            className="absolute right-2 text-slate-400 hover:text-slate-600"
                            title="Clear search"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Scrollable List of House Surgeons */}
                    <div className="max-h-60 overflow-y-auto divide-y divide-slate-50 py-1">
                      {filteredPreviewRoster.length === 0 ? (
                        <div className="py-6 px-4 text-center text-xs text-slate-400">
                          No house surgeons found matching "{previewSearch}"
                        </div>
                      ) : (
                        filteredPreviewRoster.map((r) => {
                          const isSelected = r.id === selectedRosterId;
                          return (
                            <button
                              key={r.id}
                              type="button"
                              onClick={() => {
                                setSelectedRosterId(r.id);
                                fetchPreview(r.id);
                                setIsDropdownOpen(false);
                              }}
                              className={`w-full px-3.5 py-2 text-left text-xs flex items-center justify-between transition-colors ${
                                isSelected
                                  ? 'bg-blue-50/80 text-blue-700 font-semibold'
                                  : 'text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              <span className="truncate">{r.name}</span>
                              {isSelected && <Check className="w-4 h-4 text-blue-600 shrink-0 ml-2" />}
                            </button>
                          );
                        })
                      )}
                    </div>

                    {/* Dropdown Footer */}
                    <div className="px-3 py-1.5 bg-slate-50 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
                      <span>
                        Showing {filteredPreviewRoster.length} of {rosterRecords.length} house surgeons
                      </span>
                      {previewSearch && (
                        <span className="text-blue-600 font-medium">Filtered</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 flex-1">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
                Resolved Rotation Postings & Inherited Traces
              </h4>

              {isPreviewLoading ? (
                <div className="py-12 text-center text-slate-500">Resolving schedule hierarchy...</div>
              ) : !previewResults || previewResults.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-300 rounded-xl text-slate-500 text-sm">
                  No posting assignments resolved for this house surgeon under the current schedule matrix.
                </div>
              ) : (
                <div className="space-y-3">
                  {previewResults.map((posting, idx) => (
                    <div
                      key={idx}
                      className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs hover:border-slate-300 transition-colors flex items-start justify-between"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: posting.departmentColor }}
                          />
                          <span className="font-bold text-slate-900">{posting.departmentName}</span>
                          <span className="text-xs text-slate-500 font-mono">({posting.departmentAbbreviation})</span>
                        </div>
                        <p className="text-xs text-slate-600">
                          {formatRangeDisplay(posting.startDate, posting.endDate)}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          Track: <strong className="text-slate-600">{posting.trackName}</strong>
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                          Batch {posting.matchedBatchCode}
                        </span>
                        {posting.isOverride && (
                          <span className="block mt-1 text-[10px] font-semibold text-amber-600 uppercase tracking-wider">
                            Child Override
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Generic Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        warningText={confirmModal.warningText}
        confirmLabel={confirmModal.confirmLabel}
        variant={confirmModal.variant}
        isLoading={confirmModal.isLoading}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
      />

      {/* Schedule Matrix Bulk Import Modal */}
      <ScheduleMatrixBulkImportModal
        isOpen={isBulkImportOpen}
        onClose={() => setIsBulkImportOpen(false)}
        institutionId={institutionId}
        versionId={matrix.versionId}
        versionNumber={matrix.versionNumber}
        onImportComplete={onRefresh}
      />
    </div>
  );
};

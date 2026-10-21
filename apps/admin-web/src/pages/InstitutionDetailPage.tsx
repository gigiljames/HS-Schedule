import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { apiClient } from '../api/client';
import {
  IInstitution,
  IDepartment,
  IBatchNode,
  IBatchTreeNode,
  IHouseSurgeonRecord,
  ISchedulePlan,
  IFullMatrixResponse
} from '@hs/shared';
import { BatchTree } from '../components/BatchTree';
import { ScheduleMatrix } from '../components/ScheduleMatrix';
import { useDebounce } from '../hooks/useDebounce';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { BulkImportView } from '../components/BulkImportView';
import { ScheduleMatrixBulkImportModal } from '../components/ScheduleMatrixBulkImportModal';
import { toast } from 'react-hot-toast';
import {
  Building2,
  Stethoscope,
  Layers,
  Users,
  Calendar,
  Key,
  Plus,
  RefreshCw,
  Search,
  Check,
  Copy,
  AlertTriangle,
  AlertCircle,
  UserCheck,
  UserMinus,
  UserX,
  ShieldCheck,
  Lock,
  Unlock,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  X,
  Code,
  FileCode,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

export const InstitutionDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const [institution, setInstitution] = useState<IInstitution | null>(null);
  const [activeTab, setActiveTab] = useState<'schedules' | 'departments' | 'batches' | 'roster' | 'bulkImport' | 'members' | 'accessCode'>('schedules');
  const [loading, setLoading] = useState(true);

  // Generic Confirmation Modal State
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

  // Institution Access Code Visibility
  const [showAccessCode, setShowAccessCode] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Departments State
  const [departments, setDepartments] = useState<IDepartment[]>([]);
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<IDepartment | null>(null);
  const [deptName, setDeptName] = useState('');
  const [deptAbbr, setDeptAbbr] = useState('');
  const [deptAliases, setDeptAliases] = useState('');
  const [deptDeletingId, setDeptDeletingId] = useState<string | null>(null);
  const [deptError, setDeptError] = useState<string | null>(null);

  // Batches State
  const [batchTree, setBatchTree] = useState<IBatchTreeNode[]>([]);
  const [allBatches, setAllBatches] = useState<IBatchNode[]>([]);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState<IBatchTreeNode | null>(null);
  const [batchCode, setBatchCode] = useState('');
  const [batchName, setBatchName] = useState('');
  const [batchParentId, setBatchParentId] = useState<string | null>(null);
  const [batchError, setBatchError] = useState<string | null>(null);

  // Roster State
  const [rosterRecords, setRosterRecords] = useState<IHouseSurgeonRecord[]>([]);
  const [rosterSearch, setRosterSearch] = useState('');
  const debouncedRosterSearch = useDebounce(rosterSearch, 300);
  const [rosterPage, setRosterPage] = useState(1);
  const [rosterPageSize, setRosterPageSize] = useState(25);
  const [rosterTotal, setRosterTotal] = useState(0);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [isRosterModalOpen, setIsRosterModalOpen] = useState(false);
  const [editingRoster, setEditingRoster] = useState<IHouseSurgeonRecord | null>(null);
  const [rosterName, setRosterName] = useState('');
  const [rosterBatchIds, setRosterBatchIds] = useState<string[]>([]);
  const [rosterError, setRosterError] = useState<string | null>(null);
  const [rosterWarning, setRosterWarning] = useState<string | null>(null);

  // Schedule Plans & Matrix State
  const [plans, setPlans] = useState<ISchedulePlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [versions, setVersions] = useState<any[]>([]);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [matrixData, setMatrixData] = useState<IFullMatrixResponse | null>(null);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [newPlanName, setNewPlanName] = useState('');
  const [isVersionModalOpen, setIsVersionModalOpen] = useState(false);
  const [versionNotes, setVersionNotes] = useState('');
  const [planDeletingId, setPlanDeletingId] = useState<string | null>(null);
  const [isScheduleBulkImportOpen, setIsScheduleBulkImportOpen] = useState(false);

  // Members State
  const [members, setMembers] = useState<any[]>([]);
  const [memberSearch, setMemberSearch] = useState('');
  const debouncedMemberSearch = useDebounce(memberSearch, 300);

  // Access Code Rotation
  const [newRotatedCode, setNewRotatedCode] = useState<string | null>(null);
  const [rotateConfirm, setRotateConfirm] = useState(false);

  // Fetch functions
  const fetchInstitution = async () => {
    try {
      const { data } = await apiClient.get(`/institutions/${id}`);
      setInstitution(data.data);
    } catch (err: any) {
      console.error(err);
    }
  };

  const fetchDepartments = async () => {
    try {
      const { data } = await apiClient.get('/departments', { params: { institutionId: id } });
      setDepartments(data.data.items || []);
    } catch (err: any) {
      console.error(err);
    }
  };

  const fetchBatches = async () => {
    try {
      const [treeRes, allRes] = await Promise.all([
        apiClient.get('/batches/tree', { params: { institutionId: id } }),
        apiClient.get('/batches/all', { params: { institutionId: id } })
      ]);
      setBatchTree(treeRes.data.data || []);
      setAllBatches(allRes.data.data || []);
    } catch (err: any) {
      console.error(err);
    }
  };

  const fetchRoster = async (pageOverride?: number, sizeOverride?: number) => {
    try {
      setRosterLoading(true);
      const targetPage = pageOverride ?? rosterPage;
      const targetSize = sizeOverride ?? rosterPageSize;
      const { data } = await apiClient.get('/roster', {
        params: {
          institutionId: id,
          search: debouncedRosterSearch,
          page: targetPage,
          pageSize: targetSize
        }
      });
      setRosterRecords(data.data.items || []);
      setRosterTotal(data.data.total ?? 0);
    } catch (err: any) {
      console.error(err);
    } finally {
      setRosterLoading(false);
    }
  };

  const fetchPlans = async () => {
    try {
      const { data } = await apiClient.get('/schedules/plans', { params: { institutionId: id } });
      const planItems = data.data || [];
      setPlans(planItems);
      if (planItems.length > 0) {
        if (!selectedPlanId || !planItems.find((p: any) => p.id === selectedPlanId)) {
          setSelectedPlanId(planItems[0].id);
        }
      } else {
        setSelectedPlanId(null);
        setVersions([]);
        setSelectedVersionId(null);
        setMatrixData(null);
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  const fetchVersions = async (planId: string) => {
    try {
      const { data } = await apiClient.get(`/schedules/plans/${planId}/versions`);
      const vItems = data.data || [];
      setVersions(vItems);
      if (vItems.length > 0) {
        const targetVersion = selectedVersionId && vItems.find((v: any) => v.id === selectedVersionId)
          ? selectedVersionId
          : vItems[0].id;
        setSelectedVersionId(targetVersion);
        fetchMatrix(targetVersion);
      } else {
        setSelectedVersionId(null);
        setMatrixData(null);
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  const fetchMatrix = async (versionId: string) => {
    try {
      const { data } = await apiClient.get(`/schedules/versions/${versionId}/matrix`);
      setMatrixData(data.data);
    } catch (err: any) {
      setMatrixData(null);
    }
  };

  const fetchMembers = async () => {
    try {
      const { data } = await apiClient.get(`/institutions/${id}/members`, {
        params: { search: debouncedMemberSearch }
      });
      setMembers(data.data.items || []);
    } catch (err: any) {
      console.error(err);
    }
  };

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      await Promise.all([
        fetchInstitution(),
        fetchDepartments(),
        fetchBatches(),
        fetchPlans(),
        fetchMembers()
      ]);
      setLoading(false);
    };
    if (id) loadAll();
  }, [id]);

  useEffect(() => {
    if (selectedPlanId) {
      fetchVersions(selectedPlanId);
    }
  }, [selectedPlanId]);

  useEffect(() => {
    setRosterPage(1);
  }, [debouncedRosterSearch]);

  useEffect(() => {
    if (id) {
      fetchRoster();
    }
  }, [id, debouncedRosterSearch, rosterPage, rosterPageSize]);

  useEffect(() => {
    fetchMembers();
  }, [debouncedMemberSearch]);

  // Copy helper
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    toast.success('Access code copied to clipboard');
    setTimeout(() => setCopiedCode(false), 3000);
  };

  // Department Handlers
  const openCreateDeptModal = () => {
    setEditingDept(null);
    setDeptName('');
    setDeptAbbr('');
    setDeptAliases('');
    setDeptError(null);
    setIsDeptModalOpen(true);
  };

  const openEditDeptModal = (dept: IDepartment) => {
    setEditingDept(dept);
    setDeptName(dept.name);
    setDeptAbbr(dept.abbreviation);
    setDeptAliases((dept.aliases || []).join(', '));
    setDeptError(null);
    setIsDeptModalOpen(true);
  };

  const handleSaveDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        institutionId: id,
        name: deptName.trim(),
        abbreviation: deptAbbr.trim().toUpperCase(),
        aliases: deptAliases.split(',').map((s) => s.trim()).filter(Boolean)
      };

      if (editingDept) {
        await apiClient.put(`/departments/${editingDept.id}`, payload);
        toast.success(`Department "${payload.name}" updated successfully`);
      } else {
        await apiClient.post('/departments', payload);
        toast.success(`Department "${payload.name}" created successfully`);
      }
      setIsDeptModalOpen(false);
      fetchDepartments();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save department');
    }
  };

  const handleOpenDeleteDept = (dept: IDepartment) => {
    setConfirmModal({
      isOpen: true,
      title: `Delete Department (${dept.name})`,
      message: `Are you sure you want to delete the department "${dept.name} (${dept.abbreviation})"?`,
      warningText: 'Deleting this department removes it from the institution roster and matrix. Historical records referencing it may be affected.',
      confirmLabel: 'Delete Department',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isLoading: true }));
        try {
          await apiClient.delete(`/departments/${dept.id}`);
          toast.success(`Department "${dept.name}" deleted successfully`);
          setConfirmModal((prev) => ({ ...prev, isOpen: false, isLoading: false }));
          fetchDepartments();
        } catch (err: any) {
          toast.error(err.response?.data?.message || 'Failed to delete department');
          setConfirmModal((prev) => ({ ...prev, isOpen: false, isLoading: false }));
        }
      }
    });
  };

  // Batch Handlers
  const openCreateBatchModal = (parentId: string | null = null) => {
    setEditingBatch(null);
    setBatchCode('');
    setBatchName('');
    setBatchParentId(parentId);
    setBatchError(null);
    setIsBatchModalOpen(true);
  };

  const openEditBatchModal = (batch: IBatchTreeNode) => {
    setEditingBatch(batch);
    setBatchCode(batch.code);
    setBatchName(batch.name);
    setBatchParentId(null);
    setBatchError(null);
    setIsBatchModalOpen(true);
  };

  const handleSaveBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingBatch) {
        await apiClient.put(`/batches/${editingBatch.id}`, {
          code: batchCode.trim().toUpperCase(),
          name: batchName.trim()
        });
        toast.success(`Batch ${batchCode.trim().toUpperCase()} updated successfully`);
      } else {
        await apiClient.post('/batches', {
          institutionId: id,
          code: batchCode.trim().toUpperCase(),
          name: batchName.trim(),
          parentBatchId: batchParentId || undefined
        });
        toast.success(`Batch ${batchCode.trim().toUpperCase()} created successfully`);
      }
      setIsBatchModalOpen(false);
      fetchBatches();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save batch');
    }
  };

  const handleOpenDeleteBatch = (batch: IBatchTreeNode) => {
    setConfirmModal({
      isOpen: true,
      title: `Delete Batch (${batch.name})`,
      message: `Are you sure you want to delete batch "${batch.code} - ${batch.name}" and any sub-batches?`,
      warningText: "Deletion of batches removes them from all schedules and house surgeons' list of assigned batches. Additionally, if this deletion results in a house surgeon having no batch, they will show 'No batches assigned'.",
      confirmLabel: 'Delete Batch',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isLoading: true }));
        try {
          await apiClient.delete(`/batches/${batch.id}`);
          toast.success(`Batch ${batch.code} deleted successfully`);
          setConfirmModal((prev) => ({ ...prev, isOpen: false, isLoading: false }));
          fetchBatches();
          fetchRoster();
        } catch (err: any) {
          toast.error(err.response?.data?.message || 'Failed to delete batch');
          setConfirmModal((prev) => ({ ...prev, isOpen: false, isLoading: false }));
        }
      }
    });
  };

  // Roster Handlers
  const openCreateRosterModal = () => {
    setEditingRoster(null);
    setRosterName('');
    setRosterBatchIds([]);
    setRosterWarning(null);
    setRosterError(null);
    setIsRosterModalOpen(true);
  };

  const openEditRosterModal = (r: IHouseSurgeonRecord) => {
    setEditingRoster(r);
    setRosterName(r.name);
    setRosterBatchIds(r.batchNodeIds || []);
    setRosterWarning(null);
    setRosterError(null);
    setIsRosterModalOpen(true);
  };

  const handleSaveRosterRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingRoster) {
        const { data } = await apiClient.put(`/roster/${editingRoster.id}`, {
          name: rosterName.trim(),
          batchNodeIds: rosterBatchIds
        });
        if (data.message) {
          toast(data.message, { icon: '⚠️' });
        } else {
          toast.success(`Dr. ${rosterName.trim()} updated successfully`);
        }
        setIsRosterModalOpen(false);
      } else {
        const { data } = await apiClient.post('/roster', {
          institutionId: id,
          name: rosterName.trim(),
          batchNodeIds: rosterBatchIds
        });
        if (data.message) {
          toast(data.message, { icon: '⚠️' });
        } else {
          toast.success(`Dr. ${rosterName.trim()} added to roster`);
        }
        setIsRosterModalOpen(false);
      }
      fetchRoster();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save house surgeon record');
    }
  };

  const handleOpenDeleteRoster = (record: IHouseSurgeonRecord) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete House Surgeon Record',
      message: `Are you sure you want to remove Dr. ${record.name} from the official college roster?`,
      warningText: 'This will permanently remove this doctor from the roster and unbind any registered house surgeon accounts that currently have this profile selected.',
      confirmLabel: 'Delete Record',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isLoading: true }));
        try {
          await apiClient.delete(`/roster/${record.id}`);
          toast.success(`Dr. ${record.name} removed from roster`);
          setConfirmModal((prev) => ({ ...prev, isOpen: false, isLoading: false }));
          fetchRoster();
          fetchMembers();
        } catch (err: any) {
          toast.error(err.response?.data?.message || 'Failed to delete roster record');
          setConfirmModal((prev) => ({ ...prev, isOpen: false, isLoading: false }));
        }
      }
    });
  };

  // Plan Handlers
  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data } = await apiClient.post('/schedules/plans', {
        institutionId: id,
        name: newPlanName.trim()
      });
      toast.success(`Schedule plan "${newPlanName.trim()}" created successfully`);
      setIsPlanModalOpen(false);
      setNewPlanName('');
      await fetchPlans();
      setSelectedPlanId(data.data.id);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create plan');
    }
  };

  const handleOpenDeletePlan = (plan: ISchedulePlan) => {
    setConfirmModal({
      isOpen: true,
      title: `Delete Schedule Plan (${plan.name})`,
      message: `Are you sure you want to delete plan "${plan.name}"?`,
      warningText: 'This will permanently delete the entire schedule plan along with all its versions, tracks, and matrix assignments.',
      confirmLabel: 'Delete Plan',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isLoading: true }));
        try {
          await apiClient.delete(`/schedules/plans/${plan.id}`);
          toast.success(`Schedule plan "${plan.name}" deleted successfully`);
          setConfirmModal((prev) => ({ ...prev, isOpen: false, isLoading: false }));
          await fetchPlans();
        } catch (err: any) {
          toast.error(err.response?.data?.message || 'Failed to delete plan');
          setConfirmModal((prev) => ({ ...prev, isOpen: false, isLoading: false }));
        }
      }
    });
  };

  // Version Handlers
  const handleCreateVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlanId) return;
    try {
      const { data } = await apiClient.post(`/schedules/plans/${selectedPlanId}/versions`, {
        notes: versionNotes.trim() || undefined
      });
      toast.success('New schedule version created');
      setIsVersionModalOpen(false);
      setVersionNotes('');
      await fetchVersions(selectedPlanId);
      setSelectedVersionId(data.data.id);
      fetchMatrix(data.data.id);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create schedule version');
    }
  };

  // Member Handlers
  const handleOpenRemoveMember = (m: any) => {
    const membershipId = m.id || m._id;
    const memberName = m.userId?.displayName || m.userId?.name || 'this doctor';
    setConfirmModal({
      isOpen: true,
      title: 'Remove Account from Institution',
      message: `Are you sure you want to remove ${memberName} (${m.userId?.email || ''}) from ${institution?.name}?`,
      warningText: 'The doctor will lose access to this college schedule and will need to re-enter an active college access code to rejoin.',
      confirmLabel: 'Remove Member',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isLoading: true }));
        try {
          await apiClient.delete(`/institutions/${id}/members/${membershipId}`);
          toast.success(`${memberName} removed from institution`);
          setConfirmModal((prev) => ({ ...prev, isOpen: false, isLoading: false }));
          fetchMembers();
        } catch (err: any) {
          toast.error(err.response?.data?.message || 'Failed to remove member from college');
          setConfirmModal((prev) => ({ ...prev, isOpen: false, isLoading: false }));
        }
      }
    });
  };

  const handleToggleBlockMember = (m: any) => {
    const userId = m.userId?.id || m.userId?._id;
    const isCurrentlyBlocked = m.userId?.status === 'blocked';
    const nextStatus = isCurrentlyBlocked ? 'active' : 'blocked';
    const memberName = m.userId?.displayName || m.userId?.name || 'this doctor';

    setConfirmModal({
      isOpen: true,
      title: isCurrentlyBlocked ? 'Unblock House Surgeon Account' : 'Block House Surgeon Account',
      message: isCurrentlyBlocked
        ? `Are you sure you want to unblock ${memberName} (${m.userId?.email || ''})?`
        : `Are you sure you want to block ${memberName} (${m.userId?.email || ''})?`,
      warningText: isCurrentlyBlocked
        ? 'The doctor will regain access to log in and view posting schedules.'
        : 'The doctor will be immediately blocked from logging in, viewing schedules, and interacting with the system.',
      confirmLabel: isCurrentlyBlocked ? 'Unblock Account' : 'Block Account',
      variant: isCurrentlyBlocked ? 'primary' : 'danger',
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isLoading: true }));
        try {
          await apiClient.put(`/auth/users/${userId}/status`, { status: nextStatus });
          toast.success(
            isCurrentlyBlocked
              ? `${memberName} unblocked successfully`
              : `${memberName} blocked successfully`
          );
          setConfirmModal((prev) => ({ ...prev, isOpen: false, isLoading: false }));
          fetchMembers();
        } catch (err: any) {
          toast.error(err.response?.data?.message || 'Failed to update account status');
          setConfirmModal((prev) => ({ ...prev, isOpen: false, isLoading: false }));
        }
      }
    });
  };

  // Rotate Code Handler
  const handleOpenRotateCode = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Rotate College Access Code',
      message: 'Are you sure you want to generate a new access code for this medical college?',
      warningText: 'The existing access code will be immediately revoked. Any house surgeons who have not yet joined will need the new code.',
      confirmLabel: 'Rotate Code',
      variant: 'warning',
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isLoading: true }));
        try {
          const { data } = await apiClient.post(`/institutions/${id}/rotate-code`);
          setNewRotatedCode(data.data.accessCode);
          toast.success('New access code generated successfully');
          setConfirmModal((prev) => ({ ...prev, isOpen: false, isLoading: false }));
          fetchInstitution();
        } catch (err: any) {
          toast.error(err.response?.data?.message || 'Failed to rotate access code');
          setConfirmModal((prev) => ({ ...prev, isOpen: false, isLoading: false }));
        }
      }
    });
  };

  // Toggle Allow New Joinees Handler
  const handleToggleAllowNewJoinees = () => {
    if (!institution) return;
    const isCurrentlyAllowed = institution.allowNewJoinees !== false;
    const nextAllowed = !isCurrentlyAllowed;

    setConfirmModal({
      isOpen: true,
      title: nextAllowed ? 'Open Institution to New Joinees' : 'Close Institution to New Joinees',
      message: nextAllowed
        ? 'Are you sure you want to reopen this institution to new joinees?'
        : 'Are you sure you want to block all new house surgeons from joining this institution?',
      warningText: nextAllowed
        ? 'House surgeons with the access code will be allowed to join and register for schedules.'
        : 'Any house surgeon attempting to join using the college access code will receive an error indicating that the administrator has closed the institution and new joinees are not allowed.',
      confirmLabel: nextAllowed ? 'Allow Joinees' : 'Block New Joinees',
      variant: nextAllowed ? 'primary' : 'warning',
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isLoading: true }));
        try {
          const { data } = await apiClient.put(`/institutions/${id}/toggle-joining`, {
            allowNewJoinees: nextAllowed
          });
          setInstitution(data.data);
          toast.success(nextAllowed ? 'Institution opened to new joinees' : 'Institution closed to new joinees');
          setConfirmModal((prev) => ({ ...prev, isOpen: false, isLoading: false }));
        } catch (err: any) {
          toast.error(err.response?.data?.message || 'Failed to update joining status');
          setConfirmModal((prev) => ({ ...prev, isOpen: false, isLoading: false }));
        }
      }
    });
  };

  if (loading || !institution) {
    return <div className="p-12 text-center text-slate-500">Loading institution details...</div>;
  }

  const tabs = [
    { key: 'schedules', label: 'Schedule Matrix', icon: Calendar },
    { key: 'departments', label: 'Departments', icon: Stethoscope },
    { key: 'batches', label: 'Batch Hierarchy', icon: Layers },
    { key: 'roster', label: 'House Surgeon Roster', icon: Users },
    { key: 'bulkImport', label: 'JSON Bulk Import', icon: Code },
    { key: 'members', label: 'Registered HS Accounts', icon: UserCheck },
    { key: 'accessCode', label: 'Access Code', icon: Key }
  ];

  const currentAccessCode = institution.plainCode || `${institution.codePrefix || institution.shortName}-ACTIVE`;

  return (
    <div className="space-y-6">
      {/* Institution Banner & Access Code View */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">{institution.name}</h1>
            <span className="font-mono text-xs font-bold px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-md">
              {institution.shortName}
            </span>
            {institution.allowNewJoinees === false && (
              <span className="text-xs font-bold px-2.5 py-1 bg-red-100 text-red-700 border border-red-200 rounded-md flex items-center shadow-2xs">
                <Lock className="w-3.5 h-3.5 mr-1" />
                Closed to New Joinees
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 mt-1">{institution.location}</p>
        </div>

        {/* Institution Access Code Badge with View Toggle */}
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center space-x-3">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              College Access Code
            </span>
            <span className="font-mono text-sm font-bold text-slate-800">
              {showAccessCode ? currentAccessCode : '••••••••••••'}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setShowAccessCode(!showAccessCode)}
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors"
            title={showAccessCode ? 'Hide Access Code' : 'View Access Code'}
          >
            {showAccessCode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={() => copyToClipboard(currentAccessCode)}
            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Copy Access Code"
          >
            {copiedCode ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-slate-200 flex space-x-2 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center px-4 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
                isActive
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icon className="w-4 h-4 mr-2" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab 1: SCHEDULE MATRIX */}
      {activeTab === 'schedules' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-slate-200">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-semibold text-slate-700">Schedule Plan:</span>
              {plans.length > 0 ? (
                <div className="flex items-center space-x-2">
                  <select
                    value={selectedPlanId || ''}
                    onChange={(e) => setSelectedPlanId(e.target.value)}
                    className="px-3.5 py-1.5 border border-slate-300 rounded-xl text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                  >
                    {plans.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>

                  {selectedPlanId && (
                    <button
                      onClick={() => {
                        const currentPlan = plans.find((p) => p.id === selectedPlanId);
                        if (currentPlan) handleOpenDeletePlan(currentPlan);
                      }}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete this schedule plan"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ) : (
                <span className="text-xs text-slate-400 italic">No plans created yet</span>
              )}

              <button
                onClick={() => {
                  setNewPlanName('');
                  setIsPlanModalOpen(true);
                }}
                className="px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors cursor-pointer"
              >
                + New Plan
              </button>

              <button
                onClick={() => setIsScheduleBulkImportOpen(true)}
                className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 rounded-lg border border-slate-300 transition-colors cursor-pointer shadow-2xs"
                title="Bulk import schedule matrix via JSON"
              >
                <FileCode className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
                <span>Bulk Import Matrix</span>
              </button>
            </div>
          </div>

          {matrixData ? (
            <ScheduleMatrix
              matrix={matrixData}
              institutionId={id!}
              allBatches={allBatches}
              versions={versions}
              selectedVersionId={selectedVersionId}
              onSelectVersion={(vId) => {
                setSelectedVersionId(vId);
                fetchMatrix(vId);
              }}
              onCreateVersion={() => {
                setVersionNotes(`Version ${versions.length + 1}`);
                setIsVersionModalOpen(true);
              }}
              onRefresh={() => {
                if (selectedVersionId) fetchMatrix(selectedVersionId);
              }}
            />
          ) : (
            <div className="p-12 text-center bg-white rounded-xl border border-slate-200 text-slate-500">
              <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-2" />
              <p className="font-semibold text-slate-700">No schedule matrix loaded</p>
              <p className="text-xs text-slate-400 mt-1 mb-4">Select or create a schedule plan to view the department matrix.</p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={() => {
                    setNewPlanName('');
                    setIsPlanModalOpen(true);
                  }}
                  className="inline-flex items-center px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4 mr-1.5" />
                  Create New Schedule Plan
                </button>
                <button
                  onClick={() => setIsScheduleBulkImportOpen(true)}
                  className="inline-flex items-center px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 rounded-lg border border-slate-300 shadow-sm transition-colors cursor-pointer"
                >
                  <FileCode className="w-4 h-4 mr-1.5 text-blue-600" />
                  Bulk Import Schedule JSON
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: DEPARTMENTS */}
      {activeTab === 'departments' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Clinical Departments</h2>
              <p className="text-xs text-slate-500">Manage clinical rotation departments and their unique color identities.</p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setActiveTab('bulkImport')}
                className="inline-flex items-center px-3.5 py-2 text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl shadow-2xs transition-colors"
              >
                <Code className="w-4 h-4 mr-1.5 text-blue-600" />
                Bulk Import
              </button>
              <button
                onClick={openCreateDeptModal}
                className="inline-flex items-center px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-colors"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Department
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {departments.map((dept) => (
              <div
                key={dept.id}
                className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs hover:shadow-xs transition-shadow flex items-center justify-between group"
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <span
                    className="w-5 h-5 rounded-full flex-shrink-0 shadow-sm"
                    style={{ backgroundColor: dept.color }}
                  />
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-slate-900 text-sm truncate">{dept.name}</h3>
                    <p className="text-xs text-slate-500 font-mono">{dept.abbreviation}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => openEditDeptModal(dept)}
                    className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Edit Department"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleOpenDeleteDept(dept)}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete Department"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: BATCH HIERARCHY */}
      {activeTab === 'batches' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Hierarchical Batch Structure</h2>
              <p className="text-xs text-slate-500">
                Arbitrarily nested batches (e.g. A → A1 → A1a). Child assignments inherit from ancestors unless overridden.
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setActiveTab('bulkImport')}
                className="inline-flex items-center px-3.5 py-2 text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl shadow-2xs transition-colors"
              >
                <Code className="w-4 h-4 mr-1.5 text-indigo-600" />
                Bulk Import
              </button>
              <button
                onClick={() => openCreateBatchModal(null)}
                className="inline-flex items-center px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-colors"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Root Batch
              </button>
            </div>
          </div>

          <BatchTree
            nodes={batchTree}
            onAddSubBatch={(parent) => openCreateBatchModal(parent.id)}
            onEditBatch={(node) => openEditBatchModal(node)}
            onDeleteBatch={(node) => handleOpenDeleteBatch(node)}
          />
        </div>
      )}

      {/* Tab 4: HOUSE SURGEON ROSTER */}
      {activeTab === 'roster' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Official House Surgeon Roster</h2>
              <p className="text-xs text-slate-500">
                Official roster entries containing doctor's full name and batch assignments.
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setActiveTab('bulkImport')}
                className="inline-flex items-center px-3.5 py-2 text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl shadow-2xs transition-colors"
              >
                <Code className="w-4 h-4 mr-1.5 text-purple-600" />
                Bulk Import
              </button>
              <button
                onClick={openCreateRosterModal}
                className="inline-flex items-center px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-colors"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add House Surgeon
              </button>
            </div>
          </div>

          {/* Search Input with Debounce */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex items-center space-x-3">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={rosterSearch}
              onChange={(e) => setRosterSearch(e.target.value)}
              placeholder="Search house surgeon by name..."
              className="w-full text-sm outline-none bg-transparent"
            />
            {rosterSearch && (
              <button onClick={() => setRosterSearch('')} className="text-xs text-slate-400 hover:text-slate-600">
                Clear
              </button>
            )}
          </div>

          {/* Roster Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase text-slate-500 tracking-wider">
                  <th className="px-6 py-3.5">Doctor Name</th>
                  <th className="px-6 py-3.5">Direct Assigned Batches</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className={`divide-y divide-slate-100 ${rosterLoading ? 'opacity-60 pointer-events-none' : ''}`}>
                {rosterRecords.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-12 text-center text-slate-500">
                      {rosterLoading ? 'Loading house surgeons...' : 'No house surgeon roster entries found.'}
                    </td>
                  </tr>
                ) : (
                  rosterRecords.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-3.5 font-semibold text-slate-900">{r.name}</td>
                      <td className="px-6 py-3.5">
                        <div className="flex flex-wrap gap-1.5">
                          {r.batchNodeIds.length === 0 ? (
                            <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                              No batches assigned
                            </span>
                          ) : (
                            r.batchNodeIds.map((bId) => {
                              const bNode = allBatches.find((b) => b.id === bId);
                              return (
                                <span
                                  key={bId}
                                  className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200"
                                >
                                  {bNode ? bNode.code : bId}
                                </span>
                              );
                            })
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-3.5 text-right space-x-2">
                        <button
                          onClick={() => openEditRosterModal(r)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit Roster Record"
                        >
                          <Edit2 className="w-4 h-4 inline" />
                        </button>
                        <button
                          onClick={() => handleOpenDeleteRoster(r)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete Roster Record"
                        >
                          <Trash2 className="w-4 h-4 inline" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* Pagination Controls */}
            {rosterTotal > 0 && (
              <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-600">
                <div className="flex items-center gap-3">
                  <span>
                    Showing{' '}
                    <span className="font-semibold text-slate-800">
                      {(rosterPage - 1) * rosterPageSize + 1}
                    </span>{' '}
                    to{' '}
                    <span className="font-semibold text-slate-800">
                      {Math.min(rosterPage * rosterPageSize, rosterTotal)}
                    </span>{' '}
                    of{' '}
                    <span className="font-semibold text-slate-800">{rosterTotal}</span> house surgeons
                  </span>
                  <span className="text-slate-300">|</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500">Per page:</span>
                    <select
                      value={rosterPageSize}
                      onChange={(e) => {
                        setRosterPageSize(Number(e.target.value));
                        setRosterPage(1);
                      }}
                      className="border border-slate-300 rounded px-2 py-0.5 text-xs text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                      <option value={200}>200</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setRosterPage((p) => Math.max(1, p - 1))}
                    disabled={rosterPage <= 1 || rosterLoading}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    Previous
                  </button>
                  <span className="px-2 py-1 font-medium text-slate-700">
                    Page {rosterPage} of {Math.max(1, Math.ceil(rosterTotal / rosterPageSize))}
                  </span>
                  <button
                    onClick={() =>
                      setRosterPage((p) =>
                        p < Math.ceil(rosterTotal / rosterPageSize) ? p + 1 : p
                      )
                    }
                    disabled={rosterPage >= Math.ceil(rosterTotal / rosterPageSize) || rosterLoading}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                  >
                    Next
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 5: REGISTERED HS ACCOUNTS */}
      {activeTab === 'members' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Enrolled House Surgeon Accounts</h2>
              <p className="text-xs text-slate-500">
                Accounts that joined {institution.name} using the access code. You can search, block, or remove members.
              </p>
            </div>
          </div>

          {/* Search Member Accounts by Name or Email */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex items-center space-x-3">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
              placeholder="Search house surgeon accounts by name or email..."
              className="w-full text-sm outline-none bg-transparent"
            />
            {memberSearch && (
              <button onClick={() => setMemberSearch('')} className="text-xs text-slate-400 hover:text-slate-600">
                Clear
              </button>
            )}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase text-slate-500 tracking-wider">
                  <th className="px-6 py-3.5">Account Name</th>
                  <th className="px-6 py-3.5">Email</th>
                  <th className="px-6 py-3.5">Default Schedule Profile</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {members.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                      No accounts found matching search criteria.
                    </td>
                  </tr>
                ) : (
                  members.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-3.5 font-semibold text-slate-900">{m.userId?.displayName || 'Unknown'}</td>
                      <td className="px-6 py-3.5 text-slate-600">{m.userId?.email}</td>
                      <td className="px-6 py-3.5">
                        {m.defaultScheduleRecordId?.name ? (
                          <span className="font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 text-xs">
                            {m.defaultScheduleRecordId.name}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs italic">Profile not selected</span>
                        )}
                      </td>
                      <td className="px-6 py-3.5">
                        <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                          m.userId?.status === 'blocked'
                            ? 'bg-red-100 text-red-800 border border-red-200'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {m.userId?.status === 'blocked' ? 'Blocked' : m.status}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-right space-x-2">
                        <button
                          onClick={() => handleToggleBlockMember(m)}
                          className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-lg border transition-colors ${
                            m.userId?.status === 'blocked'
                              ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-300'
                              : 'text-amber-700 bg-amber-50 hover:bg-amber-100 border-amber-300'
                          }`}
                          title={m.userId?.status === 'blocked' ? 'Unblock user account' : 'Block user account from signing in'}
                        >
                          {m.userId?.status === 'blocked' ? (
                            <>
                              <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                              Unblock
                            </>
                          ) : (
                            <>
                              <UserX className="w-3.5 h-3.5 mr-1" />
                              Block
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => handleOpenRemoveMember(m)}
                          className="inline-flex items-center px-2.5 py-1 text-xs font-semibold text-red-600 hover:text-white hover:bg-red-600 border border-red-200 hover:border-red-600 rounded-lg transition-colors"
                          title="Remove this account from the medical college"
                        >
                          <UserMinus className="w-3.5 h-3.5 mr-1" />
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 6: ACCESS CODE MANAGEMENT */}
      {activeTab === 'accessCode' && (
        <div className="max-w-2xl bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Institution Access Code</h2>
            <p className="text-xs text-slate-500 mt-1">
              House surgeons use this code to join {institution.name} after signing in with Google.
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              Active College Access Code
            </span>
            <div className="flex items-center space-x-3">
              <span className="text-2xl font-mono font-bold tracking-widest text-slate-900 bg-white px-4 py-2 rounded-xl border border-slate-300">
                {showAccessCode ? currentAccessCode : '••••••••••••'}
              </span>
              <button
                type="button"
                onClick={() => setShowAccessCode(!showAccessCode)}
                className="p-2 text-slate-600 hover:text-slate-900 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors"
                title={showAccessCode ? 'Hide Code' : 'View Code'}
              >
                {showAccessCode ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
              <button
                type="button"
                onClick={() => copyToClipboard(currentAccessCode)}
                className="p-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                title="Copy Access Code"
              >
                {copiedCode ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>
            <p className="text-xs text-slate-500">
              Share this code with your house surgeons. They enter it upon first login to join this college.
            </p>
          </div>

          {newRotatedCode && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-2">
              <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">
                New Access Code Generated
              </p>
              <div className="flex items-center justify-center space-x-3">
                <span className="text-2xl font-mono font-bold tracking-widest text-slate-900 bg-white px-3.5 py-1.5 rounded-lg border border-emerald-300">
                  {newRotatedCode}
                </span>
                <button
                  onClick={() => copyToClipboard(newRotatedCode)}
                  className="p-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                >
                  {copiedCode ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                </button>
              </div>
            </div>
          )}

          {/* Institution Enrollment & New Joinees Setting */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                  New Joinees Access Status
                </span>
                <p className="text-xs text-slate-600 mt-0.5">
                  Controls whether house surgeons can join {institution.name} using the college access code.
                </p>
              </div>
              <span
                className={`text-xs px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${
                  institution.allowNewJoinees !== false
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-red-100 text-red-800 border border-red-300'
                }`}
              >
                {institution.allowNewJoinees !== false ? 'Open to Joinees' : 'Closed by Admin'}
              </span>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleToggleAllowNewJoinees}
                className={`inline-flex items-center px-4 py-2 text-sm font-semibold rounded-xl border transition-colors shadow-2xs ${
                  institution.allowNewJoinees !== false
                    ? 'text-red-700 bg-red-50 hover:bg-red-100 border-red-300'
                    : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-300'
                }`}
              >
                {institution.allowNewJoinees !== false ? (
                  <>
                    <Lock className="w-4 h-4 mr-2" />
                    Close Institution to New Joinees
                  </>
                ) : (
                  <>
                    <Unlock className="w-4 h-4 mr-2" />
                    Open Institution to New Joinees
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={handleOpenRotateCode}
              className="inline-flex items-center px-4 py-2 text-sm font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-xl transition-colors"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Generate & Rotate New Access Code
            </button>
          </div>
        </div>
      )}

      {/* Tab: JSON BULK IMPORT */}
      {activeTab === 'bulkImport' && (
        <BulkImportView
          institutionId={id!}
          institutionName={institution.name}
          onImportComplete={() => {
            fetchDepartments();
            fetchBatches();
            fetchRoster();
            if (selectedVersionId) fetchMatrix(selectedVersionId);
          }}
          onNavigateTab={(tab) => setActiveTab(tab)}
        />
      )}

      {/* Department Modal (Create / Edit) */}
      {isDeptModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <form onSubmit={handleSaveDepartment} className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">
                {editingDept ? 'Edit Clinical Department' : 'Add Clinical Department'}
              </h3>
              <button
                type="button"
                onClick={() => setIsDeptModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Department Name</label>
              <input
                type="text"
                required
                placeholder="e.g. General Medicine"
                value={deptName}
                onChange={(e) => setDeptName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Abbreviation (e.g. GM, GS, PED)</label>
              <input
                type="text"
                required
                maxLength={6}
                placeholder="GM"
                value={deptAbbr}
                onChange={(e) => setDeptAbbr(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Aliases (comma-separated)</label>
              <input
                type="text"
                placeholder="Medicine, Internal Medicine"
                value={deptAliases}
                onChange={(e) => setDeptAliases(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex justify-end space-x-3 pt-3">
              <button
                type="button"
                onClick={() => setIsDeptModalOpen(false)}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm"
              >
                {editingDept ? 'Update Department' : 'Save Department'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Batch Modal (Create / Edit) */}
      {isBatchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <form onSubmit={handleSaveBatch} className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">
                {editingBatch ? 'Edit Batch' : batchParentId ? 'Add Sub-batch' : 'Add Root Batch'}
              </h3>
              <button
                type="button"
                onClick={() => setIsBatchModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Batch Code (e.g. A, A1, A1a)</label>
              <input
                type="text"
                required
                placeholder="A1a"
                value={batchCode}
                onChange={(e) => setBatchCode(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Batch Name / Description</label>
              <input
                type="text"
                required
                placeholder="Sub-batch A1a"
                value={batchName}
                onChange={(e) => setBatchName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex justify-end space-x-3 pt-3">
              <button
                type="button"
                onClick={() => setIsBatchModalOpen(false)}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm"
              >
                {editingBatch ? 'Update Batch' : 'Save Batch'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Roster Modal (Create / Edit) */}
      {isRosterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <form onSubmit={handleSaveRosterRecord} className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">
                {editingRoster ? 'Edit House Surgeon Roster Record' : 'Add House Surgeon to Official Roster'}
              </h3>
              <button
                type="button"
                onClick={() => setIsRosterModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
              <input
                type="text"
                required
                placeholder="Dr. Aditi Sharma"
                value={rosterName}
                onChange={(e) => setRosterName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Select Direct Batch Membership(s)</label>
              <div className="max-h-48 overflow-y-auto space-y-1.5 p-1 border border-slate-200 rounded-lg">
                {allBatches.map((b) => {
                  const isChecked = rosterBatchIds.includes(b.id);
                  return (
                    <label
                      key={b.id}
                      className="flex items-center justify-between p-2 rounded hover:bg-slate-50 border border-slate-100 text-xs cursor-pointer"
                    >
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            setRosterBatchIds(
                              isChecked ? rosterBatchIds.filter((bid) => bid !== b.id) : [...rosterBatchIds, b.id]
                            );
                          }}
                          className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                        />
                        <span className="font-bold">{b.code}</span>
                        <span className="text-slate-500">({b.name})</span>
                      </div>
                      <span className="text-slate-400 font-mono text-[10px]">depth {b.depth}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-3">
              <button
                type="button"
                onClick={() => setIsRosterModalOpen(false)}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm"
              >
                {editingRoster ? 'Update Doctor' : 'Add to Roster'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* New Plan Modal */}
      {isPlanModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <form onSubmit={handleCreatePlan} className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">Create Schedule Plan</h3>
              <button
                type="button"
                onClick={() => setIsPlanModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Plan Name</label>
              <input
                type="text"
                required
                placeholder="2026-2027 Compulsory Rotatory Internship"
                value={newPlanName}
                onChange={(e) => setNewPlanName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex justify-end space-x-3 pt-3">
              <button
                type="button"
                onClick={() => setIsPlanModalOpen(false)}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm"
              >
                Create Plan & Draft Version
              </button>
            </div>
          </form>
        </div>
      )}

      {/* New Version Modal */}
      {isVersionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <form onSubmit={handleCreateVersion} className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">Create New Schedule Version</h3>
              <button
                type="button"
                onClick={() => setIsVersionModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Version Notes / Description</label>
              <input
                type="text"
                placeholder="e.g. Version 2 - Mid term clinical adjustments"
                value={versionNotes}
                onChange={(e) => setVersionNotes(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex justify-end space-x-3 pt-3">
              <button
                type="button"
                onClick={() => setIsVersionModalOpen(false)}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm"
              >
                Create Draft Version
              </button>
            </div>
          </form>
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
        isOpen={isScheduleBulkImportOpen}
        onClose={() => setIsScheduleBulkImportOpen(false)}
        institutionId={id!}
        onImportComplete={async () => {
          await fetchPlans();
        }}
      />
    </div>
  );
};

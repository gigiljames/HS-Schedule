import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import { useDebounce } from '../hooks/useDebounce';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { toast } from 'react-hot-toast';
import {
  Users,
  Search,
  Mail,
  ShieldCheck,
  UserX,
  Clock,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Calendar
} from 'lucide-react';
import { formatRelativeTime, formatExactDateTime } from '../utils/timeAgo';

export const AccountsPage: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [loading, setLoading] = useState(true);

  // Pagination & Sorting State
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [sortSelection, setSortSelection] = useState<string>('name_asc');

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

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const [field, order] = sortSelection.split('_');
      const { data } = await apiClient.get('/auth/users', {
        params: {
          role: 'hs',
          search: debouncedSearch || undefined,
          page,
          pageSize,
          sortBy: field,
          sortOrder: order
        }
      });
      setUsers(data.data?.items || []);
      setTotal(data.data?.total || 0);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to load house surgeon accounts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  useEffect(() => {
    fetchUsers();
  }, [page, pageSize, debouncedSearch, sortSelection]);

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSortSelection(e.target.value);
    setPage(1);
  };

  const handleToggleBlock = (u: any) => {
    const targetUserId = u.userId || u.id;
    if (!targetUserId) return;
    const isCurrentlyBlocked = (u.accountStatus === 'blocked' || u.status === 'blocked');
    const nextStatus = isCurrentlyBlocked ? 'active' : 'blocked';

    setConfirmModal({
      isOpen: true,
      title: isCurrentlyBlocked ? 'Unblock House Surgeon Account' : 'Block House Surgeon Account',
      message: isCurrentlyBlocked
        ? `Are you sure you want to unblock ${u.displayName} (${u.email})?`
        : `Are you sure you want to block ${u.displayName} (${u.email})?`,
      warningText: isCurrentlyBlocked
        ? 'The doctor will regain immediate access to log in and view clinical schedules.'
        : 'The doctor will be immediately barred from logging in, viewing schedules, or using any app features.',
      confirmLabel: isCurrentlyBlocked ? 'Unblock Account' : 'Block Account',
      variant: isCurrentlyBlocked ? 'primary' : 'danger',
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isLoading: true }));
        try {
          await apiClient.put(`/auth/users/${targetUserId}/status`, { status: nextStatus });
          toast.success(
            isCurrentlyBlocked
              ? `Dr. ${u.displayName} unblocked successfully`
              : `Dr. ${u.displayName} blocked successfully`
          );
          // Immediate optimistic UI update
          setUsers((prev) =>
            prev.map((item) =>
              (item.userId === targetUserId || item.id === targetUserId)
                ? { ...item, status: nextStatus, accountStatus: nextStatus }
                : item
            )
          );
          setConfirmModal((prev) => ({ ...prev, isOpen: false, isLoading: false }));
          fetchUsers();
        } catch (err: any) {
          toast.error(err.response?.data?.message || 'Failed to update account status');
          setConfirmModal((prev) => ({ ...prev, isOpen: false, isLoading: false }));
        }
      }
    });
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Registered House Surgeon Accounts</h1>
        <p className="text-sm text-slate-500 mt-1">
          Doctors who have signed in with Google, joined an institution, and selected a default schedule profile.
        </p>
      </div>

      {/* Search and Sort Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex items-center space-x-3">
          <Search className="w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search accounts by doctor name, email, or institution..."
            className="w-full text-sm outline-none bg-transparent"
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-xs text-slate-400 hover:text-slate-600 px-2">
              Clear
            </button>
          )}
        </div>

        <div className="bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-2xs flex items-center space-x-2.5">
          <ArrowUpDown className="w-4 h-4 text-slate-400 shrink-0" />
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider shrink-0">Sort:</span>
          <select
            value={sortSelection}
            onChange={handleSortChange}
            className="text-xs font-medium text-slate-700 bg-transparent border-none outline-none cursor-pointer pr-2"
          >
            <option value="name_asc">Doctor Name (A-Z)</option>
            <option value="name_desc">Doctor Name (Z-A)</option>
            <option value="createdAt_desc">Registration Date (Newest first)</option>
            <option value="createdAt_asc">Registration Date (Oldest first)</option>
            <option value="lastActiveAt_desc">Last Active (Most Recent)</option>
            <option value="lastActiveAt_asc">Last Active (Least Recent)</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500">Loading accounts...</div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-slate-700">No house surgeon accounts found</p>
            <p className="text-xs text-slate-400 mt-1">Accounts will appear here once doctors sign in and join with an institution access code.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase text-slate-500 tracking-wider">
                  <th className="px-6 py-3.5">Doctor Display Name</th>
                  <th className="px-6 py-3.5">Google Email</th>
                  <th className="px-6 py-3.5">Institution Membership</th>
                  <th className="px-6 py-3.5">Default Schedule Profile</th>
                  <th className="px-6 py-3.5">Registered On</th>
                  <th className="px-6 py-3.5">Last Active</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => {
                  const isBlocked = (u.accountStatus === 'blocked' || u.status === 'blocked');
                  const targetUserId = u.userId || u.id;
                  return (
                    <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4 font-semibold text-slate-900">{u.displayName}</td>
                      <td className="px-6 py-4 text-slate-600">
                        <span className="flex items-center space-x-1.5">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          <span>{u.email}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-700 font-medium">{u.institutionName}</td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {u.defaultProfile}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-600 text-xs">
                        <span className="flex items-center space-x-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>
                            {u.createdAt
                              ? new Date(u.createdAt).toLocaleDateString('en-IN', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric'
                                })
                              : 'N/A'}
                          </span>
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div
                          className="inline-flex items-center space-x-1.5 text-xs text-slate-600 cursor-help"
                          title={formatExactDateTime(u.lastActiveAt)}
                        >
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span className={u.lastActiveAt ? 'font-medium text-slate-700' : 'text-slate-400 italic'}>
                            {formatRelativeTime(u.lastActiveAt)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                          isBlocked
                            ? 'bg-red-100 text-red-800 border border-red-200'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        }`}>
                          {isBlocked ? 'Blocked' : u.membershipStatus === 'none' ? 'Active (No College)' : 'Active'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {targetUserId && (
                          <button
                            onClick={() => handleToggleBlock(u)}
                            className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-lg border transition-colors ${
                              isBlocked
                                ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-300'
                                : 'text-amber-700 bg-amber-50 hover:bg-amber-100 border-amber-300'
                            }`}
                            title={isBlocked ? 'Unblock user account' : 'Block user account'}
                          >
                            {isBlocked ? (
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
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        {total > 0 && (
          <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-600">
            <div className="flex items-center gap-3">
              <span>
                Showing{' '}
                <span className="font-semibold text-slate-800">
                  {(page - 1) * pageSize + 1}
                </span>{' '}
                to{' '}
                <span className="font-semibold text-slate-800">
                  {Math.min(page * pageSize, total)}
                </span>{' '}
                of{' '}
                <span className="font-semibold text-slate-800">{total}</span> accounts
              </span>
              <span className="text-slate-300">|</span>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500">Per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                  className="border border-slate-300 rounded px-2 py-0.5 text-xs text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Previous
              </button>
              <span className="px-2 py-1 font-medium text-slate-700">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => (p < totalPages ? p + 1 : p))}
                disabled={page >= totalPages || loading}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                Next
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
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
    </div>
  );
};

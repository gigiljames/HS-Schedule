import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import { useDebounce } from '../hooks/useDebounce';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { toast } from 'react-hot-toast';
import { Users, Search, Mail, ShieldCheck, UserX } from 'lucide-react';

export const AccountsPage: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [loading, setLoading] = useState(true);

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
      // Direct endpoint returning all HS users with their institution & schedule profile status
      const { data } = await apiClient.get('/auth/users', {
        params: {
          role: 'hs',
          search: debouncedSearch || undefined,
          pageSize: 200
        }
      });
      setUsers(data.data?.items || []);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to load house surgeon accounts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [debouncedSearch]);

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Registered House Surgeon Accounts</h1>
        <p className="text-sm text-slate-500 mt-1">
          Doctors who have signed in with Google, joined an institution, and selected a default schedule profile.
        </p>
      </div>

      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex items-center space-x-3">
        <Search className="w-5 h-5 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search accounts by doctor name, email, or institution..."
          className="w-full text-sm outline-none bg-transparent"
        />
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
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase text-slate-500 tracking-wider">
                <th className="px-6 py-3.5">Doctor Display Name</th>
                <th className="px-6 py-3.5">Google Email</th>
                <th className="px-6 py-3.5">Institution Membership</th>
                <th className="px-6 py-3.5">Default Schedule Profile</th>
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

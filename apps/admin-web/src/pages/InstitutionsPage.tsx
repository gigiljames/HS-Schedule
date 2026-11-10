import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import { Link } from 'react-router-dom';
import { IInstitution } from '../shared';
import { useDebounce } from '../hooks/useDebounce';
import { toast } from 'react-hot-toast';
import {
  Building2,
  Plus,
  Search,
  Key,
  ChevronRight,
  Copy,
  Check,
  X,
  Eye,
  EyeOff,
  ArrowUpDown,
  ChevronLeft
} from 'lucide-react';

export const InstitutionsPage: React.FC = () => {
  const [institutions, setInstitutions] = useState<IInstitution[]>([]);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [sortSelection, setSortSelection] = useState<string>('name_asc');
  const [loading, setLoading] = useState(true);

  // Hidden/visible state for access codes: Map of institution id -> boolean
  const [visibleCodes, setVisibleCodes] = useState<Record<string, boolean>>({});

  // New Institution Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [shortName, setShortName] = useState('');
  const [location, setLocation] = useState('');
  const [createdAccessCode, setCreatedAccessCode] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchInstitutions = async () => {
    setLoading(true);
    try {
      const [field, order] = sortSelection.split('_');
      const { data } = await apiClient.get('/institutions', {
        params: {
          search: debouncedSearch,
          page,
          pageSize,
          sortBy: field,
          sortOrder: order
        }
      });
      setInstitutions(data.data.items || []);
      setTotal(data.data.total || 0);
    } catch {
      // error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  useEffect(() => {
    fetchInstitutions();
  }, [page, pageSize, debouncedSearch, sortSelection]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { data } = await apiClient.post('/institutions', {
        name: name.trim(),
        shortName: shortName.trim().toUpperCase(),
        location: location.trim()
      });
      toast.success(`Medical college "${name.trim()}" created successfully!`);
      setCreatedAccessCode(data.data.accessCode);
      fetchInstitutions();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create institution');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleCodeVisibility = (instId: string) => {
    setVisibleCodes((prev) => ({
      ...prev,
      [instId]: !prev[instId]
    }));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    toast.success('Access code copied to clipboard');
    setTimeout(() => setCopiedCode(false), 3000);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setName('');
    setShortName('');
    setLocation('');
    setCreatedAccessCode(null);
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Medical Institutions</h1>
          <p className="text-sm text-slate-500 mt-1">
            Independent institutional boundaries for medical colleges, departments, and rosters.
          </p>
        </div>

        <button
          onClick={() => {
            setIsModalOpen(true);
          }}
          className="inline-flex items-center px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Medical College
        </button>
      </div>

      {/* Search and Sort Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex items-center space-x-3">
          <Search className="w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search institutions by name or location..."
            className="w-full bg-transparent border-none focus:outline-none text-sm text-slate-800 placeholder-slate-400"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="text-xs text-slate-400 hover:text-slate-600 px-2 py-1"
            >
              Clear
            </button>
          )}
        </div>

        <div className="bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-2xs flex items-center space-x-2.5">
          <ArrowUpDown className="w-4 h-4 text-slate-400 shrink-0" />
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider shrink-0">Sort:</span>
          <select
            value={sortSelection}
            onChange={(e) => {
              setSortSelection(e.target.value);
              setPage(1);
            }}
            className="text-xs font-medium text-slate-700 bg-transparent border-none outline-none cursor-pointer pr-2"
          >
            <option value="name_asc">Institution Name (A-Z)</option>
            <option value="name_desc">Institution Name (Z-A)</option>
            <option value="createdAt_desc">Date Created (Newest first)</option>
            <option value="createdAt_asc">Date Created (Oldest first)</option>
          </select>
        </div>
      </div>

      {/* Institutions Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500">Loading institutions...</div>
        ) : institutions.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-slate-700">No institutions found</p>
            <p className="text-xs text-slate-400 mt-1">Try adjusting your search criteria or add a new institution.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase text-slate-500 tracking-wider">
                  <th className="px-6 py-3.5">Institution Name</th>
                  <th className="px-6 py-3.5">Short Code</th>
                  <th className="px-6 py-3.5">Location</th>
                  <th className="px-6 py-3.5">Access Code</th>
                  <th className="px-6 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {institutions.map((inst: any) => {
                  const isVisible = !!visibleCodes[inst.id];
                  const codeToDisplay = inst.plainCode || `${inst.accessCodePrefix || inst.shortName}-••••••`;
                  return (
                    <tr key={inst.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4 font-semibold text-slate-900">{inst.name}</td>
                      <td className="px-6 py-4">
                        <span className="font-mono text-xs font-bold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-md">
                          {inst.shortName}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-600">{inst.location}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-xs font-semibold text-slate-800 bg-slate-100 px-2.5 py-1 rounded border border-slate-200">
                            {isVisible ? (inst.plainCode || `${inst.accessCodePrefix || inst.shortName}-ACTIVE`) : '••••••••••'}
                          </span>
                          <button
                            type="button"
                            onClick={() => toggleCodeVisibility(inst.id)}
                            className="p-1 text-slate-500 hover:text-slate-800 rounded transition-colors"
                            title={isVisible ? 'Hide Access Code' : 'View Access Code'}
                          >
                            {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          to={`/institutions/${inst.id}`}
                          className="inline-flex items-center text-xs font-semibold text-blue-600 hover:text-blue-800"
                        >
                          <span>Manage</span>
                          <ChevronRight className="w-4 h-4 ml-1" />
                        </Link>
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
                <span className="font-semibold text-slate-800">{total}</span> institutions
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

      {/* Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">Add Medical College</h3>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {createdAccessCode ? (
              <div className="mt-4 space-y-4">
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
                  <Key className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">
                    Institution Created & Access Code Generated
                  </p>
                  <div className="mt-3 flex items-center justify-center space-x-2">
                    <span className="text-2xl font-mono font-bold tracking-widest text-slate-900 bg-white px-3 py-1.5 rounded-lg border border-emerald-300 shadow-2xs">
                      {createdAccessCode}
                    </span>
                    <button
                      onClick={() => copyToClipboard(createdAccessCode)}
                      className="p-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                      title="Copy code"
                    >
                      {copiedCode ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-3">
                    Provide this access code to your House Surgeons. You can also view it anytime in the admin console.
                  </p>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={closeModal}
                    className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreate} className="mt-4 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Full Institution Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Kasturba Medical College"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Short Name / Abbreviation (used as code prefix)
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={8}
                    placeholder="e.g. KMC"
                    value={shortName}
                    onChange={(e) => setShortName(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm uppercase"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Location / Campus</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Manipal, Karnataka"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm disabled:opacity-50"
                  >
                    {submitting ? 'Creating...' : 'Create & Generate Code'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

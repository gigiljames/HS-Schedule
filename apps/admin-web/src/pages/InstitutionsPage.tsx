import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import { Link } from 'react-router-dom';
import { IInstitution } from '@hs/shared';
import { useDebounce } from '../hooks/useDebounce';
import { toast } from 'react-hot-toast';
import { Building2, Plus, Search, Key, ChevronRight, Copy, Check, X, Eye, EyeOff } from 'lucide-react';

export const InstitutionsPage: React.FC = () => {
  const [institutions, setInstitutions] = useState<IInstitution[]>([]);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
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
      const { data } = await apiClient.get('/institutions', {
        params: { search: debouncedSearch, page, pageSize: 15 }
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
    fetchInstitutions();
  }, [page, debouncedSearch]);

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

      {/* Search Input with Debounce */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center space-x-3">
        <Search className="w-5 h-5 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
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

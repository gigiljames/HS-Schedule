import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import { useDebounce } from '../hooks/useDebounce';
import { toast } from 'react-hot-toast';
import { Search, UserCheck, Layers, Check, Info, X, Building2, ArrowLeft } from 'lucide-react';

export const SelectProfilePage: React.FC = () => {
  const { institution, setDefaultSchedule, refreshMembership, membership } = useAuth();
  const navigate = useNavigate();

  // If the user already has a default schedule profile and is offline, changing roster is not allowed
  useEffect(() => {
    if (!navigator.onLine && membership?.defaultScheduleRecordId) {
      toast.error('Changing roster profile is not allowed in offline mode. Please connect to the internet.');
      navigate('/', { replace: true });
    }
  }, [membership?.defaultScheduleRecordId, navigate]);

  const PAGE_SIZE = 24;
  const [rosterList, setRosterList] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const observerTarget = useRef<HTMLDivElement>(null);

  // Load college batches
  useEffect(() => {
    if (!institution) {
      navigate('/join');
      return;
    }

    if (!navigator.onLine) {
      return;
    }

    const loadBatches = async () => {
      try {
        const { data } = await apiClient.get('/batches/all', { params: { institutionId: institution.id } });
        setBatches(data.data || []);
      } catch {
        // ignore
      }
    };

    loadBatches();
  }, [institution, navigate]);

  // Initial and search-driven roster query
  useEffect(() => {
    if (!institution) return;
    let isCancelled = false;

    if (!navigator.onLine) {
      setLoading(false);
      setHasMore(false);
      return;
    }

    const fetchInitialRoster = async () => {
      setLoading(true);
      setPage(1);
      try {
        const { data } = await apiClient.get('/roster', {
          params: {
            institutionId: institution.id,
            search: debouncedSearch.trim() || undefined,
            page: 1,
            pageSize: PAGE_SIZE
          }
        });
        if (!isCancelled) {
          const items = data.data?.items || [];
          const total = data.data?.total ?? items.length;
          setRosterList(items);
          setTotalCount(total);
          setHasMore(items.length < total);
        }
      } catch (err: any) {
        if (!isCancelled) {
          setHasMore(false);
          toast.error('Failed to load official college roster');
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    fetchInitialRoster();

    return () => {
      isCancelled = true;
    };
  }, [institution, debouncedSearch]);

  // Load next page on scroll
  const loadNextPage = async () => {
    if (!institution || loadingMore || !hasMore || loading || !navigator.onLine) return;
    const nextPage = page + 1;
    setLoadingMore(true);
    try {
      const { data } = await apiClient.get('/roster', {
        params: {
          institutionId: institution.id,
          search: debouncedSearch.trim() || undefined,
          page: nextPage,
          pageSize: PAGE_SIZE
        }
      });
      const newItems = data.data?.items || [];
      const total = data.data?.total ?? totalCount;
      setRosterList((prev) => {
        const updated = [...prev, ...newItems];
        setHasMore(updated.length < total && newItems.length > 0);
        return updated;
      });
      setTotalCount(total);
      setPage(nextPage);
    } catch {
      setHasMore(false);
    } finally {
      setLoadingMore(false);
    }
  };

  // Setup IntersectionObserver for infinite scrolling
  useEffect(() => {
    const target = observerTarget.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
          loadNextPage();
        }
      },
      { threshold: 0.1, rootMargin: '300px' }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore, page, debouncedSearch, institution]);

  const batchMap = new Map(batches.map((b) => [b.id, b]));

  const handleSelectRecord = (record: any) => {
    setSelectedRecord(record);
    setIsConfirming(true);
  };

  const handleConfirmProfile = async () => {
    if (!selectedRecord) return;
    if (!navigator.onLine) {
      toast.error('Setting schedule profile requires an active internet connection.');
      return;
    }
    setSubmitting(true);
    try {
      await setDefaultSchedule(selectedRecord.id);
      await refreshMembership();
      toast.success(`Schedule profile set to Dr. ${selectedRecord.name}`);
      setIsConfirming(false);
      navigate('/', { replace: true });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save profile selection');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 px-4 sm:px-6 lg:px-8 py-8 max-w-6xl mx-auto w-full text-slate-100 flex flex-col justify-between">
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-900">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-blue-400 uppercase tracking-widest flex items-center">
                <Building2 className="w-3.5 h-3.5 mr-1" />
                {institution?.name}
              </span>
              {institution?.shortName && (
                <span className="font-mono text-[10px] font-bold px-2 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/30 rounded-md">
                  {institution.shortName}
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white mt-1">
              Select Your Schedule Profile
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Select your name from the verified college roster to link your clinical timetable, department tracks, and automated reminders.
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate('/profile')}
            className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700 text-xs font-semibold transition-all shadow-sm shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Profile</span>
          </button>
        </div>

        {/* Debounced Search */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 flex items-center space-x-3 shadow-lg">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search roster by doctor name..."
            className="w-full text-xs sm:text-sm bg-transparent outline-none text-white placeholder-slate-500"
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-slate-500 hover:text-white p-1">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Live count and search indicator */}
        <div className="flex items-center justify-between text-xs text-slate-500 px-1">
          <span>
            {loading
              ? 'Searching roster...'
              : `Showing ${rosterList.length} of ${totalCount} house surgeons`}
          </span>
          {debouncedSearch && (
            <span className="text-blue-400 font-medium">Filtered by "{debouncedSearch}"</span>
          )}
        </div>

        {/* Roster Cards Grid (Responsive 1-4 columns) */}
        <div>
          {loading ? (
            <div className="py-20 text-center text-slate-500 text-sm flex flex-col items-center justify-center space-y-3">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <span>Loading official college roster...</span>
            </div>
          ) : rosterList.length === 0 ? (
            <div className="p-12 text-center bg-slate-900/60 rounded-3xl border border-dashed border-slate-800 text-slate-500 text-xs sm:text-sm space-y-2">
              <UserCheck className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              <p className="font-semibold text-slate-400">No matching house surgeon found</p>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Check the spelling of your name or contact your medical college administrator to ensure your profile has been added to the official roster.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
              {rosterList.map((record) => (
                <div
                  key={record.id}
                  onClick={() => handleSelectRecord(record)}
                  className="p-4 bg-slate-900/90 hover:bg-slate-850 rounded-2xl border border-slate-800 hover:border-blue-500/60 cursor-pointer transition-all flex flex-col justify-between group shadow-md hover:shadow-xl"
                >
                  <div className="space-y-2 min-w-0">
                    <div className="flex items-start justify-between">
                      <h3 className="font-bold text-white text-sm group-hover:text-blue-400 transition-colors truncate">
                        {record.name}
                      </h3>
                      <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white shrink-0 ml-1.5 transition-colors">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {record.batchNodeIds.length === 0 ? (
                        <span className="text-[10px] text-slate-500 italic">No batches</span>
                      ) : (
                        record.batchNodeIds.map((bId: string) => {
                          const b = batchMap.get(bId);
                          return (
                            <span
                              key={bId}
                              className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-950 text-blue-300 border border-blue-800/60"
                            >
                              Batch {b ? b.code : bId}
                            </span>
                          );
                        })
                      )}
                    </div>
                  </div>

                  <div className="pt-3 mt-3 border-t border-slate-800/80 text-[11px] text-slate-500 flex justify-between items-center">
                    <span>Select profile</span>
                    <span className="text-blue-400 group-hover:translate-x-0.5 transition-transform">→</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Infinite Scroll Sentinel and Loaders */}
          <div ref={observerTarget} className="py-6 flex flex-col items-center justify-center">
            {loadingMore && (
              <div className="flex items-center space-x-2 text-xs text-blue-400 font-medium py-3">
                <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                <span>Loading more house surgeons...</span>
              </div>
            )}

            {!hasMore && rosterList.length > 0 && !loading && (
              <p className="text-xs text-slate-500 py-2">
                Showing all {totalCount} house surgeons
              </p>
            )}

            {hasMore && !loading && !loadingMore && (
              <button
                onClick={loadNextPage}
                className="text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-lg border border-slate-800 hover:border-slate-700 transition-colors"
              >
                Load more
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Dialog with In-Form Error */}
      {isConfirming && selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-blue-600/20 text-blue-400 flex items-center justify-center mx-auto">
              <UserCheck className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="text-lg font-bold text-white">Confirm Schedule Selection</h3>
              <p className="text-sm font-semibold text-blue-400 mt-1">{selectedRecord.name}</p>

              <div className="mt-4 p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] text-slate-400 text-left flex space-x-2">
                <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <span>
                  This links your account to this doctor's rotation calendar. You can update this at any time in your Profile.
                </span>
              </div>
            </div>

            <div className="flex space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setIsConfirming(false)}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmProfile}
                disabled={submitting}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/30 transition-all disabled:opacity-50"
              >
                {submitting ? 'Saving...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="text-center text-xs text-slate-600 pt-8 pb-2">
        House Surgeon Schedule Planner • {institution?.name}
      </footer>
    </div>
  );
};

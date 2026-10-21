import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSchedule } from '../context/ScheduleContext';
import { OfflineBanner } from '../components/OfflineBanner';
import { useDebounce } from '../hooks/useDebounce';
import { apiClient } from '../api/client';
import { getTodayInKolkata, IDirectoryEntry, formatDisplayDate } from '@hs/shared';
import { toast } from 'react-hot-toast';
import {
  Search,
  Calendar,
  Building2,
  Users,
  ChevronDown,
  ChevronsUpDown,
  X,
  Sparkles,
  Stethoscope,
  Layers,
  Clock,
  RotateCcw
} from 'lucide-react';

interface IDepartmentInfo {
  id: string;
  name: string;
  abbreviation: string;
  color: string;
}

interface IAssignedSurgeon {
  rosterRecordId: string;
  rosterRecordName: string;
  directBatchCodes: string[];
  trackName: string;
  startDate: string;
  endDate: string;
  departmentColor: string;
  rawEntry: IDirectoryEntry;
}

interface IDepartmentAccordionGroup {
  department: IDepartmentInfo;
  surgeons: IAssignedSurgeon[];
  matchingSurgeons: IAssignedSurgeon[];
  isDeptMatch: boolean;
}

export const DirectoryPage: React.FC = () => {
  const { institution, setDefaultSchedule, refreshMembership } = useAuth();
  const { isOffline, snapshot, resolveColleaguePostings } = useSchedule();

  const todayStr = getTodayInKolkata();
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 250);

  const [rawEntries, setRawEntries] = useState<IDirectoryEntry[]>([]);
  const [apiDepartments, setApiDepartments] = useState<IDepartmentInfo[]>([]);
  const [loading, setLoading] = useState(false);

  // Accordion open/close state (set of department IDs)
  const [expandedDeptIds, setExpandedDeptIds] = useState<Set<string>>(new Set());

  // Selected colleague schedule details modal
  const [viewingColleague, setViewingColleague] = useState<IDirectoryEntry | null>(null);
  const [colleaguePostings, setColleaguePostings] = useState<any[]>([]);
  const [settingDefault, setSettingDefault] = useState(false);

  // Fetch or resolve directory data for selectedDate
  const fetchDirectory = async () => {
    if (!institution) return;
    setLoading(true);

    if (isOffline && snapshot) {
      // Offline resolution from cached snapshot
      const batchMap = new Map(snapshot.batches.map((b) => [b.id, b]));
      const offlineResults: IDirectoryEntry[] = [];

      for (const record of snapshot.rosterRecords) {
        const postings = resolveColleaguePostings(record.id, selectedDate);
        const directCodes = record.batchNodeIds
          .map((id) => batchMap.get(id)?.code)
          .filter(Boolean) as string[];

        offlineResults.push({
          rosterRecordId: record.id,
          rosterRecordName: record.name,
          directBatchCodes: directCodes,
          activePostings: postings.map((p) => ({
            departmentId: p.departmentId,
            trackName: p.trackName,
            departmentName: p.departmentName,
            departmentAbbreviation: p.departmentAbbreviation,
            departmentColor: p.departmentColor,
            startDate: p.startDate,
            endDate: p.endDate
          }))
        });
      }

      setRawEntries(offlineResults);
      setLoading(false);
      return;
    }

    try {
      const { data } = await apiClient.get('/directory', {
        params: {
          institutionId: institution.id,
          date: selectedDate
        }
      });

      setRawEntries(data.data || []);
      if (data.departments && Array.isArray(data.departments)) {
        setApiDepartments(data.departments);
      }
    } catch {
      // If network fails and snapshot is available, fallback to snapshot
      if (snapshot) {
        const batchMap = new Map(snapshot.batches.map((b) => [b.id, b]));
        const offlineResults: IDirectoryEntry[] = [];
        for (const record of snapshot.rosterRecords) {
          const postings = resolveColleaguePostings(record.id, selectedDate);
          const directCodes = record.batchNodeIds
            .map((id) => batchMap.get(id)?.code)
            .filter(Boolean) as string[];

          offlineResults.push({
            rosterRecordId: record.id,
            rosterRecordName: record.name,
            directBatchCodes: directCodes,
            activePostings: postings.map((p) => ({
              departmentId: p.departmentId,
              trackName: p.trackName,
              departmentName: p.departmentName,
              departmentAbbreviation: p.departmentAbbreviation,
              departmentColor: p.departmentColor,
              startDate: p.startDate,
              endDate: p.endDate
            }))
          });
        }
        setRawEntries(offlineResults);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDirectory();
  }, [selectedDate, isOffline, snapshot?.scheduleVersionId]);

  // Master list of all departments
  const allDepartments = useMemo<IDepartmentInfo[]>(() => {
    const deptMap = new Map<string, IDepartmentInfo>();

    // 1. From snapshot if available
    if (snapshot?.departments) {
      for (const d of snapshot.departments) {
        deptMap.set(d.id, {
          id: d.id,
          name: d.name,
          abbreviation: d.abbreviation,
          color: d.color
        });
      }
    }

    // 2. From API response if returned
    for (const d of apiDepartments) {
      if (!deptMap.has(d.id)) {
        deptMap.set(d.id, d);
      }
    }

    // 3. From any active postings in entries
    for (const entry of rawEntries) {
      for (const p of entry.activePostings) {
        const key = p.departmentId || p.departmentName;
        if (!deptMap.has(key)) {
          deptMap.set(key, {
            id: key,
            name: p.departmentName,
            abbreviation: p.departmentAbbreviation || p.departmentName.substring(0, 3).toUpperCase(),
            color: p.departmentColor || '#3B82F6'
          });
        }
      }
    }

    return Array.from(deptMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [snapshot?.departments, apiDepartments, rawEntries]);

  // Group surgeons into their respective departments for the selected date
  const departmentGroups = useMemo<IDepartmentAccordionGroup[]>(() => {
    const q = debouncedSearchQuery.toLowerCase().trim();

    // Map each department ID/name to assigned surgeons
    const deptSurgeonMap = new Map<string, IAssignedSurgeon[]>();
    for (const dept of allDepartments) {
      deptSurgeonMap.set(dept.id, []);
    }

    for (const entry of rawEntries) {
      for (const posting of entry.activePostings) {
        // Find matching department by ID or name
        const dept = allDepartments.find(
          (d) =>
            (posting.departmentId && d.id === posting.departmentId) ||
            d.name.toLowerCase() === posting.departmentName.toLowerCase() ||
            d.abbreviation.toLowerCase() === posting.departmentAbbreviation?.toLowerCase()
        );

        if (dept) {
          const list = deptSurgeonMap.get(dept.id) || [];
          // Avoid duplicate surgeon entry under same department
          if (!list.some((s) => s.rosterRecordId === entry.rosterRecordId)) {
            list.push({
              rosterRecordId: entry.rosterRecordId,
              rosterRecordName: entry.rosterRecordName,
              directBatchCodes: entry.directBatchCodes,
              trackName: posting.trackName,
              startDate: posting.startDate,
              endDate: posting.endDate,
              departmentColor: posting.departmentColor || dept.color,
              rawEntry: entry
            });
          }
          deptSurgeonMap.set(dept.id, list);
        }
      }
    }

    // Now build grouped list with search filtering
    const groups: IDepartmentAccordionGroup[] = [];

    for (const dept of allDepartments) {
      const surgeons = (deptSurgeonMap.get(dept.id) || []).sort((a, b) =>
        a.rosterRecordName.localeCompare(b.rosterRecordName)
      );

      const isDeptMatch =
        !q ||
        dept.name.toLowerCase().includes(q) ||
        dept.abbreviation.toLowerCase().includes(q);

      const matchingSurgeons = surgeons.filter(
        (s) =>
          s.rosterRecordName.toLowerCase().includes(q) ||
          s.directBatchCodes.some((b) => b.toLowerCase().includes(q))
      );

      // Include department if department name matches OR any house surgeon inside it matches
      if (!q || isDeptMatch || matchingSurgeons.length > 0) {
        groups.push({
          department: dept,
          surgeons,
          matchingSurgeons: isDeptMatch ? surgeons : matchingSurgeons,
          isDeptMatch
        });
      }
    }

    return groups;
  }, [allDepartments, rawEntries, debouncedSearchQuery]);

  // Auto-expand departments when user types a search query
  useEffect(() => {
    if (debouncedSearchQuery.trim()) {
      const matchingIds = new Set(departmentGroups.map((g) => g.department.id));
      setExpandedDeptIds(matchingIds);
    }
  }, [debouncedSearchQuery, departmentGroups]);

  // Accordion toggle handlers
  const toggleDepartment = (deptId: string) => {
    setExpandedDeptIds((prev) => {
      const next = new Set(prev);
      if (next.has(deptId)) {
        next.delete(deptId);
      } else {
        next.add(deptId);
      }
      return next;
    });
  };

  const handleExpandAll = () => {
    const allIds = new Set(departmentGroups.map((g) => g.department.id));
    setExpandedDeptIds(allIds);
  };

  const handleCollapseAll = () => {
    setExpandedDeptIds(new Set());
  };

  const handleOpenSurgeon = (entry: IDirectoryEntry) => {
    setViewingColleague(entry);
    const postings = resolveColleaguePostings(entry.rosterRecordId, selectedDate);
    setColleaguePostings(postings);
  };

  const handleMakeDefault = async (rosterRecordId: string) => {
    setSettingDefault(true);
    try {
      await setDefaultSchedule(rosterRecordId);
      await refreshMembership();
      toast.success('Successfully updated your default schedule profile!');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update default profile');
    } finally {
      setSettingDefault(false);
    }
  };

  // Total metrics
  const totalAssignedSurgeons = useMemo(() => {
    const set = new Set<string>();
    for (const g of departmentGroups) {
      for (const s of g.surgeons) {
        set.add(s.rosterRecordId);
      }
    }
    return set.size;
  }, [departmentGroups]);

  const isAllExpanded =
    departmentGroups.length > 0 &&
    departmentGroups.every((g) => expandedDeptIds.has(g.department.id));

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-24 md:pb-12">
      <OfflineBanner />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-blue-600/20 text-blue-400 rounded-xl border border-blue-500/30">
              <Building2 className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Department Directory
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                Browse clinical departments in accordion format and check house surgeons assigned on any date.
              </p>
            </div>
          </div>
        </div>

        {/* Two Filter Inputs: Date & Search */}
        <div className="bg-slate-900 rounded-3xl border border-slate-800 p-4 sm:p-5 shadow-xl space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
            {/* Input 1: Posting Date */}
            <div className="sm:col-span-5 bg-slate-950 border border-slate-800 rounded-2xl px-3.5 py-2.5 flex items-center space-x-3 focus-within:border-blue-500/60 transition-colors">
              <Calendar className="w-4 h-4 text-blue-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-[10px] uppercase font-bold text-slate-500 block leading-tight">
                  Rotation Date
                </span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full text-xs sm:text-sm bg-transparent text-slate-100 font-semibold outline-none cursor-pointer"
                />
              </div>
              {selectedDate !== todayStr && (
                <button
                  onClick={() => setSelectedDate(todayStr)}
                  className="px-2 py-1 text-[11px] font-bold bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 rounded-lg shrink-0 flex items-center space-x-1 transition-colors"
                  title="Reset to today"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Today</span>
                </button>
              )}
            </div>

            {/* Input 2: Search (Department Name & House Surgeon Name) */}
            <div className="sm:col-span-7 bg-slate-950 border border-slate-800 rounded-2xl px-3.5 py-2.5 flex items-center space-x-3 focus-within:border-blue-500/60 transition-colors">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-[10px] uppercase font-bold text-slate-500 block leading-tight">
                  Search
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by department name (MED, Surg) or house surgeon..."
                  className="w-full text-xs sm:text-sm bg-transparent outline-none text-white placeholder-slate-500 font-medium"
                />
              </div>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
                  title="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Quick Metrics & Accordion Controls */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80 text-xs">
            <div className="flex items-center space-x-2 text-slate-400">
              <span className="font-semibold text-slate-300">
                {departmentGroups.length} {departmentGroups.length === 1 ? 'Department' : 'Departments'}
              </span>
              <span>•</span>
              <span className="text-slate-400">
                <strong className="text-white font-bold">{totalAssignedSurgeons}</strong> House Surgeons on{' '}
                <strong className="text-blue-400 font-medium">{formatDisplayDate(selectedDate)}</strong>
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={isAllExpanded ? handleCollapseAll : handleExpandAll}
                className="px-3 py-1.5 bg-slate-800/90 hover:bg-slate-700/90 text-slate-200 text-xs font-bold rounded-xl border border-slate-700/70 transition-colors flex items-center space-x-1.5 shadow-xs"
              >
                <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400" />
                <span>{isAllExpanded ? 'Collapse All' : 'Expand All'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Accordion Department List */}
        <div>
          {loading ? (
            <div className="p-12 text-center text-slate-500 text-xs sm:text-sm space-y-2">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p>Loading department directory...</p>
            </div>
          ) : departmentGroups.length === 0 ? (
            <div className="p-12 bg-slate-900/40 rounded-3xl border border-slate-800 text-center text-slate-500 space-y-2">
              <Building2 className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="font-bold text-slate-300 text-sm sm:text-base">No departments or house surgeons found</p>
              <p className="text-xs text-slate-500">
                No matching clinical departments or house surgeons for &ldquo;{searchQuery}&rdquo;.
              </p>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="mt-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl transition-colors inline-block"
                >
                  Clear Search
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {departmentGroups.map((group) => {
                const { department, surgeons, matchingSurgeons } = group;
                const isExpanded = expandedDeptIds.has(department.id);
                const displaySurgeons = searchQuery.trim() ? matchingSurgeons : surgeons;
                const count = surgeons.length;

                return (
                  <div
                    key={department.id}
                    className={`bg-slate-900 rounded-3xl border transition-all duration-200 overflow-hidden shadow-md ${isExpanded
                      ? 'border-slate-700 ring-1 ring-slate-700/50'
                      : 'border-slate-800/80 hover:border-slate-700'
                      }`}
                  >
                    {/* Accordion Header (Click to toggle) */}
                    <button
                      type="button"
                      onClick={() => toggleDepartment(department.id)}
                      className="w-full text-left px-5 py-4 flex items-center justify-between gap-3 focus:outline-none transition-colors group"
                      aria-expanded={isExpanded}
                    >
                      <div className="flex items-center space-x-3.5 min-w-0">
                        {/* Department Color Accent Pill */}
                        <span
                          className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs ring-2 ring-white/10"
                          style={{ backgroundColor: department.color || '#3B82F6' }}
                        />

                        {/* Department Name & Code */}
                        <div className="min-w-0">
                          <div className="flex items-center space-x-2 flex-wrap">
                            <h2 className="font-bold text-sm sm:text-base text-white group-hover:text-blue-400 transition-colors truncate">
                              {department.name}
                            </h2>
                            <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700/80">
                              {department.abbreviation}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right Side: Surgeon Count Badge & Chevron */}
                      <div className="flex items-center space-x-2.5 shrink-0">
                        {count > 0 ? (
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/15 text-blue-300 border border-blue-500/30 flex items-center space-x-1.5">
                            <Users className="w-3.5 h-3.5" />
                            <span>
                              {count} <span className="hidden sm:inline">{count === 1 ? 'House Surgeon' : 'House Surgeons'}</span>
                            </span>
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-800/60 text-slate-500 border border-slate-800">
                            0 <span className="hidden sm:inline">Assigned</span>
                          </span>
                        )}

                        <div className="p-1 rounded-lg text-slate-400 group-hover:text-white transition-colors">
                          <ChevronDown
                            className={`w-5 h-5 transition-transform duration-200 ${isExpanded ? 'rotate-180 text-white' : ''
                              }`}
                          />
                        </div>
                      </div>
                    </button>

                    {/* Accordion Content (House Surgeons List) */}
                    {isExpanded && (
                      <div className="px-5 pb-5 pt-1 border-t border-slate-800/70">
                        {displaySurgeons.length === 0 ? (
                          <div className="py-6 text-center text-slate-500 text-xs sm:text-sm bg-slate-950/40 rounded-2xl border border-slate-800/60 space-y-1">
                            <Stethoscope className="w-6 h-6 text-slate-600 mx-auto mb-1" />
                            <p className="font-semibold text-slate-400">
                              No house surgeons assigned
                            </p>
                            <p className="text-slate-500 text-xs">
                              There are no house surgeons posted in {department.name} on{' '}
                              {formatDisplayDate(selectedDate)}.
                            </p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-3">
                            {displaySurgeons.map((surgeon) => (
                              <div
                                key={surgeon.rosterRecordId}
                                onClick={() => handleOpenSurgeon(surgeon.rawEntry)}
                                className="p-4 bg-slate-950/80 hover:bg-slate-950 rounded-2xl border border-slate-800/90 hover:border-blue-500/50 transition-all cursor-pointer shadow-xs hover:shadow-md space-y-2.5 group/card"
                              >
                                <div className="flex items-center space-x-3 min-w-0">
                                  <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-blue-300 shrink-0 shadow-xs">
                                    {surgeon.rosterRecordName
                                      .split(' ')
                                      .map((n) => n[0])
                                      .filter(Boolean)
                                      .slice(0, 2)
                                      .join('')}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <h3 className="font-bold text-sm text-white group-hover/card:text-blue-400 transition-colors truncate">
                                      {surgeon.rosterRecordName}
                                    </h3>
                                  </div>
                                </div>

                                <div className="pt-2.5 border-t border-slate-800/80 space-y-1.5 text-xs">
                                  {/* Line 1: Batches as plain text */}
                                  <div className="text-slate-400 truncate">
                                    <span className="text-slate-500 font-medium">Batches: </span>
                                    <span className="text-slate-200 font-semibold">
                                      {surgeon.directBatchCodes.length > 0
                                        ? surgeon.directBatchCodes.join(', ')
                                        : 'None'}
                                    </span>
                                  </div>

                                  {/* Line 2: Rotation Info */}
                                  <div className="flex items-center space-x-1.5 text-slate-400 truncate">
                                    <Layers className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                    <span className="text-slate-500 font-medium">Rotation: </span>
                                    <span className="text-slate-200 font-semibold truncate">
                                      {surgeon.trackName || 'Standard Rotation'}
                                    </span>
                                  </div>
                                  {surgeon.startDate && surgeon.endDate && (
                                    <div className="flex items-center space-x-1.5 text-slate-400">
                                      <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                      <span className="text-slate-500 font-medium">Dates: </span>
                                      <span className="text-slate-200 font-mono text-[11px]">
                                        {formatDisplayDate(surgeon.startDate).split(',')[0]} -{' '}
                                        {formatDisplayDate(surgeon.endDate).split(',')[0]}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* House Surgeon Profile & Schedule Details Modal */}
        {viewingColleague && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
              <div className="flex justify-between items-start pb-2 border-b border-slate-800">
                <div>
                  <h3 className="text-lg font-bold text-white">{viewingColleague.rosterRecordName}</h3>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {viewingColleague.directBatchCodes.map((c: string) => (
                      <span
                        key={c}
                        className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300"
                      >
                        Batch {c}
                      </span>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => setViewingColleague(null)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  Active Postings on {formatDisplayDate(selectedDate)}:
                </span>
                {colleaguePostings.length === 0 ? (
                  <p className="text-xs text-slate-500 italic py-2">
                    No active postings found for this doctor on {formatDisplayDate(selectedDate)}.
                  </p>
                ) : (
                  colleaguePostings.map((p, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-2.5">
                        <span
                          className="w-3.5 h-3.5 rounded-full shrink-0"
                          style={{ backgroundColor: p.departmentColor }}
                        />
                        <span className="font-bold text-xs sm:text-sm text-white">
                          {p.departmentName}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          ({p.departmentAbbreviation})
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono">{p.trackName}</span>
                    </div>
                  ))
                )}
              </div>

              {/* Action to make this profile default */}
              <div className="pt-3 border-t border-slate-800 space-y-2">
                <button
                  onClick={() => handleMakeDefault(viewingColleague.rosterRecordId)}
                  disabled={settingDefault}
                  className="w-full flex items-center justify-center py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition-colors disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5 mr-2" />
                  <span>{settingDefault ? 'Updating...' : 'Make this my default schedule profile'}</span>
                </button>
                <p className="text-[10px] text-slate-500 text-center">
                  Browsing another doctor&apos;s schedule does not change your rotation reminders unless set above.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

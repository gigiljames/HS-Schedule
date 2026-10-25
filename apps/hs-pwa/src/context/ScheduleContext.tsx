import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import {
  IOfflineScheduleSnapshot,
  IPersonalSchedule,
  resolvePostingsForDate,
  resolveAgenda,
  getTodayInKolkata,
  compareDates
} from '@hs/shared';
import { apiClient } from '../api/client';
import { useAuth } from './AuthContext';
import { getScheduleSnapshot, saveScheduleSnapshot } from '../services/db';
import { toast } from 'react-hot-toast';

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error';

interface ScheduleContextType {
  isOffline: boolean;
  lastSyncedAt: string | null;
  personalSchedule: IPersonalSchedule | null;
  snapshot: IOfflineScheduleSnapshot | null;
  isLoading: boolean;
  syncStatus: SyncStatus;
  syncSchedule: (manual?: boolean) => Promise<void>;
  resolveColleaguePostings: (rosterRecordId: string, date: string) => any[];
}

const ScheduleContext = createContext<ScheduleContextType | undefined>(undefined);

const BACKOFF_DELAYS = [5000, 15000, 45000, 120000]; // 5s, 15s, 45s, 2m max

export const ScheduleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { membership, institution, isAuthenticated, connectivity, sessionStatus } = useAuth();

  const [snapshot, setSnapshot] = useState<IOfflineScheduleSnapshot | null>(null);
  const [personalSchedule, setPersonalSchedule] = useState<IPersonalSchedule | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');

  const isOffline = connectivity === 'offline';
  const isSyncingRef = useRef(false);
  const retryCountRef = useRef(0);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Pure schedule calculation from snapshot
  const computeScheduleFromSnapshot = useCallback(
    (snap: IOfflineScheduleSnapshot, defaultRecordId?: string): IPersonalSchedule | null => {
      if (!defaultRecordId) return null;
      const rosterRecord = snap.rosterRecords.find((r) => r.id === defaultRecordId);
      if (!rosterRecord) return null;

      const batchMap = new Map(snap.batches.map((b) => [b.id, b]));
      const departmentMap = new Map(snap.departments.map((d) => [d.id, d]));

      const allPeriods = snap.tracks.flatMap((t) => t.periods);
      const allAssignments = snap.tracks.flatMap((t) => t.assignments);

      const resolverInput = {
        rosterBatchNodeIds: rosterRecord.batchNodeIds,
        batchMap,
        tracks: snap.tracks.map((t) => ({
          id: t.id,
          scheduleVersionId: snap.scheduleVersionId,
          name: t.name,
          order: t.order,
          inheritParentAssignments: t.inheritParentAssignments,
          createdAt: '',
          updatedAt: ''
        })),
        periods: allPeriods,
        assignments: allAssignments,
        departmentMap
      };

      const today = getTodayInKolkata();
      const currentPostings = resolvePostingsForDate(resolverInput, today);
      const agenda = resolveAgenda(resolverInput, today);
      const nextUpcomingPosting = agenda.find((p) => compareDates(p.startDate, today) > 0);

      return {
        rosterRecordId: rosterRecord.id,
        rosterRecordName: rosterRecord.name,
        institutionName: snap.institutionName,
        scheduleVersionNumber: parseInt(snap.version.replace('v', ''), 10) || 1,
        currentPostings,
        nextUpcomingPosting,
        agenda,
        lastSyncedAt: snap.syncedAt
      };
    },
    []
  );

  // Load from IndexedDB
  const loadLocalSnapshot = useCallback(async (): Promise<IOfflineScheduleSnapshot | null> => {
    try {
      const saved = await getScheduleSnapshot();
      if (saved && saved.snapshot) {
        setSnapshot(saved.snapshot);
        setLastSyncedAt(saved.syncedAt);
        const computed = computeScheduleFromSnapshot(
          saved.snapshot,
          membership?.defaultScheduleRecordId
        );
        if (computed) setPersonalSchedule(computed);
        return saved.snapshot;
      }
    } catch (err) {
      console.warn('[Schedule] Error loading snapshot from IndexedDB:', err);
    }
    return null;
  }, [computeScheduleFromSnapshot, membership?.defaultScheduleRecordId]);

  // Main synchronization function with concurrency guard and backoff
  const syncSchedule = useCallback(
    async (manual: boolean = false) => {
      // Concurrency guard: avoid duplicate concurrent sync requests
      if (isSyncingRef.current) return;
      if (!institution) return;

      isSyncingRef.current = true;
      setIsLoading(true);
      setSyncStatus('syncing');

      // If offline, fall back to IndexedDB
      if (!navigator.onLine || connectivity === 'offline') {
        await loadLocalSnapshot();
        setIsLoading(false);
        setSyncStatus('idle');
        isSyncingRef.current = false;
        if (manual) {
          toast.error('Device is offline. Showing cached hospital schedule.');
        }
        return;
      }

      // Can only fetch from API if we have an active or unverified session that can validate
      try {
        const { data } = await apiClient.get('/hs/snapshot');
        if (data && data.data) {
          const freshSnapshot: IOfflineScheduleSnapshot = data.data;

          // Snapshot validation: ensure it belongs to the current institution
          if (institution.id && freshSnapshot.institutionId && freshSnapshot.institutionId !== institution.id) {
            console.warn('[Schedule] Snapshot institution mismatch. Discarding.');
            isSyncingRef.current = false;
            setIsLoading(false);
            setSyncStatus('error');
            return;
          }

          // Atomically update state and IndexedDB
          setSnapshot(freshSnapshot);
          setLastSyncedAt(freshSnapshot.syncedAt);
          await saveScheduleSnapshot(freshSnapshot);

          const computed = computeScheduleFromSnapshot(
            freshSnapshot,
            membership?.defaultScheduleRecordId
          );
          if (computed) setPersonalSchedule(computed);

          setSyncStatus('synced');
          retryCountRef.current = 0; // Reset backoff retry counter

          if (manual) {
            toast.success('Schedule synchronized successfully!');
          }
        }
      } catch (err: any) {
        // When synchronization fails, DO NOT destroy existing cached snapshot!
        console.warn('[Schedule] Sync failed. Retaining last valid snapshot:', err);
        setSyncStatus('error');
        await loadLocalSnapshot();

        if (manual) {
          toast.error(
            err.response?.data?.message || 'Unable to sync with server. Showing cached schedule.'
          );
        } else {
          // Bounded retry with exponential backoff for automatic background syncs
          const delayIndex = Math.min(retryCountRef.current, BACKOFF_DELAYS.length - 1);
          const delay = BACKOFF_DELAYS[delayIndex];
          retryCountRef.current += 1;

          if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
          retryTimeoutRef.current = setTimeout(() => {
            if (navigator.onLine && document.visibilityState === 'visible') {
              syncSchedule(false);
            }
          }, delay);
        }
      } finally {
        setIsLoading(false);
        isSyncingRef.current = false;
      }
    },
    [institution, connectivity, loadLocalSnapshot, computeScheduleFromSnapshot, membership?.defaultScheduleRecordId]
  );

  // Startup: Load local snapshot immediately from IndexedDB
  useEffect(() => {
    loadLocalSnapshot();
  }, [loadLocalSnapshot]);

  // Synchronize when authenticated or default schedule changes
  useEffect(() => {
    if ((sessionStatus === 'authenticated' || sessionStatus === 'offline_unverified') && institution) {
      syncSchedule(false);
    }
  }, [sessionStatus, institution?.id, membership?.defaultScheduleRecordId]);

  // Re-sync on network return and when app returns to foreground
  useEffect(() => {
    const handleOnline = () => {
      syncSchedule(false);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && navigator.onLine) {
        syncSchedule(false);
      }
    };

    window.addEventListener('online', handleOnline);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('online', handleOnline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
    };
  }, [syncSchedule]);

  // Resolves colleague postings offline or online from active snapshot
  const resolveColleaguePostings = useCallback(
    (rosterRecordId: string, date: string): any[] => {
      if (!snapshot) return [];
      const rosterRecord = snapshot.rosterRecords.find((r) => r.id === rosterRecordId);
      if (!rosterRecord) return [];

      const batchMap = new Map(snapshot.batches.map((b) => [b.id, b]));
      const departmentMap = new Map(snapshot.departments.map((d) => [d.id, d]));

      const allPeriods = snapshot.tracks.flatMap((t) => t.periods);
      const allAssignments = snapshot.tracks.flatMap((t) => t.assignments);

      return resolvePostingsForDate(
        {
          rosterBatchNodeIds: rosterRecord.batchNodeIds,
          batchMap,
          tracks: snapshot.tracks.map((t) => ({
            id: t.id,
            scheduleVersionId: snapshot.scheduleVersionId,
            name: t.name,
            order: t.order,
            inheritParentAssignments: t.inheritParentAssignments,
            createdAt: '',
            updatedAt: ''
          })),
          periods: allPeriods,
          assignments: allAssignments,
          departmentMap
        },
        date
      );
    },
    [snapshot]
  );

  return (
    <ScheduleContext.Provider
      value={{
        isOffline,
        lastSyncedAt,
        personalSchedule,
        snapshot,
        isLoading,
        syncStatus,
        syncSchedule,
        resolveColleaguePostings
      }}
    >
      {children}
    </ScheduleContext.Provider>
  );
};

export const useSchedule = () => {
  const context = useContext(ScheduleContext);
  if (!context) throw new Error('useSchedule must be used within a ScheduleProvider');
  return context;
};

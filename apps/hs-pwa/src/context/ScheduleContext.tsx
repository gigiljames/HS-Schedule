import React, { createContext, useContext, useState, useEffect } from 'react';
import { IOfflineScheduleSnapshot, IPersonalSchedule, resolvePostingsForDate, resolveAgenda, getTodayInKolkata, compareDates } from '@hs/shared';
import { apiClient } from '../api/client';
import { useAuth } from './AuthContext';

interface ScheduleContextType {
  isOffline: boolean;
  lastSyncedAt: string | null;
  personalSchedule: IPersonalSchedule | null;
  snapshot: IOfflineScheduleSnapshot | null;
  isLoading: boolean;
  syncSchedule: () => Promise<void>;
  resolveColleaguePostings: (rosterRecordId: string, date: string) => any[];
}

const ScheduleContext = createContext<ScheduleContextType | undefined>(undefined);

const CACHE_NAME = 'hs-schedule-snapshot-v1';
const SNAPSHOT_KEY = '/offline-snapshot.json';

export const ScheduleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { membership, institution, isAuthenticated } = useAuth();

  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [snapshot, setSnapshot] = useState<IOfflineScheduleSnapshot | null>(null);
  const [personalSchedule, setPersonalSchedule] = useState<IPersonalSchedule | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Monitor network status
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      syncSchedule();
    };
    const handleOffline = () => {
      setIsOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('app:offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('app:offline', handleOffline);
    };
  }, []);

  // Load cached snapshot from Cache API
  const loadCachedSnapshot = async (): Promise<IOfflineScheduleSnapshot | null> => {
    try {
      if ('caches' in window) {
        const cache = await caches.open(CACHE_NAME);
        const response = await cache.match(SNAPSHOT_KEY);
        if (response) {
          const data = await response.json();
          return data;
        }
      }
    } catch (e) {
      console.warn('Failed to read from Cache API:', e);
    }
    return null;
  };

  // Save snapshot to Cache API
  const saveSnapshotToCache = async (data: IOfflineScheduleSnapshot) => {
    try {
      if ('caches' in window) {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(
          SNAPSHOT_KEY,
          new Response(JSON.stringify(data), {
            headers: { 'Content-Type': 'application/json' }
          })
        );
      }
    } catch (e) {
      console.warn('Failed to save to Cache API:', e);
    }
  };

  // Calculate personal schedule from snapshot using pure resolver
  const computeScheduleFromSnapshot = (
    snap: IOfflineScheduleSnapshot,
    defaultRecordId?: string
  ): IPersonalSchedule | null => {
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
  };

  // Synchronize with API or fall back to Cache API
  const syncSchedule = async () => {
    if (!isAuthenticated || !institution) return;
    setIsLoading(true);

    if (!navigator.onLine) {
      // Offline fallback
      setIsOffline(true);
      const cached = await loadCachedSnapshot();
      if (cached) {
        setSnapshot(cached);
        setLastSyncedAt(cached.syncedAt);
        const computed = computeScheduleFromSnapshot(cached, membership?.defaultScheduleRecordId);
        if (computed) setPersonalSchedule(computed);
      }
      setIsLoading(false);
      return;
    }

    try {
      // Fetch fresh published snapshot
      const { data } = await apiClient.get('/hs/snapshot');
      if (data.data) {
        const freshSnapshot: IOfflineScheduleSnapshot = data.data;
        setSnapshot(freshSnapshot);
        setLastSyncedAt(freshSnapshot.syncedAt);
        await saveSnapshotToCache(freshSnapshot);

        const computed = computeScheduleFromSnapshot(
          freshSnapshot,
          membership?.defaultScheduleRecordId
        );
        if (computed) setPersonalSchedule(computed);
      }
    } catch {
      // If network fails, fall back to cached snapshot
      const cached = await loadCachedSnapshot();
      if (cached) {
        setSnapshot(cached);
        setLastSyncedAt(cached.syncedAt);
        const computed = computeScheduleFromSnapshot(cached, membership?.defaultScheduleRecordId);
        if (computed) setPersonalSchedule(computed);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && institution) {
      syncSchedule();
    }
  }, [isAuthenticated, institution?.id, membership?.defaultScheduleRecordId]);

  // Resolves colleague postings offline or online from active snapshot
  const resolveColleaguePostings = (rosterRecordId: string, date: string): any[] => {
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
  };

  return (
    <ScheduleContext.Provider
      value={{
        isOffline,
        lastSyncedAt,
        personalSchedule,
        snapshot,
        isLoading,
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

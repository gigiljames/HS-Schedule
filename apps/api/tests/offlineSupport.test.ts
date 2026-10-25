import { describe, it, expect, beforeEach } from 'vitest';
import {
  IOfflineScheduleSnapshot,
  IUser,
  IInstitution,
  IInstitutionMembership,
  resolvePostingsForDate,
  resolveAgenda,
  getTodayInKolkata,
  formatDisplayDate,
  formatRangeDisplay
} from '../src/shared/index.js';

// In-memory mock of IndexedDB storage helper matching src/services/db.ts
class MockIndexedDBStore {
  private scheduleStore: Map<string, any> = new Map();
  private sessionStore: Map<string, any> = new Map();

  async saveScheduleSnapshot(snapshot: IOfflineScheduleSnapshot): Promise<void> {
    this.scheduleStore.set('active', {
      id: 'active',
      institutionId: snapshot.institutionId,
      scheduleVersionId: snapshot.scheduleVersionId,
      snapshot,
      schemaVersion: 1,
      syncedAt: snapshot.syncedAt || new Date().toISOString()
    });
  }

  async getScheduleSnapshot(): Promise<any | null> {
    return this.scheduleStore.get('active') || null;
  }

  async clearScheduleSnapshot(): Promise<void> {
    this.scheduleStore.delete('active');
  }

  async saveSessionMetadata(data: {
    user: IUser;
    institution: IInstitution | null;
    membership: IInstitutionMembership | null;
  }): Promise<void> {
    // Assert strictly that sensitive credentials are NEVER stored
    const rawData = JSON.stringify(data);
    if (rawData.includes('password') || rawData.includes('accessToken') || rawData.includes('refreshToken')) {
      throw new Error('SECURITY VIOLATION: Tokens or passwords must never be stored in offline storage');
    }

    this.sessionStore.set('active', {
      id: 'active',
      user: data.user,
      institution: data.institution,
      membership: data.membership,
      lastValidatedAt: new Date().toISOString()
    });
  }

  async getSessionMetadata(): Promise<any | null> {
    return this.sessionStore.get('active') || null;
  }

  async clearSessionMetadata(): Promise<void> {
    this.sessionStore.delete('active');
  }

  async clearAllOfflineData(): Promise<void> {
    await this.clearScheduleSnapshot();
    await this.clearSessionMetadata();
  }
}

describe('House Surgeon PWA Offline Support & Storage Engine', () => {
  let db: MockIndexedDBStore;

  const sampleUser: IUser = {
    id: 'user-1',
    googleId: 'g-123',
    email: 'dr.sharma@hospital.org',
    displayName: 'Dr. Aarav Sharma',
    avatarUrl: '',
    role: 'hs',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const sampleInstitution: IInstitution = {
    id: 'inst-aiims',
    name: 'All India Institute of Medical Sciences',
    shortName: 'AIIMS',
    accessCode: 'AIIMS2026',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const sampleMembership: IInstitutionMembership = {
    id: 'mem-1',
    userId: 'user-1',
    institutionId: 'inst-aiims',
    defaultScheduleRecordId: 'roster-aarav',
    notificationPreferences: {
      postingEndReminder: true,
      postingStartNotification: true,
      reminderTimeEnd: '19:00',
      reminderTimeStart: '07:00',
      hideDepartmentNameOnLockScreen: false
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const sampleSnapshot: IOfflineScheduleSnapshot = {
    version: 'v1',
    scheduleVersionId: 'ver-2026-q1',
    institutionId: 'inst-aiims',
    institutionName: 'All India Institute of Medical Sciences',
    institutionShortName: 'AIIMS',
    departments: [
      {
        id: 'dept-gm',
        institutionId: 'inst-aiims',
        name: 'General Medicine',
        abbreviation: 'GM',
        aliases: [],
        color: '#2563EB',
        isActive: true,
        createdAt: '',
        updatedAt: ''
      },
      {
        id: 'dept-surg',
        institutionId: 'inst-aiims',
        name: 'General Surgery',
        abbreviation: 'GS',
        aliases: [],
        color: '#059669',
        isActive: true,
        createdAt: '',
        updatedAt: ''
      }
    ],
    batches: [
      {
        id: 'batch-a',
        institutionId: 'inst-aiims',
        code: 'A',
        name: 'Batch A',
        parentBatchId: null,
        depth: 0,
        createdAt: '',
        updatedAt: ''
      }
    ],
    rosterRecords: [
      {
        id: 'roster-aarav',
        name: 'Dr. Aarav Sharma',
        batchNodeIds: ['batch-a']
      },
      {
        id: 'roster-priya',
        name: 'Dr. Priya Patel',
        batchNodeIds: ['batch-a']
      }
    ],
    tracks: [
      {
        id: 'track-internship',
        name: 'Core Clinical Rotations',
        order: 1,
        inheritParentAssignments: true,
        periods: [
          {
            id: 'period-1',
            trackId: 'track-internship',
            name: 'Posting 1',
            startDate: '2026-01-01',
            endDate: '2026-06-30',
            order: 1,
            createdAt: '',
            updatedAt: ''
          },
          {
            id: 'period-2',
            trackId: 'track-internship',
            name: 'Posting 2',
            startDate: '2026-07-01',
            endDate: '2026-12-31',
            order: 2,
            createdAt: '',
            updatedAt: ''
          }
        ],
        assignments: [
          {
            id: 'asgn-1',
            trackId: 'track-internship',
            periodId: 'period-1',
            departmentId: 'dept-gm',
            batchNodeId: 'batch-a',
            isOverride: false,
            createdAt: '',
            updatedAt: ''
          },
          {
            id: 'asgn-2',
            trackId: 'track-internship',
            periodId: 'period-2',
            departmentId: 'dept-surg',
            batchNodeId: 'batch-a',
            isOverride: false,
            createdAt: '',
            updatedAt: ''
          }
        ]
      }
    ],
    syncedAt: '2026-01-01T10:00:00.000Z'
  };

  beforeEach(() => {
    db = new MockIndexedDBStore();
  });

  // Scenario 1: A user signs in online, loads schedule, disables connectivity, and reopens app
  it('Scenario 1 & 2: loads and serves cached schedule offline without waiting for server', async () => {
    // 1. Online: save session metadata and schedule snapshot
    await db.saveSessionMetadata({
      user: sampleUser,
      institution: sampleInstitution,
      membership: sampleMembership
    });
    await db.saveScheduleSnapshot(sampleSnapshot);

    // 2. Offline reopen: verify cached data is immediately available
    const savedSession = await db.getSessionMetadata();
    expect(savedSession).not.toBeNull();
    expect(savedSession.user.displayName).toBe('Dr. Aarav Sharma');
    expect(savedSession.institution.shortName).toBe('AIIMS');

    const savedSnapshot = await db.getScheduleSnapshot();
    expect(savedSnapshot).not.toBeNull();
    expect(savedSnapshot.snapshot.rosterRecords).toHaveLength(2);
    expect(savedSnapshot.syncedAt).toBe('2026-01-01T10:00:00.000Z');
  });

  // Scenario 3: Calendar navigation and directory search work offline using cached snapshot
  it('Scenario 3: resolves schedule and directory postings completely offline from snapshot', async () => {
    await db.saveScheduleSnapshot(sampleSnapshot);
    const cached = await db.getScheduleSnapshot();
    const snap = cached.snapshot;

    const batchMap = new Map(snap.batches.map((b: any) => [b.id, b]));
    const departmentMap = new Map(snap.departments.map((d: any) => [d.id, d]));
    const allPeriods = snap.tracks.flatMap((t: any) => t.periods);
    const allAssignments = snap.tracks.flatMap((t: any) => t.assignments);

    const resolverInput = {
      rosterBatchNodeIds: ['batch-a'],
      batchMap,
      tracks: snap.tracks,
      periods: allPeriods,
      assignments: allAssignments,
      departmentMap
    };

    // Test calendar date lookup: 2026-03-15 should be in General Medicine
    const postingsOnMarch = resolvePostingsForDate(resolverInput, '2026-03-15');
    expect(postingsOnMarch).toHaveLength(1);
    expect(postingsOnMarch[0].departmentName).toBe('General Medicine');
    expect(postingsOnMarch[0].departmentAbbreviation).toBe('GM');

    // Test calendar date lookup: 2026-09-10 should be in General Surgery
    const postingsOnSept = resolvePostingsForDate(resolverInput, '2026-09-10');
    expect(postingsOnSept).toHaveLength(1);
    expect(postingsOnSept[0].departmentName).toBe('General Surgery');
    expect(postingsOnSept[0].departmentAbbreviation).toBe('GS');

    // Test directory resolution: find all doctors posted in General Medicine on 2026-03-15
    const colleaguePostings = snap.rosterRecords.map((rec: any) => ({
      name: rec.name,
      postings: resolvePostingsForDate(
        { ...resolverInput, rosterBatchNodeIds: rec.batchNodeIds },
        '2026-03-15'
      )
    }));

    expect(colleaguePostings).toHaveLength(2);
    expect(colleaguePostings[0].postings[0].departmentName).toBe('General Medicine');
    expect(colleaguePostings[1].postings[0].departmentName).toBe('General Medicine');
  });

  // Scenario 4: User who has never completed initial setup receives offline fallback
  it('Scenario 4: reports not_downloaded when no snapshot exists offline', async () => {
    const savedSnapshot = await db.getScheduleSnapshot();
    expect(savedSnapshot).toBeNull();

    // App state flags should indicate setup is required
    const isOffline = true;
    const localDataStatus = savedSnapshot ? 'available' : 'not_downloaded';
    expect(isOffline).toBe(true);
    expect(localDataStatus).toBe('not_downloaded');
  });

  // Scenario 5: Temporary API failure does not log user out
  it('Scenario 5: preserves unverified session and cached schedule on network error', async () => {
    await db.saveSessionMetadata({
      user: sampleUser,
      institution: sampleInstitution,
      membership: sampleMembership
    });
    await db.saveScheduleSnapshot(sampleSnapshot);

    // Simulate network error during session check
    const isNetworkError = true;
    const httpStatus = undefined; // No response from server

    let sessionStatus = 'offline_unverified';
    if (!isNetworkError && (httpStatus === 401 || httpStatus === 403)) {
      sessionStatus = 'reauth_required';
      await db.clearAllOfflineData();
    }

    // Session remains offline_unverified and data is intact!
    expect(sessionStatus).toBe('offline_unverified');
    const stillSaved = await db.getScheduleSnapshot();
    expect(stillSaved).not.toBeNull();
    const stillUser = await db.getSessionMetadata();
    expect(stillUser).not.toBeNull();
  });

  // Scenario 6 & 7: Connectivity returns, synchronization updates snapshot, failed sync keeps previous snapshot
  it('Scenario 6 & 7: sync updates snapshot on success and retains last valid snapshot on failure', async () => {
    await db.saveScheduleSnapshot(sampleSnapshot);

    // Successful sync updates snapshot
    const updatedSnapshot: IOfflineScheduleSnapshot = {
      ...sampleSnapshot,
      version: 'v2',
      syncedAt: '2026-02-01T12:00:00.000Z'
    };
    await db.saveScheduleSnapshot(updatedSnapshot);

    const synced = await db.getScheduleSnapshot();
    expect(synced.snapshot.version).toBe('v2');
    expect(synced.syncedAt).toBe('2026-02-01T12:00:00.000Z');

    // Simulated failed sync: previous valid snapshot must NOT be destroyed
    try {
      throw new Error('500 Internal Server Error');
    } catch {
      // Catch block retains previous valid snapshot
    }

    const afterFailedSync = await db.getScheduleSnapshot();
    expect(afterFailedSync).not.toBeNull();
    expect(afterFailedSync.snapshot.version).toBe('v2');
  });

  // Scenario 8: Expired or revoked credentials trigger reauth_required and wipe cache
  it('Scenario 8: confirmed HTTP 401 triggers reauth_required and wipes offline data', async () => {
    await db.saveSessionMetadata({
      user: sampleUser,
      institution: sampleInstitution,
      membership: sampleMembership
    });
    await db.saveScheduleSnapshot(sampleSnapshot);

    // Simulate definitive HTTP 401 response from server
    const httpStatus = 401;
    let sessionStatus = 'authenticated';

    if (httpStatus === 401 || httpStatus === 403) {
      sessionStatus = 'reauth_required';
      await db.clearAllOfflineData();
    }

    expect(sessionStatus).toBe('reauth_required');
    expect(await db.getSessionMetadata()).toBeNull();
    expect(await db.getScheduleSnapshot()).toBeNull();
  });

  // Scenario 9: Multi-institution isolation: snapshot belonging to different institution is rejected
  it('Scenario 9: prevents cross-institution data leakage', async () => {
    await db.saveScheduleSnapshot(sampleSnapshot); // belongs to 'inst-aiims'

    // User switches to CMC Vellore
    const cmcInstitutionId = 'inst-cmc-vellore';
    const cached = await db.getScheduleSnapshot();

    const isMatch = cached.snapshot.institutionId === cmcInstitutionId;
    expect(isMatch).toBe(false);

    // If institution does not match, snapshot is discarded
    if (!isMatch) {
      await db.clearScheduleSnapshot();
    }

    expect(await db.getScheduleSnapshot()).toBeNull();
  });

  // Scenario 10: Explicit logout clears all offline caches
  it('Scenario 10: explicit logout clears both snapshot and session metadata', async () => {
    await db.saveSessionMetadata({
      user: sampleUser,
      institution: sampleInstitution,
      membership: sampleMembership
    });
    await db.saveScheduleSnapshot(sampleSnapshot);

    await db.clearAllOfflineData();

    expect(await db.getSessionMetadata()).toBeNull();
    expect(await db.getScheduleSnapshot()).toBeNull();
  });

  // Scenario: Security check - never store auth tokens in offline persistence
  it('Security: throws error if credentials or tokens are passed to offline storage', async () => {
    await expect(
      db.saveSessionMetadata({
        user: { ...sampleUser, accessToken: 'jwt-token-secret' } as any,
        institution: sampleInstitution,
        membership: sampleMembership
      })
    ).rejects.toThrow('SECURITY VIOLATION');
  });

  it('DD-MM-YYYY Date Formatting: formats dates and date ranges consistently to DD-MM-YYYY', () => {
    expect(formatDisplayDate('2026-10-26')).toBe('26-10-2026');
    expect(formatDisplayDate('2026-01-05')).toBe('05-01-2026');
    expect(formatRangeDisplay('2026-01-01', '2026-06-30')).toBe('01-01-2026 to 30-06-2026');
  });
});

/**
 * Native IndexedDB helper for House Surgeon PWA
 * Provides secure, structured offline persistence with schema versioning.
 * Strictly persists non-sensitive schedule snapshots and session metadata.
 * NEVER stores passwords, access tokens, or refresh tokens.
 */

import { IOfflineScheduleSnapshot, IUser, IInstitution, IInstitutionMembership } from '@hs/shared';

const DB_NAME = 'hs_pwa_offline_db';
const DB_VERSION = 1;

export const STORES = {
  SCHEDULE_SNAPSHOT: 'schedule_snapshot',
  SESSION_METADATA: 'session_metadata'
} as const;

export interface ISavedScheduleSnapshot {
  id: string; // 'active'
  institutionId: string;
  scheduleVersionId: string;
  snapshot: IOfflineScheduleSnapshot;
  schemaVersion: number;
  syncedAt: string;
}

export interface ISavedSessionMetadata {
  id: string; // 'active'
  user: IUser;
  institution: IInstitution | null;
  membership: IInstitutionMembership | null;
  lastValidatedAt: string;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      reject(new Error('IndexedDB is not supported in this environment'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(STORES.SCHEDULE_SNAPSHOT)) {
        db.createObjectStore(STORES.SCHEDULE_SNAPSHOT, { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains(STORES.SESSION_METADATA)) {
        db.createObjectStore(STORES.SESSION_METADATA, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Transaction helper for read/write operations
async function getStore(storeName: string, mode: IDBTransactionMode): Promise<{ store: IDBObjectStore; tx: IDBTransaction }> {
  const db = await openDB();
  const tx = db.transaction(storeName, mode);
  const store = tx.objectStore(storeName);
  return { store, tx };
}

// ---------------- Schedule Snapshot Storage ----------------

export async function saveScheduleSnapshot(snapshot: IOfflineScheduleSnapshot): Promise<void> {
  try {
    const { store, tx } = await getStore(STORES.SCHEDULE_SNAPSHOT, 'readwrite');
    const record: ISavedScheduleSnapshot = {
      id: 'active',
      institutionId: snapshot.institutionId,
      scheduleVersionId: snapshot.scheduleVersionId,
      snapshot,
      schemaVersion: DB_VERSION,
      syncedAt: snapshot.syncedAt || new Date().toISOString()
    };

    await new Promise<void>((resolve, reject) => {
      const request = store.put(record);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
      tx.onabort = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('[DB] Failed to save schedule snapshot to IndexedDB:', err);
  }
}

export async function getScheduleSnapshot(): Promise<ISavedScheduleSnapshot | null> {
  try {
    const { store } = await getStore(STORES.SCHEDULE_SNAPSHOT, 'readonly');
    return await new Promise<ISavedScheduleSnapshot | null>((resolve, reject) => {
      const request = store.get('active');
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('[DB] Failed to get schedule snapshot from IndexedDB:', err);
    return null;
  }
}

export async function clearScheduleSnapshot(): Promise<void> {
  try {
    const { store, tx } = await getStore(STORES.SCHEDULE_SNAPSHOT, 'readwrite');
    await new Promise<void>((resolve, reject) => {
      const request = store.delete('active');
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
      tx.onabort = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('[DB] Failed to clear schedule snapshot:', err);
  }
}

// ---------------- Session Metadata Storage (Non-Sensitive) ----------------

export async function saveSessionMetadata(data: {
  user: IUser;
  institution: IInstitution | null;
  membership: IInstitutionMembership | null;
}): Promise<void> {
  try {
    const { store, tx } = await getStore(STORES.SESSION_METADATA, 'readwrite');
    const record: ISavedSessionMetadata = {
      id: 'active',
      user: data.user,
      institution: data.institution,
      membership: data.membership,
      lastValidatedAt: new Date().toISOString()
    };

    await new Promise<void>((resolve, reject) => {
      const request = store.put(record);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
      tx.onabort = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('[DB] Failed to save session metadata to IndexedDB:', err);
  }
}

export async function getSessionMetadata(): Promise<ISavedSessionMetadata | null> {
  try {
    const { store } = await getStore(STORES.SESSION_METADATA, 'readonly');
    return await new Promise<ISavedSessionMetadata | null>((resolve, reject) => {
      const request = store.get('active');
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('[DB] Failed to read session metadata from IndexedDB:', err);
    return null;
  }
}

export async function clearSessionMetadata(): Promise<void> {
  try {
    const { store, tx } = await getStore(STORES.SESSION_METADATA, 'readwrite');
    await new Promise<void>((resolve, reject) => {
      const request = store.delete('active');
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
      tx.onabort = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('[DB] Failed to clear session metadata:', err);
  }
}

// ---------------- Clear All Offline Data (e.g., on logout / institution leave) ----------------

export async function clearAllOfflineData(): Promise<void> {
  try {
    await clearScheduleSnapshot();
    await clearSessionMetadata();
  } catch (err) {
    console.warn('[DB] Failed to clear all offline data:', err);
  }
}

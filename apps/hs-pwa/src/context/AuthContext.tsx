import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { IUser, IInstitution, IInstitutionMembership } from '@hs/shared';
import { apiClient, setAccessToken } from '../api/client';
import {
  getSessionMetadata,
  saveSessionMetadata,
  getScheduleSnapshot,
  clearAllOfflineData,
  clearScheduleSnapshot
} from '../services/db';

export type ConnectivityState = 'online' | 'offline' | 'unknown';
export type SessionState = 'checking' | 'authenticated' | 'offline_unverified' | 'reauth_required';
export type LocalDataState = 'loading' | 'available' | 'not_downloaded';

export interface AuthContextType {
  user: IUser | null;
  membership: IInstitutionMembership | null;
  institution: IInstitution | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  connectivity: ConnectivityState;
  sessionStatus: SessionState;
  localDataStatus: LocalDataState;
  loginWithGoogle: (idToken: string) => Promise<void>;
  joinInstitution: (accessCode: string) => Promise<void>;
  setDefaultSchedule: (rosterRecordId: string) => Promise<void>;
  leaveInstitution: () => Promise<void>;
  logout: () => Promise<void>;
  refreshMembership: () => Promise<void>;
  checkSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<IUser | null>(null);
  const [membership, setMembership] = useState<IInstitutionMembership | null>(null);
  const [institution, setInstitution] = useState<IInstitution | null>(null);

  const [connectivity, setConnectivity] = useState<ConnectivityState>(() =>
    typeof navigator !== 'undefined' ? (navigator.onLine ? 'online' : 'offline') : 'unknown'
  );
  const [sessionStatus, setSessionStatus] = useState<SessionState>('checking');
  const [localDataStatus, setLocalDataStatus] = useState<LocalDataState>('loading');
  const [isLoading, setIsLoading] = useState(true);

  // Sync session state to IndexedDB (non-sensitive metadata only)
  const persistSessionMetadata = async (
    u: IUser,
    inst: IInstitution | null,
    mem: IInstitutionMembership | null
  ) => {
    await saveSessionMetadata({ user: u, institution: inst, membership: mem });
  };

  const refreshMembership = async () => {
    try {
      const { data } = await apiClient.get('/institutions/my-membership');
      if (data.data) {
        setMembership(data.data.membership);
        setInstitution(data.data.institution);
        if (user) {
          await persistSessionMetadata(user, data.data.institution, data.data.membership);
        }
      } else {
        setMembership(null);
        setInstitution(null);
        if (user) {
          await persistSessionMetadata(user, null, null);
        }
      }
    } catch (err: any) {
      // If offline/network error, preserve existing state
      if (!err.response) {
        console.warn('[Auth] Cannot refresh membership while offline. Preserving local state.');
        return;
      }
      setMembership(null);
      setInstitution(null);
    }
  };

  // Online session validation in the background
  const validateOnlineSession = useCallback(async () => {
    if (!navigator.onLine) {
      setConnectivity('offline');
      setIsLoading(false);
      return;
    }

    try {
      const { data } = await apiClient.post('/auth/refresh');
      if (data.success && data.data?.accessToken) {
        setAccessToken(data.data.accessToken);
        setUser(data.data.user);
        setSessionStatus('authenticated');
        setConnectivity('online');

        // Fetch fresh membership
        try {
          const memRes = await apiClient.get('/institutions/my-membership');
          const newInst = memRes.data?.data?.institution || null;
          const newMem = memRes.data?.data?.membership || null;
          setMembership(newMem);
          setInstitution(newInst);
          await persistSessionMetadata(data.data.user, newInst, newMem);
        } catch {
          // preserve whatever we have
        }
      }
    } catch (err: any) {
      if (err.response && (err.response.status === 401 || err.response.status === 403)) {
        // Confirmed expired or revoked token
        console.warn('[Auth] Session revoked or expired by server.');
        setSessionStatus('reauth_required');
        setUser(null);
        setMembership(null);
        setInstitution(null);
        setAccessToken(null);
        await clearAllOfflineData();
      } else {
        // Network timeout, DNS failure, or offline: Keep existing local session unverified
        console.warn('[Auth] Network error during session validation. Remaining in offline mode.');
        setConnectivity('offline');
      }
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Initial startup flow: Local-first initialization
  useEffect(() => {
    let isMounted = true;

    const initLocalFirst = async () => {
      try {
        // 1. Read locally cached session metadata and schedule snapshot from IndexedDB
        const [savedSession, savedSnapshot] = await Promise.all([
          getSessionMetadata(),
          getScheduleSnapshot()
        ]);

        if (!isMounted) return;

        if (savedSnapshot && savedSnapshot.snapshot) {
          setLocalDataStatus('available');
        } else {
          setLocalDataStatus('not_downloaded');
        }

        if (savedSession && savedSession.user) {
          setUser(savedSession.user);
          setInstitution(savedSession.institution);
          setMembership(savedSession.membership);
          // Set unverified offline session immediately so UI can render cached data without waiting!
          setSessionStatus('offline_unverified');
          setIsLoading(false);
        } else {
          // No cached session
          if (!navigator.onLine) {
            setSessionStatus('reauth_required');
            setIsLoading(false);
          }
        }
      } catch (err) {
        console.warn('[Auth] Failed to initialize local-first state:', err);
      }

      // 2. In background, attempt online validation if connectivity permits
      if (navigator.onLine) {
        validateOnlineSession();
      } else {
        setIsLoading(false);
      }
    };

    initLocalFirst();

    return () => {
      isMounted = false;
    };
  }, []);

  // Monitor connectivity changes
  useEffect(() => {
    const handleOnline = () => {
      setConnectivity('online');
      // Re-validate session in background when connectivity returns
      validateOnlineSession();
    };

    const handleOffline = () => {
      setConnectivity('offline');
    };

    const handleExpired = async () => {
      setSessionStatus('reauth_required');
      setUser(null);
      setMembership(null);
      setInstitution(null);
      setAccessToken(null);
      await clearAllOfflineData();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('app:offline', handleOffline);
    window.addEventListener('auth:hs-session-expired', handleExpired);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('app:offline', handleOffline);
      window.removeEventListener('auth:hs-session-expired', handleExpired);
    };
  }, [validateOnlineSession]);

  const loginWithGoogle = async (idToken: string) => {
    setIsLoading(true);
    try {
      const { data } = await apiClient.post('/auth/hs/google', { idToken });
      if (data.success) {
        setAccessToken(data.data.accessToken);
        setUser(data.data.user);
        setSessionStatus('authenticated');
        setConnectivity('online');

        // Refresh membership
        const memRes = await apiClient.get('/institutions/my-membership');
        const newInst = memRes.data?.data?.institution || null;
        const newMem = memRes.data?.data?.membership || null;
        setMembership(newMem);
        setInstitution(newInst);

        await persistSessionMetadata(data.data.user, newInst, newMem);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const joinInstitution = async (accessCode: string) => {
    if (!navigator.onLine) {
      throw new Error('Joining an institution requires an active internet connection.');
    }
    const { data } = await apiClient.post('/institutions/join', { accessCode });
    if (data.success) {
      setMembership(data.data.membership);
      setInstitution(data.data.institution);
      if (user) {
        await persistSessionMetadata(user, data.data.institution, data.data.membership);
      }
    }
  };

  const setDefaultSchedule = async (rosterRecordId: string) => {
    if (!institution) return;
    if (!navigator.onLine) {
      throw new Error('Changing default schedule requires an active internet connection.');
    }
    const { data } = await apiClient.post(`/institutions/${institution.id}/default-schedule`, {
      rosterRecordId
    });
    if (data.success) {
      setMembership(data.data);
      if (user) {
        await persistSessionMetadata(user, institution, data.data);
      }
    }
  };

  const leaveInstitution = async () => {
    if (!institution) return;
    if (!navigator.onLine) {
      throw new Error('Leaving an institution requires an active internet connection.');
    }
    await apiClient.post(`/institutions/${institution.id}/leave`);
    setMembership(null);
    setInstitution(null);
    if (user) {
      await persistSessionMetadata(user, null, null);
    }
    // Clear the cached schedule snapshot for this institution
    await clearScheduleSnapshot();
    setLocalDataStatus('not_downloaded');
  };

  const logout = async () => {
    try {
      if (navigator.onLine) {
        await apiClient.post('/auth/logout');
      }
    } catch {
      // ignore network errors on logout
    } finally {
      setAccessToken(null);
      setUser(null);
      setMembership(null);
      setInstitution(null);
      setSessionStatus('reauth_required');
      setLocalDataStatus('not_downloaded');
      await clearAllOfflineData();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        membership,
        institution,
        isAuthenticated: (sessionStatus === 'authenticated' || sessionStatus === 'offline_unverified') && !!user,
        isLoading,
        connectivity,
        sessionStatus,
        localDataStatus,
        loginWithGoogle,
        joinInstitution,
        setDefaultSchedule,
        leaveInstitution,
        logout,
        refreshMembership,
        checkSession: validateOnlineSession
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

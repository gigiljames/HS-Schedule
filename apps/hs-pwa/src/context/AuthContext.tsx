import React, { createContext, useContext, useState, useEffect } from 'react';
import { IUser, IInstitution, IInstitutionMembership } from '@hs/shared';
import { apiClient, setAccessToken } from '../api/client';

interface AuthContextType {
  user: IUser | null;
  membership: IInstitutionMembership | null;
  institution: IInstitution | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  loginWithGoogle: (idToken: string) => Promise<void>;
  joinInstitution: (accessCode: string) => Promise<void>;
  setDefaultSchedule: (rosterRecordId: string) => Promise<void>;
  leaveInstitution: () => Promise<void>;
  logout: () => Promise<void>;
  refreshMembership: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<IUser | null>(null);
  const [membership, setMembership] = useState<IInstitutionMembership | null>(null);
  const [institution, setInstitution] = useState<IInstitution | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshMembership = async () => {
    try {
      const { data } = await apiClient.get('/institutions/my-membership');
      if (data.data) {
        setMembership(data.data.membership);
        setInstitution(data.data.institution);
      } else {
        setMembership(null);
        setInstitution(null);
      }
    } catch {
      // not in college yet
      setMembership(null);
      setInstitution(null);
    }
  };

  const checkSession = async () => {
    try {
      const { data } = await apiClient.post('/auth/refresh');
      if (data.success) {
        setAccessToken(data.data.accessToken);
        setUser(data.data.user);
        await refreshMembership();
      }
    } catch {
      setUser(null);
      setMembership(null);
      setInstitution(null);
      setAccessToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkSession();

    const handleExpired = () => {
      setUser(null);
      setMembership(null);
      setInstitution(null);
      setAccessToken(null);
    };

    window.addEventListener('auth:hs-session-expired', handleExpired);
    return () => window.removeEventListener('auth:hs-session-expired', handleExpired);
  }, []);

  const loginWithGoogle = async (idToken: string) => {
    setIsLoading(true);
    try {
      const { data } = await apiClient.post('/auth/hs/google', { idToken });
      if (data.success) {
        setAccessToken(data.data.accessToken);
        setUser(data.data.user);
        await refreshMembership();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const joinInstitution = async (accessCode: string) => {
    const { data } = await apiClient.post('/institutions/join', { accessCode });
    if (data.success) {
      setMembership(data.data.membership);
      setInstitution(data.data.institution);
    }
  };

  const setDefaultSchedule = async (rosterRecordId: string) => {
    if (!institution) return;
    const { data } = await apiClient.post(`/institutions/${institution.id}/default-schedule`, {
      rosterRecordId
    });
    if (data.success) {
      setMembership(data.data);
    }
  };

  const leaveInstitution = async () => {
    if (!institution) return;
    await apiClient.post(`/institutions/${institution.id}/leave`);
    setMembership(null);
    setInstitution(null);
  };

  const logout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // ignore
    } finally {
      setAccessToken(null);
      setUser(null);
      setMembership(null);
      setInstitution(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        membership,
        institution,
        isAuthenticated: !!user && user.role === 'hs',
        isLoading,
        loginWithGoogle,
        joinInstitution,
        setDefaultSchedule,
        leaveInstitution,
        logout,
        refreshMembership
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

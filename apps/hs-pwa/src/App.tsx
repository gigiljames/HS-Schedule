import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ScheduleProvider } from './context/ScheduleContext';
import { LoginPage } from './pages/LoginPage';
import { JoinInstitutionPage } from './pages/JoinInstitutionPage';
import { SelectProfilePage } from './pages/SelectProfilePage';
import { HomePage } from './pages/HomePage';
import { CalendarPage } from './pages/CalendarPage';
import { DirectoryPage } from './pages/DirectoryPage';
import { ProfilePage } from './pages/ProfilePage';
import { BottomNav } from './components/BottomNav';
import { DesktopHeader } from './components/DesktopHeader';
import { OfflineUnavailable } from './components/OfflineUnavailable';

const GuestRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading, institution, membership, connectivity, localDataStatus, sessionStatus } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-400 text-sm">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-3" />
        Checking session...
      </div>
    );
  }

  // If offline and no local data has ever been downloaded for this device
  if (connectivity === 'offline' && localDataStatus === 'not_downloaded' && sessionStatus !== 'authenticated') {
    return <OfflineUnavailable />;
  }

  if (isAuthenticated) {
    if (!institution) {
      return <Navigate to="/join" replace />;
    }
    if (!membership?.defaultScheduleRecordId) {
      return <Navigate to="/select-profile" replace />;
    }
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

const RequireAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading, connectivity, localDataStatus, sessionStatus } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-400 text-sm">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-3" />
        Authenticating House Surgeon account...
      </div>
    );
  }

  // If offline and no local data has ever been downloaded for this device
  if (connectivity === 'offline' && localDataStatus === 'not_downloaded' && sessionStatus !== 'authenticated') {
    return <OfflineUnavailable />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const ProtectedShell: React.FC = () => {
  const { isAuthenticated, isLoading, institution, membership, connectivity, localDataStatus, sessionStatus } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-400 text-sm">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-3" />
        Authenticating House Surgeon account...
      </div>
    );
  }

  // If offline and no local schedule data has ever been downloaded for this device
  if (connectivity === 'offline' && localDataStatus === 'not_downloaded' && sessionStatus !== 'authenticated') {
    return <OfflineUnavailable />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // If user does not belong to an institution yet, redirect to join
  if (!institution) {
    return <Navigate to="/join" replace />;
  }

  // If user has not selected a default schedule profile yet, redirect to select-profile
  if (!membership?.defaultScheduleRecordId) {
    return <Navigate to="/select-profile" replace />;
  }

  return (
    <ScheduleProvider>
      <div className="min-h-screen bg-slate-950 flex flex-col justify-between">
        <DesktopHeader />
        <div className="flex-1">
          <Outlet />
        </div>
        <BottomNav />
      </div>
    </ScheduleProvider>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#0f172a',
            color: '#f8fafc',
            border: '1px solid #1e293b',
            borderRadius: '16px',
            fontSize: '13px',
            fontWeight: 500,
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#ffffff'
            }
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#ffffff'
            }
          }
        }}
      />
      <BrowserRouter>
        <Routes>
          <Route
            path="/login"
            element={
              <GuestRoute>
                <LoginPage />
              </GuestRoute>
            }
          />
          <Route
            path="/join"
            element={
              <RequireAuth>
                <JoinInstitutionPage />
              </RequireAuth>
            }
          />
          <Route
            path="/select-profile"
            element={
              <RequireAuth>
                <SelectProfilePage />
              </RequireAuth>
            }
          />

          <Route element={<ProtectedShell />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/directory" element={<DirectoryPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

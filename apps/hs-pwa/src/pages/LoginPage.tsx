import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Navigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Stethoscope, ShieldCheck, Calendar, Users, Bell, WifiOff } from 'lucide-react';

declare global {
  interface Window {
    google?: any;
  }
}

export const LoginPage: React.FC = () => {
  const { loginWithGoogle, isAuthenticated, isLoading, institution, membership } = useAuth();
  const navigate = useNavigate();

  const googleBtnRef = useRef<HTMLDivElement>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 space-y-3">
        <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs">Checking session...</p>
      </div>
    );
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

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

    const initGoogleGSI = () => {
      if (window.google?.accounts?.id) {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: async (response: any) => {
            try {
              await loginWithGoogle(response.credential);
              toast.success('Signed in successfully');
              navigate('/');
            } catch (err: any) {
              toast.error(err.response?.data?.message || err.message || 'Google sign-in failed');
            }
          }
        });

        if (googleBtnRef.current) {
          window.google.accounts.id.renderButton(googleBtnRef.current, {
            theme: 'filled_blue',
            size: 'large',
            shape: 'pill',
            width: 280,
            text: 'continue_with'
          });
        }
        setIsInitializing(false);
      } else {
        // Retry shortly if script is still downloading
        setTimeout(initGoogleGSI, 300);
      }
    };

    initGoogleGSI();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-between px-4 sm:px-8 py-8 text-slate-100">
      <div className="max-w-6xl mx-auto w-full flex-1 flex flex-col md:flex-row items-center justify-center gap-10 md:gap-16 py-6 md:py-12">
        {/* Left Side: Branding Hero for Desktop & Tablet */}
        <div className="flex-1 max-w-xl text-center md:text-left space-y-6">
          <div className="inline-flex p-3.5 bg-blue-600 rounded-2xl shadow-xl shadow-blue-500/25 text-white">
            <Stethoscope className="w-10 h-10 md:w-12 md:h-12" />
          </div>

          <div>
            <span className="text-xs font-bold text-blue-400 uppercase tracking-widest block mb-1">
              Indian Medical Colleges Internship Platform
            </span>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-tight">
              House Surgeon Schedule Planner
            </h1>
            <p className="mt-3 text-sm sm:text-base text-slate-400 leading-relaxed">
              Real-time clinical rotation schedules, department tracks, colleague directory, and automatic posting reminders for interns and house surgeons.
            </p>
          </div>

          {/* Feature Highlights on Desktop */}
          <div className="hidden sm:grid sm:grid-cols-2 gap-3 pt-2 text-left">
            <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800/80 flex items-start space-x-2.5">
              <Calendar className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-slate-200">Rotation Timetables</h4>
                <p className="text-[11px] text-slate-400">Personalized matrix schedules resolved from your batch.</p>
              </div>
            </div>

            <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800/80 flex items-start space-x-2.5">
              <Users className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-slate-200">Department Directory</h4>
                <p className="text-[11px] text-slate-400">Instantly look up house surgeons posted in any department.</p>
              </div>
            </div>

            <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800/80 flex items-start space-x-2.5">
              <Bell className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-slate-200">Push Reminders</h4>
                <p className="text-[11px] text-slate-400">Evening-before and morning-of rotation alerts.</p>
              </div>
            </div>

            <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800/80 flex items-start space-x-2.5">
              <WifiOff className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-slate-200">Offline Hospital Cache</h4>
                <p className="text-[11px] text-slate-400">View your clinical rotation even in low-signal wards.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Google Sign-In Card */}
        <div className="w-full max-w-md bg-slate-900 p-8 sm:p-10 rounded-3xl border border-slate-800 shadow-2xl backdrop-blur-md text-center shrink-0">
          <div className="w-12 h-12 rounded-2xl bg-blue-600/15 border border-blue-500/20 text-blue-400 flex items-center justify-center mx-auto mb-4">
            <Stethoscope className="w-6 h-6" />
          </div>

          <h2 className="text-xl font-bold text-white mb-1.5">Doctor Sign In</h2>
          <p className="text-xs text-slate-400 mb-8">
            Sign in with your Google account to access your medical college schedule.
          </p>

          <div className="flex justify-center min-h-[44px]">
            <div ref={googleBtnRef} />
          </div>

          {isInitializing && (
            <p className="text-xs text-slate-500 mt-3 animate-pulse">
              Connecting to Google Identity Services...
            </p>
          )}

          <div className="mt-8 pt-6 border-t border-slate-800 flex items-center justify-center space-x-2 text-[11px] text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Strict Token Authentication via Google Auth Library</span>
          </div>
        </div>
      </div>

      <footer className="text-center text-xs text-slate-600 py-2">
        Designed for House Surgeons in Indian Medical Colleges
      </footer>
    </div>
  );
};

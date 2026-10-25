import React, { useState } from 'react';
import { WifiOff, RefreshCw, Stethoscope, ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const OfflineUnavailable: React.FC = () => {
  const { checkSession } = useAuth();
  const [retrying, setRetrying] = useState(false);

  const handleRetry = async () => {
    setRetrying(true);
    try {
      await checkSession();
    } finally {
      setTimeout(() => setRetrying(false), 800);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-4 text-slate-100">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 sm:p-10 shadow-2xl text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
          <WifiOff className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <span className="text-[11px] font-bold text-amber-400 uppercase tracking-widest block">
            Offline Setup Required
          </span>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Internet Connection Required
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
            No local schedule snapshot was found on this device. The House Surgeon Planner requires an active internet connection for initial account authentication and rotation download.
          </p>
        </div>

        <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800/80 text-left space-y-2">
          <div className="flex items-center space-x-2 text-xs font-semibold text-slate-300">
            <Stethoscope className="w-4 h-4 text-blue-400 shrink-0" />
            <span>Once downloaded, schedules work offline:</span>
          </div>
          <ul className="text-[11px] text-slate-400 space-y-1 pl-6 list-disc">
            <li>Rotation schedules and clinical departments</li>
            <li>Colleague directory and house surgeon search</li>
            <li>Calendar navigation across the internship year</li>
          </ul>
        </div>

        <button
          onClick={handleRetry}
          disabled={retrying}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/25 transition-all flex items-center justify-center space-x-2"
        >
          <RefreshCw className={`w-4 h-4 ${retrying ? 'animate-spin' : ''}`} />
          <span>{retrying ? 'Checking Network...' : 'Retry Connection'}</span>
        </button>

        <p className="text-[10px] text-slate-500">
          Please connect to Wi-Fi or cellular data and tap Retry.
        </p>
      </div>
    </div>
  );
};

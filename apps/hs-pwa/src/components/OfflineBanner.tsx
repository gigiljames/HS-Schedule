import React from 'react';
import { useSchedule } from '../context/ScheduleContext';
import { WifiOff, RefreshCw, CheckCircle2 } from 'lucide-react';

export const OfflineBanner: React.FC = () => {
  const { isOffline, lastSyncedAt, syncSchedule, isLoading, syncStatus } = useSchedule();

  if (!isOffline && !lastSyncedAt) return null;

  // Format last synced timestamp into user-friendly string (DD-MM-YYYY, hh:mm a)
  const formatSyncTime = (iso?: string | null) => {
    if (!iso) return 'Never';
    try {
      const dt = new Date(iso);
      const d = String(dt.getDate()).padStart(2, '0');
      const m = String(dt.getMonth() + 1).padStart(2, '0');
      const y = dt.getFullYear();
      const timePart = new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      }).format(dt);
      return `${d}-${m}-${y}, ${timePart}`;
    } catch {
      return iso;
    }
  };

  return (
    <div
      className={`px-4 py-2 text-xs font-medium flex items-center justify-between border-b transition-colors duration-200 ${
        isOffline
          ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
          : syncStatus === 'error'
          ? 'bg-rose-500/10 border-rose-500/20 text-rose-300'
          : 'bg-slate-800/60 border-slate-750 text-slate-400'
      }`}
    >
      <div className="flex items-center space-x-2">
        {isOffline ? (
          <>
            <WifiOff className="w-3.5 h-3.5 flex-shrink-0" />
            <span>Offline mode • Last synced {formatSyncTime(lastSyncedAt)}</span>
          </>
        ) : syncStatus === 'syncing' ? (
          <>
            <RefreshCw className="w-3.5 h-3.5 flex-shrink-0 animate-spin text-blue-400" />
            <span>Syncing hospital schedule...</span>
          </>
        ) : (
          <>
            <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 text-emerald-400" />
            <span>Synced: {formatSyncTime(lastSyncedAt)}</span>
          </>
        )}
      </div>

      <button
        onClick={() => syncSchedule(true)}
        disabled={isLoading}
        className="flex items-center space-x-1.5 hover:text-white transition-colors disabled:opacity-50 px-2 py-0.5 rounded-lg hover:bg-slate-800"
        title="Sync Schedule"
      >
        <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        <span>{isLoading ? 'Syncing...' : 'Sync'}</span>
      </button>
    </div>
  );
};

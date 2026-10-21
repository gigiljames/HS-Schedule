import React from 'react';
import { useSchedule } from '../context/ScheduleContext';
import { WifiOff, RefreshCw } from 'lucide-react';

export const OfflineBanner: React.FC = () => {
  const { isOffline, lastSyncedAt, syncSchedule, isLoading } = useSchedule();

  if (!isOffline && !lastSyncedAt) return null;

  // Format last synced timestamp into user-friendly string
  const formatSyncTime = (iso?: string | null) => {
    if (!iso) return 'Never';
    try {
      const dt = new Date(iso);
      return new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: 'numeric',
        month: 'short',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      }).format(dt);
    } catch {
      return iso;
    }
  };

  return (
    <div
      className={`px-4 py-2 text-xs font-medium flex items-center justify-between border-b ${
        isOffline
          ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
          : 'bg-slate-800/60 border-slate-750 text-slate-400'
      }`}
    >
      <div className="flex items-center space-x-2">
        {isOffline ? (
          <>
            <WifiOff className="w-3.5 h-3.5 flex-shrink-0" />
            <span>Offline mode • Last synced {formatSyncTime(lastSyncedAt)}</span>
          </>
        ) : (
          <span>Synced: {formatSyncTime(lastSyncedAt)}</span>
        )}
      </div>

      <button
        onClick={() => syncSchedule()}
        disabled={isLoading}
        className="flex items-center space-x-1 hover:text-white transition-colors disabled:opacity-50"
      >
        <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        <span>{isLoading ? 'Syncing...' : 'Sync'}</span>
      </button>
    </div>
  );
};

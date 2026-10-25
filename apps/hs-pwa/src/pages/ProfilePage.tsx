import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSchedule } from '../context/ScheduleContext';
import { OfflineBanner } from '../components/OfflineBanner';
import { apiClient } from '../api/client';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  Bell,
  Building2,
  Clock,
  ShieldAlert,
  LogOut,
  Edit2,
  Check,
  AlertTriangle,
  Info
} from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { user, institution, membership, leaveInstitution, logout, refreshMembership, connectivity } = useAuth();
  const { personalSchedule, lastSyncedAt } = useSchedule();
  const navigate = useNavigate();

  const isOffline = connectivity === 'offline' || !navigator.onLine;

  // Name editing
  const [isEditingName, setIsEditingName] = useState(false);
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [isSavingName, setIsSavingName] = useState(false);

  // Push notification state
  const [pushSupported, setPushSupported] = useState(false);
  const [pushPermission, setPushPermission] = useState<NotificationPermission>('default');
  const [isSubscribing, setIsSubscribing] = useState(false);

  // Notification Preferences
  const [endReminder, setEndReminder] = useState(membership?.notificationPreferences?.postingEndReminder ?? true);
  const [startReminder, setStartReminder] = useState(membership?.notificationPreferences?.postingStartNotification ?? true);
  const [timeEnd, setTimeEnd] = useState(membership?.notificationPreferences?.reminderTimeEnd || '19:00');
  const [timeStart, setTimeStart] = useState(membership?.notificationPreferences?.reminderTimeStart || '07:00');
  const [hideDept, setHideDept] = useState(membership?.notificationPreferences?.hideDepartmentNameOnLockScreen ?? false);
  const [savingPrefs, setSavingPrefs] = useState(false);

  // Leave confirmation
  const [leaveConfirm, setLeaveConfirm] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window) {
      setPushSupported(true);
      setPushPermission(Notification.permission);
    }
  }, []);

  const handleSaveName = async () => {
    if (isOffline) {
      toast.error('Cannot update profile name while offline. Please connect to the internet.');
      return;
    }
    if (!displayName.trim()) return;
    setIsSavingName(true);
    try {
      await apiClient.put('/auth/profile', { displayName: displayName.trim() });
      setIsEditingName(false);
      toast.success('Doctor display name updated!');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update name');
    } finally {
      setIsSavingName(false);
    }
  };

  const handleRequestPushPermission = async () => {
    if (isOffline) {
      toast.error('Registering for Web Push reminders requires an active internet connection.');
      return;
    }
    if (!pushSupported) {
      toast.error('Web Push is not supported by your current browser.');
      return;
    }

    setIsSubscribing(true);
    try {
      const permission = await Notification.requestPermission();
      setPushPermission(permission);

      if (permission === 'granted') {
        const swReg = await navigator.serviceWorker.ready;
        const { data } = await apiClient.get('/notifications/public-key');
        const vapidKey = data.data.vapidPublicKey;

        if (vapidKey) {
          const subscription = await swReg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlB64ToUint8Array(vapidKey)
          });

          const subJson = subscription.toJSON();
          await apiClient.post('/notifications/subscribe', {
            endpoint: subJson.endpoint,
            keys: subJson.keys
          });
          toast.success('Web Push registered successfully! Reminders are active.');
        }
      } else {
        toast.error('Notification permission was not granted.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to register push subscription');
    } finally {
      setIsSubscribing(false);
    }
  };

  const handleSavePreferences = async () => {
    if (isOffline) {
      toast.error('Cannot save notification preferences while offline. Please connect to the internet.');
      return;
    }
    if (!institution) return;
    setSavingPrefs(true);
    try {
      await apiClient.put(`/institutions/${institution.id}/notification-preferences`, {
        postingEndReminder: endReminder,
        postingStartNotification: startReminder,
        reminderTimeEnd: timeEnd,
        reminderTimeStart: timeStart,
        hideDepartmentNameOnLockScreen: hideDept
      });
      await refreshMembership();
      toast.success('Notification settings saved successfully!');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save notification preferences');
    } finally {
      setSavingPrefs(false);
    }
  };

  const handleConfirmLeave = async () => {
    if (isOffline) {
      toast.error('Leaving an institution requires an active internet connection.');
      return;
    }
    try {
      await leaveInstitution();
      toast.success('Left college institution');
      navigate('/join');
    } catch (err: any) {
      toast.error(err.message || 'Failed to leave institution');
    }
  };

  const handleChangeProfile = () => {
    if (isOffline) {
      toast.error('Changing roster profile is not allowed in offline mode. Please connect to the internet.');
      return;
    }
    navigate('/select-profile');
  };

  function urlB64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-24 md:pb-12">
      <OfflineBanner />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Doctor Profile & Settings</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Manage your account details, default schedule link, and rotation reminder preferences.
          </p>
        </div>

        {/* 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Account Details, College & Schedule Link */}
          <div className="lg:col-span-6 space-y-6">
            {/* Account Card */}
            <section className="bg-slate-900 rounded-3xl border border-slate-800 p-6 shadow-xl space-y-4">
              <div className="flex items-center space-x-4 pb-4 border-b border-slate-800">
                <div className="w-14 h-14 rounded-2xl bg-blue-600/20 border border-blue-500/30 text-blue-400 flex items-center justify-center font-bold text-xl shrink-0">
                  {user?.displayName ? user.displayName.slice(0, 2).toUpperCase() : 'DR'}
                </div>
                <div className="flex-1 min-w-0">
                  {isEditingName ? (
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white w-full outline-none focus:border-blue-500"
                      />
                      <button
                        onClick={handleSaveName}
                        disabled={isSavingName}
                        className="p-2 bg-blue-600 text-white rounded-xl text-xs"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-bold text-white truncate">{user?.displayName}</h2>
                      <button
                        onClick={() => setIsEditingName(true)}
                        className="text-slate-400 hover:text-white p-1"
                        title="Edit Name"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  <p className="text-xs text-slate-400 truncate mt-0.5">{user?.email}</p>
                </div>
              </div>


              {/* College Membership */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Medical College Membership
                </span>
                <div className="flex items-center justify-between p-3.5 bg-slate-950 rounded-2xl border border-slate-850">
                  <div className="flex items-center space-x-2.5">
                    <Building2 className="w-4 h-4 text-blue-400 shrink-0" />
                    <span className="text-xs sm:text-sm font-semibold text-white">{institution?.name || 'Not Joined'}</span>
                  </div>
                  <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-lg bg-blue-950 text-blue-300 border border-blue-800/60">
                    {institution?.shortName}
                  </span>
                </div>
              </div>

              {/* Selected Default Schedule Profile */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Default Schedule Profile
                </span>
                <div className="flex items-center justify-between p-3.5 bg-slate-950 rounded-2xl border border-slate-850">
                  <div>
                    <span className="text-xs sm:text-sm font-bold text-white block">
                      {personalSchedule?.rosterRecordName || 'None Selected'}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Controls personal agenda & reminders
                    </span>
                  </div>
                  <button
                    onClick={handleChangeProfile}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-colors"
                  >
                    Change
                  </button>
                </div>
              </div>
            </section>

            {/* Institution & Account Actions */}
            <section className="bg-slate-900 rounded-3xl border border-slate-800 p-5 shadow-xl space-y-3">
              {leaveConfirm ? (
                <div className="p-4 bg-red-950/50 border border-red-800 rounded-2xl space-y-3">
                  <div className="flex items-start space-x-2.5 text-xs text-red-300">
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <span>
                      Leaving {institution?.name} will revoke your schedule access and cancel reminders. Are you sure?
                    </span>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => setLeaveConfirm(false)}
                      className="px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 rounded-xl"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleConfirmLeave}
                      className="px-3.5 py-1.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-sm"
                    >
                      Yes, Leave College
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setLeaveConfirm(true)}
                  className="w-full py-3 bg-slate-950 hover:bg-red-950/30 text-red-400 border border-slate-850 hover:border-red-900/50 rounded-2xl text-xs font-semibold transition-colors flex items-center justify-center space-x-2"
                >
                  <ShieldAlert className="w-4 h-4" />
                  <span>Leave {institution?.name || 'College'}</span>
                </button>
              )}

              <button
                onClick={() => logout()}
                className="w-full py-3 bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-850 rounded-2xl text-xs font-semibold transition-colors flex items-center justify-center space-x-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </section>
          </div>

          {/* Right Column: Web Push Notification Preferences */}
          <div className="lg:col-span-6 space-y-6">
            <section className="bg-slate-900 rounded-3xl border border-slate-800 p-6 shadow-xl space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center space-x-2.5">
                  <Bell className="w-5 h-5 text-amber-400" />
                  <h2 className="text-base font-bold text-white">Posting Reminders (Web Push)</h2>
                </div>

                {pushSupported && (
                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                      pushPermission === 'granted'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        : pushPermission === 'denied'
                        ? 'bg-red-950 text-red-300 border border-red-800'
                        : 'bg-amber-950 text-amber-300 border border-amber-800'
                    }`}
                  >
                    {pushPermission === 'granted' ? 'Enabled' : pushPermission === 'denied' ? 'Blocked' : 'Not Enabled'}
                  </span>
                )}
              </div>


              {pushPermission !== 'granted' && (
                <div className="p-4 bg-blue-950/30 rounded-2xl border border-blue-900/60 text-xs space-y-3">
                  <p className="text-blue-200">
                    Receive automated reminders on the evening before a rotation ends and on the morning a new rotation begins.
                  </p>
                  <button
                    onClick={handleRequestPushPermission}
                    disabled={isSubscribing}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md transition-colors disabled:opacity-50"
                  >
                    {isSubscribing ? 'Requesting Permission...' : 'Enable Web Push Reminders'}
                  </button>
                </div>
              )}

              <div className="space-y-3 pt-1">
                {/* Toggle 1: Posting End Reminder */}
                <div className="flex items-center justify-between p-3.5 bg-slate-950 rounded-2xl border border-slate-850">
                  <div>
                    <span className="text-xs font-bold text-white block">Posting-End Reminder</span>
                    <span className="text-[11px] text-slate-400">Day before posting ends at {timeEnd} IST</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={endReminder}
                    onChange={(e) => setEndReminder(e.target.checked)}
                    className="w-5 h-5 rounded text-blue-600 bg-slate-800 border-slate-700"
                  />
                </div>

                {/* Toggle 2: Posting Start Notification */}
                <div className="flex items-center justify-between p-3.5 bg-slate-950 rounded-2xl border border-slate-850">
                  <div>
                    <span className="text-xs font-bold text-white block">Posting-Start Notification</span>
                    <span className="text-[11px] text-slate-400">First day of new posting at {timeStart} IST</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={startReminder}
                    onChange={(e) => setStartReminder(e.target.checked)}
                    className="w-5 h-5 rounded text-blue-600 bg-slate-800 border-slate-700"
                  />
                </div>

                {/* Privacy Toggle: Hide department on lock screen */}
                <div className="flex items-center justify-between p-3.5 bg-slate-950 rounded-2xl border border-slate-850">
                  <div>
                    <span className="text-xs font-bold text-white block">Lock-Screen Privacy</span>
                    <span className="text-[11px] text-slate-400">Hide clinical department name on device lock screen</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={hideDept}
                    onChange={(e) => setHideDept(e.target.checked)}
                    className="w-5 h-5 rounded text-blue-600 bg-slate-800 border-slate-700"
                  />
                </div>


                <button
                  onClick={handleSavePreferences}
                  disabled={savingPrefs}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-750 text-white rounded-xl text-xs font-bold border border-slate-700 transition-colors disabled:opacity-50"
                >
                  {savingPrefs ? 'Saving Settings...' : 'Save Notification Preferences'}
                </button>
              </div>

              <div className="p-4 bg-slate-950 rounded-2xl text-[11px] text-slate-500 space-y-1 border border-slate-850">
                <div className="flex items-center space-x-1.5 font-semibold text-slate-400">
                  <Info className="w-3.5 h-3.5" />
                  <span>Offline Schedule Cache</span>
                </div>
                <p>
                  Schedules are locally cached on this device for offline reference in hospital zones with weak cell reception.
                  {lastSyncedAt && (() => {
                    try {
                      const dt = new Date(lastSyncedAt);
                      const d = String(dt.getDate()).padStart(2, '0');
                      const m = String(dt.getMonth() + 1).padStart(2, '0');
                      const y = dt.getFullYear();
                      const timeStr = new Intl.DateTimeFormat('en-IN', {
                        timeZone: 'Asia/Kolkata',
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                      }).format(dt);
                      return ` Last synced: ${d}-${m}-${y}, ${timeStr}`;
                    } catch {
                      return ` Last synced: ${lastSyncedAt}`;
                    }
                  })()}
                </p>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
};

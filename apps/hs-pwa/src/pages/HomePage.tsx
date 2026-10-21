import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useSchedule } from '../context/ScheduleContext';
import { OfflineBanner } from '../components/OfflineBanner';
import { formatRangeDisplay, getTodayInKolkata, compareDates } from '@hs/shared';
import { Stethoscope, Calendar, Clock, Layers, ArrowUpRight, Sparkles, Building2, User } from 'lucide-react';
import { Link } from 'react-router-dom';

export const HomePage: React.FC = () => {
  const { user, institution, membership } = useAuth();
  const { personalSchedule } = useSchedule();

  const today = getTodayInKolkata();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-24 md:pb-12">
      <OfflineBanner />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Header Greeting */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-2 border-b border-slate-900">
          <div>
            <div className="flex items-center space-x-1.5 text-xs text-blue-400 font-bold uppercase tracking-wider mb-1">
              <Building2 className="w-3.5 h-3.5" />
              <span>{institution?.shortName || 'College'}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Hello, {personalSchedule ? personalSchedule.rosterRecordName : user?.displayName}
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
              {institution?.name || 'Medical College & Hospital'}
            </p>
          </div>

          <div className="flex items-center space-x-2 text-xs font-mono text-slate-400 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800">
            <Calendar className="w-3.5 h-3.5 text-blue-400" />
            <span>Today • {today}</span>
          </div>
        </div>

        {!membership?.defaultScheduleRecordId ? (
          <div className="p-8 bg-slate-900 border border-slate-800 rounded-3xl text-center space-y-3 max-w-lg mx-auto mt-6">
            <Sparkles className="w-10 h-10 text-blue-400 mx-auto" />
            <h2 className="text-base font-bold text-white">Default Schedule Not Selected</h2>
            <p className="text-xs text-slate-400">
              Please link your account to your house surgeon roster name to view your clinical schedule.
            </p>
            <Link
              to="/select-profile"
              className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-600/30"
            >
              Select Profile Now
            </Link>
          </div>
        ) : !personalSchedule ? (
          <div className="p-10 bg-slate-900/60 border border-slate-800 rounded-3xl text-center space-y-2 max-w-lg mx-auto mt-6">
            <Calendar className="w-12 h-12 text-slate-500 mx-auto mb-2" />
            <h2 className="text-sm font-bold text-slate-300">No Published Schedule</h2>
            <p className="text-xs text-slate-500">
              Your college administration has not published an active schedule version yet.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: ACTIVE POSTINGS & NEXT ROTATION */}
            <div className="lg:col-span-5 space-y-6">
              {/* CURRENT POSTING(S) SECTION */}
              <section className="space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                  Active Clinical Posting
                </span>

                {personalSchedule.currentPostings.length === 0 ? (
                  <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl text-center text-slate-400 text-xs">
                    No active posting scheduled for today ({today}). Check your rotation agenda on the right for upcoming postings.
                  </div>
                ) : (
                  personalSchedule.currentPostings.map((posting, idx) => (
                    <div
                      key={idx}
                      className="p-6 bg-slate-900 rounded-3xl border border-slate-800 shadow-xl relative overflow-hidden space-y-4"
                    >
                      {/* Color Bar Accent */}
                      <div
                        className="absolute left-0 top-0 bottom-0 w-2.5"
                        style={{ backgroundColor: posting.departmentColor }}
                      />

                      <div className="flex justify-between items-start pl-2">
                        <div>
                          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                            {posting.trackName}
                          </span>
                          <h2 className="text-2xl font-black text-white mt-1">
                            {posting.departmentName}
                          </h2>
                        </div>
                        <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 border border-slate-700">
                          {posting.departmentAbbreviation}
                        </span>
                      </div>

                      <div className="pl-2 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-1.5 text-slate-300 font-medium">
                          <Clock className="w-4 h-4 text-blue-400" />
                          <span>{formatRangeDisplay(posting.startDate, posting.endDate)}</span>
                        </div>

                        <span className="text-xs text-blue-400 font-bold px-2 py-0.5 bg-blue-500/10 rounded border border-blue-500/20">
                          Batch {posting.matchedBatchCode}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </section>

              {/* NEXT POSTING CHANGE */}
              {personalSchedule.nextUpcomingPosting && (
                <section className="p-5 bg-gradient-to-r from-blue-950/40 to-slate-900 rounded-3xl border border-blue-900/50 flex items-center justify-between shadow-sm">
                  <div>
                    <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest block">
                      Next Rotation Change
                    </span>
                    <p className="text-base font-bold text-white mt-1">
                      {personalSchedule.nextUpcomingPosting.departmentName}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Starts {personalSchedule.nextUpcomingPosting.startDate}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold px-3 py-1 bg-blue-900/60 text-blue-200 border border-blue-700/50 rounded-xl">
                      {personalSchedule.nextUpcomingPosting.departmentAbbreviation}
                    </span>
                  </div>
                </section>
              )}

              {/* Quick Info Card */}
              <section className="p-5 bg-slate-900/50 rounded-3xl border border-slate-800/80 text-xs text-slate-400 space-y-2">
                <div className="flex justify-between">
                  <span>Enrolled Doctor:</span>
                  <span className="font-semibold text-slate-200">{personalSchedule.rosterRecordName}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Scheduled Rotations:</span>
                  <span className="font-semibold text-slate-200">{personalSchedule.agenda.length}</span>
                </div>
              </section>
            </div>

            {/* Right Column: UPCOMING AGENDA TIMETABLE */}
            <div className="lg:col-span-7 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Full Rotation Agenda
                </span>
                <span className="text-xs text-slate-500 font-mono">
                  {personalSchedule.agenda.length} postings
                </span>
              </div>

              <div className="space-y-2.5">
                {personalSchedule.agenda.map((posting, idx) => {
                  const isCurrent =
                    compareDates(today, posting.startDate) >= 0 &&
                    compareDates(today, posting.endDate) <= 0;

                  return (
                    <div
                      key={idx}
                      className={`p-4 rounded-2xl border transition-all flex items-center justify-between ${
                        isCurrent
                          ? 'bg-slate-900 border-blue-500/60 shadow-md ring-1 ring-blue-500/20'
                          : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center space-x-3.5 min-w-0">
                        <span
                          className="w-4 h-4 rounded-full shrink-0 shadow-xs"
                          style={{ backgroundColor: posting.departmentColor }}
                        />
                        <div className="min-w-0">
                          <div className="flex items-center space-x-1.5">
                            <h3 className="font-bold text-sm text-white truncate">{posting.departmentName}</h3>
                            <span className="text-[10px] text-slate-400 font-mono">
                              ({posting.departmentAbbreviation})
                            </span>
                            {isCurrent && (
                              <span className="text-[9px] font-bold px-1.5 py-0.2 bg-blue-500/20 text-blue-300 rounded border border-blue-500/40">
                                Current
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {formatRangeDisplay(posting.startDate, posting.endDate)}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0 ml-4">
                        <span className="text-xs font-semibold text-slate-300 block">
                          {posting.trackName}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          Batch {posting.matchedBatchCode}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

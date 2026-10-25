import React, { useState } from 'react';
import { useSchedule } from '../context/ScheduleContext';
import { useAuth } from '../context/AuthContext';
import { OfflineBanner } from '../components/OfflineBanner';
import { formatDisplayDate, getTodayInKolkata, isDateInRange } from '@hs/shared';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, Layers } from 'lucide-react';

export const CalendarPage: React.FC = () => {
  const { personalSchedule, snapshot } = useSchedule();
  const { institution } = useAuth();

  const todayStr = getTodayInKolkata();
  const [currentYear, setCurrentYear] = useState(() => new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(() => new Date().getMonth()); // 0-indexed
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  // Generate calendar grid days for current month
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay(); // 0 = Sun
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  const calendarDays: Array<{ dayNumber: number; dateStr: string; isCurrentMonth: boolean }> = [];

  // Previous month trailing days
  const prevMonthDays = new Date(currentYear, currentMonth, 0).getDate();
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const d = prevMonthDays - i;
    const m = currentMonth === 0 ? 12 : currentMonth;
    const y = currentMonth === 0 ? currentYear - 1 : currentYear;
    calendarDays.push({
      dayNumber: d,
      dateStr: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
      isCurrentMonth: false
    });
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    calendarDays.push({
      dayNumber: d,
      dateStr,
      isCurrentMonth: true
    });
  }

  // Next month leading days to complete week rows (multiples of 7)
  const remaining = (7 - (calendarDays.length % 7)) % 7;
  for (let d = 1; d <= remaining; d++) {
    const m = currentMonth === 11 ? 1 : currentMonth + 2;
    const y = currentMonth === 11 ? currentYear + 1 : currentYear;
    calendarDays.push({
      dayNumber: d,
      dateStr: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
      isCurrentMonth: false
    });
  }

  // Compute postings for each date from personal schedule
  const getPostingsForDate = (dateStr: string) => {
    if (!personalSchedule) return [];
    return personalSchedule.agenda.filter((p) => isDateInRange(dateStr, p.startDate, p.endDate));
  };

  const selectedDatePostings = getPostingsForDate(selectedDate);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-24 md:pb-12">
      <OfflineBanner />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Rotation Calendar</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Browse through your entire rotational calendar and day-by-day clinical assignments.
          </p>
        </div>

        {/* 2-Column Responsive Layout on Desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Monthly Interactive Calendar */}
          <div className="lg:col-span-7 bg-slate-900 rounded-3xl border border-slate-800 p-5 shadow-xl space-y-4">
            {/* Month Navigation Controls */}
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <h2 className="text-lg font-bold text-white">
                {months[currentMonth]} {currentYear}
              </h2>
              <div className="flex space-x-1.5">
                <button
                  onClick={handlePrevMonth}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                  aria-label="Previous month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    const now = new Date();
                    setCurrentYear(now.getFullYear());
                    setCurrentMonth(now.getMonth());
                    setSelectedDate(todayStr);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition-colors"
                >
                  Today
                </button>
                <button
                  onClick={handleNextMonth}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                  aria-label="Next month"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Day of Week Headers */}
            <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-slate-500">
              <span>Su</span>
              <span>Mo</span>
              <span>Tu</span>
              <span>We</span>
              <span>Th</span>
              <span>Fr</span>
              <span>Sa</span>
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-1.5">
              {calendarDays.map((item, idx) => {
                const postings = getPostingsForDate(item.dateStr);
                const isToday = item.dateStr === todayStr;
                const isSelected = item.dateStr === selectedDate;

                return (
                  <button
                    key={idx}
                    onClick={() => setSelectedDate(item.dateStr)}
                    className={`h-12 sm:h-14 rounded-xl flex flex-col items-center justify-between p-1 transition-all ${
                      isSelected
                        ? 'bg-blue-600 text-white font-bold ring-2 ring-blue-400/50 shadow-md'
                        : isToday
                        ? 'bg-slate-800 text-blue-400 font-bold border border-blue-500/40'
                        : item.isCurrentMonth
                        ? 'bg-slate-850/60 text-slate-300 hover:bg-slate-800'
                        : 'bg-transparent text-slate-600'
                    }`}
                  >
                    <span className="text-xs leading-none mt-0.5">{item.dayNumber}</span>

                    {/* Posting Color Dots */}
                    <div className="flex space-x-0.5 pb-0.5">
                      {postings.slice(0, 3).map((p, pIdx) => (
                        <span
                          key={pIdx}
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: p.departmentColor }}
                        />
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: Selected Date Postings Details Card */}
          <div className="lg:col-span-5 bg-slate-900 rounded-3xl border border-slate-800 p-5 shadow-xl space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  Selected Date
                </span>
                <h3 className="text-base font-bold text-white mt-0.5">
                  {formatDisplayDate(selectedDate)}
                </h3>
              </div>
              {selectedDate === todayStr && (
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  Today
                </span>
              )}
            </div>

            {selectedDatePostings.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                <CalendarIcon className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p>No clinical posting assignments for this date.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedDatePostings.map((p, idx) => (
                  <div
                    key={idx}
                    className="p-4 bg-slate-950 rounded-2xl border border-slate-850 flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-3.5">
                      <span
                        className="w-4 h-4 rounded-full shrink-0 shadow-xs"
                        style={{ backgroundColor: p.departmentColor }}
                      />
                      <div>
                        <h4 className="font-bold text-sm text-white">{p.departmentName}</h4>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {formatDisplayDate(p.startDate)} to {formatDisplayDate(p.endDate)}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                        {p.departmentAbbreviation}
                      </span>
                      <span className="block text-[10px] text-slate-500 mt-1">
                        {p.trackName}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

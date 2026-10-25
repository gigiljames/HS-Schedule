import React, { useState, useMemo } from 'react';
import { useSchedule } from '../context/ScheduleContext';
import { useAuth } from '../context/AuthContext';
import { OfflineBanner } from '../components/OfflineBanner';
import { formatDisplayDate, getTodayInKolkata, isDateInRange, IResolvedPosting } from '@hs/shared';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, Layers } from 'lucide-react';

// Computes high-contrast text color based on background luminance
function getContrastTextColor(hexColor?: string): string {
  if (!hexColor) return '#ffffff';
  const hex = hexColor.replace('#', '');
  if (hex.length !== 6) return '#ffffff';
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 140 ? '#0f172a' : '#ffffff';
}

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

  // Generate calendar grid days for current month (leading and trailing slots left empty)
  const calendarDays = useMemo(() => {
    const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay(); // 0 = Sun
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const days: Array<{ dayNumber: number; dateStr: string; isCurrentMonth: boolean } | null> = [];

    // Empty leading slots before the 1st of the month
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push(null);
    }

    // Current month days only
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        dayNumber: d,
        dateStr,
        isCurrentMonth: true
      });
    }

    // Empty trailing slots to complete the final week row
    const remaining = (7 - (days.length % 7)) % 7;
    for (let d = 1; d <= remaining; d++) {
      days.push(null);
    }

    return days;
  }, [currentYear, currentMonth]);

  // Group days into 7-day weeks for row-by-row continuous bar rendering
  const weeks = useMemo(() => {
    const rows: Array<Array<{ dayNumber: number; dateStr: string; isCurrentMonth: boolean } | null>> = [];
    for (let i = 0; i < calendarDays.length; i += 7) {
      rows.push(calendarDays.slice(i, i + 7));
    }
    return rows;
  }, [calendarDays]);

  // Compute postings for each date from personal schedule
  const getPostingsForDate = (dateStr: string): IResolvedPosting[] => {
    if (!personalSchedule) return [];
    return personalSchedule.agenda.filter((p) => isDateInRange(dateStr, p.startDate, p.endDate));
  };

  const selectedDatePostings = getPostingsForDate(selectedDate);

  // Distinct departments currently present in the selected month
  const legendDepartments = useMemo(() => {
    if (!personalSchedule?.agenda) return [];
    const monthStart = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(currentYear, currentMonth + 1, 0).getDate();
    const monthEnd = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    const map = new Map<string, { id: string; name: string; abbr: string; color: string }>();
    for (const p of personalSchedule.agenda) {
      // Only include rotations that overlap with the selected month
      if (p.startDate <= monthEnd && p.endDate >= monthStart) {
        if (!map.has(p.departmentId)) {
          map.set(p.departmentId, {
            id: p.departmentId,
            name: p.departmentName,
            abbr: p.departmentAbbreviation,
            color: p.departmentColor
          });
        }
      }
    }
    return Array.from(map.values());
  }, [personalSchedule, currentYear, currentMonth]);

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
            <div className="grid grid-cols-7 text-center text-xs font-bold text-slate-500 pb-1">
              <span>Su</span>
              <span>Mo</span>
              <span>Tu</span>
              <span>We</span>
              <span>Th</span>
              <span>Fr</span>
              <span>Sa</span>
            </div>

            {/* Weeks and Days Grid with Connected Continuous Posting Bars */}
            <div className="space-y-1 sm:space-y-1.5">
              {weeks.map((week, wIdx) => (
                <div key={wIdx} className="grid grid-cols-7 h-11 sm:h-12 relative">
                  {week.map((item, colIdx) => {
                    if (!item) {
                      return <div key={colIdx} className="w-full h-full" />;
                    }

                    const postings = getPostingsForDate(item.dateStr);
                    const primaryPosting = postings[0] || null;
                    const isToday = item.dateStr === todayStr;
                    const isSelected = item.dateStr === selectedDate;

                    // Check if adjacent days in this week row share the same posting
                    const prevItem = colIdx > 0 ? week[colIdx - 1] : null;
                    const nextItem = colIdx < 6 ? week[colIdx + 1] : null;

                    const prevPostings = prevItem ? getPostingsForDate(prevItem.dateStr) : [];
                    const nextPostings = nextItem ? getPostingsForDate(nextItem.dateStr) : [];

                    const connectedLeft = Boolean(
                      primaryPosting &&
                      prevItem &&
                      prevPostings.some((p) => p.departmentId === primaryPosting.departmentId && p.trackId === primaryPosting.trackId)
                    );

                    const connectedRight = Boolean(
                      primaryPosting &&
                      nextItem &&
                      nextPostings.some((p) => p.departmentId === primaryPosting.departmentId && p.trackId === primaryPosting.trackId)
                    );

                    // Determine horizontal bar geometry
                    let barRoundingClass = 'rounded-full';
                    let barMarginClass = 'inset-x-1';

                    if (connectedLeft && connectedRight) {
                      barRoundingClass = 'rounded-none';
                      barMarginClass = 'left-0 right-0';
                    } else if (!connectedLeft && connectedRight) {
                      barRoundingClass = 'rounded-l-2xl rounded-r-none';
                      barMarginClass = 'left-1 right-0';
                    } else if (connectedLeft && !connectedRight) {
                      barRoundingClass = 'rounded-r-2xl rounded-l-none';
                      barMarginClass = 'left-0 right-1';
                    } else {
                      barRoundingClass = 'rounded-2xl';
                      barMarginClass = 'inset-x-1';
                    }

                    const contrastColor = primaryPosting
                      ? getContrastTextColor(primaryPosting.departmentColor)
                      : '#ffffff';

                    return (
                      <button
                        key={colIdx}
                        type="button"
                        onClick={() => setSelectedDate(item.dateStr)}
                        className="relative flex items-center justify-center w-full h-full group focus:outline-none"
                      >
                        {/* Connected Continuous Posting Bar */}
                        {primaryPosting && (
                          <div
                            className={`absolute inset-y-1 z-0 transition-all ${barMarginClass} ${barRoundingClass} shadow-xs`}
                            style={{ backgroundColor: primaryPosting.departmentColor }}
                          />
                        )}

                        {/* Multi-posting secondary indicator if date has multiple assignments */}
                        {postings.length > 1 && (
                          <div
                            className="absolute bottom-1 w-1.5 h-1.5 rounded-full z-10 shadow-xs ring-1 ring-slate-950"
                            style={{ backgroundColor: postings[1].departmentColor }}
                          />
                        )}

                        {/* Day Number and Selection Badge */}
                        <div className="relative z-10 flex items-center justify-center">
                          {isSelected ? (
                            /* Selected Date Highlight: Distinct high-contrast badge (never shares bar color) */
                            <span className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center font-black text-xs sm:text-sm ring-2 ring-white ring-offset-2 ring-offset-slate-900 bg-slate-950 text-white shadow-2xl scale-105 transition-transform">
                              {item.dayNumber}
                            </span>
                          ) : primaryPosting ? (
                            /* Day number over colored posting bar */
                            <span
                              className="text-xs sm:text-sm font-bold select-none"
                              style={{ color: contrastColor }}
                            >
                              {item.dayNumber}
                            </span>
                          ) : isToday ? (
                            /* Today's date when not on a posting bar */
                            <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-blue-400 text-blue-400 font-bold flex items-center justify-center text-xs bg-slate-800/80">
                              {item.dayNumber}
                            </span>
                          ) : (
                            /* Regular date without posting */
                            <span className="text-xs sm:text-sm font-medium text-slate-300 group-hover:text-white transition-colors">
                              {item.dayNumber}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Department Color Legend */}
            {legendDepartments.length > 0 && (
              <div className="pt-3 border-t border-slate-800 flex flex-wrap gap-2 items-center">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mr-1">
                  Rotations:
                </span>
                {legendDepartments.map((dept) => (
                  <div
                    key={dept.id}
                    className="flex items-center space-x-1.5 px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-800 text-xs"
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
                      style={{ backgroundColor: dept.color }}
                    />
                    <span className="font-semibold text-slate-200">{dept.name}</span>
                    <span className="text-[10px] text-slate-500 font-mono">({dept.abbr})</span>
                  </div>
                ))}
              </div>
            )}
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
                    className="p-4 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-between shadow-xs"
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
                      <span className="text-xs font-bold text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-xl border border-blue-500/20">
                        {p.departmentAbbreviation}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Rotation Context Box */}
            {/* <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800 text-xs text-slate-400 space-y-2">
              <div className="flex items-center space-x-2 text-slate-300 font-semibold">
                <Clock className="w-4 h-4 text-blue-400" />
                <span>Rotation Period Overview</span>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-400">
                Tap on any day in the calendar to view its exact department assignment, active tracks, and clinical schedule details.
              </p>
            </div> */}
          </div>
        </div>
      </main>
    </div>
  );
};

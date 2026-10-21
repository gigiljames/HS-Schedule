import React, { useEffect, useState } from 'react';
import { apiClient } from '../api/client';
import { Link } from 'react-router-dom';
import { Building2, FileSpreadsheet, CheckCircle2, UserCheck, Users, ArrowRight } from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const [stats, setStats] = useState({
    totalInstitutions: 0,
    totalRosterRecords: 0,
    totalHsAccounts: 0,
    totalActiveMemberships: 0,
    institutionsWithPublishedSchedule: 0
  });
  const [recentInstitutions, setRecentInstitutions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [instRes, statsRes] = await Promise.all([
          apiClient.get('/institutions?pageSize=5'),
          apiClient.get('/institutions/stats')
        ]);

        const instItems = instRes.data.data?.items || [];
        const liveStats = statsRes.data.data || {};

        setStats({
          totalInstitutions: liveStats.totalInstitutions ?? (instRes.data.data?.total || 0),
          totalRosterRecords: liveStats.totalRosterRecords ?? 0,
          totalHsAccounts: liveStats.totalHsAccounts ?? 0,
          totalActiveMemberships: liveStats.totalActiveMemberships ?? 0,
          institutionsWithPublishedSchedule: liveStats.institutionsWithPublishedSchedule ?? 0
        });
        setRecentInstitutions(instItems);
      } catch (err) {
        console.error('Failed to load dashboard metrics', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const statCards = [
    { label: 'Total Institutions', value: stats.totalInstitutions, icon: Building2, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Total Roster Records', value: stats.totalRosterRecords, icon: FileSpreadsheet, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Registered HS Accounts', value: stats.totalHsAccounts, icon: Users, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Active College Memberships', value: stats.totalActiveMemberships, icon: UserCheck, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Published Schedules', value: stats.institutionsWithPublishedSchedule, icon: CheckCircle2, color: 'text-amber-600', bg: 'bg-amber-50' }
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">System Overview</h1>
        <p className="text-sm text-slate-500 mt-1">
          Monitor medical college schedules, house surgeon rosters, and active rotation tracks.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {statCards.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div key={idx} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex items-center space-x-4">
              <div className={`p-3 rounded-xl ${stat.bg} ${stat.color} shrink-0`}>
                <Icon className="w-6 h-6" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block truncate">
                  {stat.label}
                </span>
                <span className="text-2xl font-bold text-slate-900">{loading ? '...' : stat.value}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Medical Institutions */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex justify-between items-center mb-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Medical Colleges & Hospitals</h2>
            <p className="text-xs text-slate-500 mt-0.5">Institutions currently configured with rotation tracks</p>
          </div>
          <Link
            to="/institutions"
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center space-x-1"
          >
            <span>Manage All Institutions</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {recentInstitutions.length === 0 ? (
          <div className="text-center py-10 text-slate-500">
            <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="font-medium">No institutions added yet</p>
            <Link
              to="/institutions"
              className="mt-3 inline-flex items-center px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm"
            >
              Add First Institution
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {recentInstitutions.map((inst) => (
              <div key={inst.id} className="py-3.5 flex items-center justify-between hover:bg-slate-50/50 rounded-lg px-2">
                <div>
                  <h3 className="font-semibold text-slate-900 text-sm">{inst.name}</h3>
                  <p className="text-xs text-slate-500">
                    {inst.shortName} • {inst.location}
                  </p>
                </div>
                <Link
                  to={`/institutions/${inst.id}`}
                  className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  Open College Console
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

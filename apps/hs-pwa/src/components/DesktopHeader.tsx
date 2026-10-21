import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Home, Calendar, Building2, User, Hospital } from 'lucide-react';

export const DesktopHeader: React.FC = () => {
  const { user, institution } = useAuth();

  const navItems = [
    { to: '/', label: 'Home', icon: Home },
    { to: '/calendar', label: 'Calendar', icon: Calendar },
    { to: '/directory', label: 'Department Directory', icon: Building2 },
    { to: '/profile', label: 'Profile', icon: User }
  ];

  return (
    <header className="hidden md:block bg-slate-900/90 backdrop-blur-md border-b border-slate-800 sticky top-0 z-30">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="bg-blue-600 text-white p-2 rounded-xl shadow-md shadow-blue-600/20">
            <Hospital className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-white text-base tracking-tight">HS Schedule</span>
              {institution?.shortName && (
                <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-full">
                  {institution.shortName}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 truncate max-w-[240px]">
              {institution?.name || 'Medical College'}
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center space-x-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`
                }
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* User Avatar */}
        <div className="flex items-center space-x-2.5 pl-4 border-l border-slate-800">
          <div className="w-8 h-8 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-xs">
            {user?.displayName ? user.displayName.charAt(0).toUpperCase() : 'Dr'}
          </div>
          <span className="text-xs font-semibold text-slate-200 truncate max-w-[140px]">
            {user?.displayName || 'House Surgeon'}
          </span>
        </div>
      </div>
    </header>
  );
};

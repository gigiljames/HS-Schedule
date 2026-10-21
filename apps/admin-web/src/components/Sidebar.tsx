import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Building2,
  Users,
  Hospital,
  LogOut,
  UserCircle,
  X,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';

interface SidebarProps {
  isOpen?: boolean; // Mobile open state
  isCollapsed?: boolean; // Desktop collapsed state
  onCloseMobile?: () => void;
  onToggleCollapse?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen = false,
  isCollapsed = false,
  onCloseMobile,
  onToggleCollapse
}) => {
  const { user, logout } = useAuth();

  const links = [
    { to: '/', label: 'Overview Dashboard', icon: LayoutDashboard },
    { to: '/institutions', label: 'Medical Institutions', icon: Building2 },
    { to: '/accounts', label: 'Registered HS Accounts', icon: Users }
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs md:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 bg-slate-900 text-slate-300 flex flex-col justify-between p-3.5 transition-all duration-300 ease-in-out md:static md:h-screen md:shrink-0 ${
          // Mobile responsive drawer positioning
          isOpen ? 'translate-x-0 w-64' : '-translate-x-full md:translate-x-0'
        } ${
          // Desktop width handling: retracted (w-20) vs expanded (w-64)
          isCollapsed ? 'md:w-20' : 'md:w-64'
        }`}
      >
        <div>
          {/* Top Logo & Header */}
          <div
            className={`flex items-center pb-5 mb-4 border-b border-slate-800 ${
              isCollapsed ? 'md:flex-col md:space-y-3 md:justify-center' : 'justify-between'
            }`}
          >
            <div className="flex items-center space-x-3">
              <div
                className="bg-blue-600 text-white p-2 rounded-xl shadow-sm shrink-0 flex items-center justify-center"
                title="HS Planner Admin Console"
              >
                <Hospital className="w-5 h-5" />
              </div>
              {/* Titles visible when expanded or on mobile drawer */}
              <div className={`${isCollapsed ? 'md:hidden' : 'block'} min-w-0`}>
                <span className="text-base font-bold text-white tracking-tight block truncate">
                  HS Planner
                </span>
                <span className="block text-[10px] font-semibold px-1.5 py-0.5 bg-blue-500/20 text-blue-300 rounded border border-blue-500/30 w-fit mt-0.5">
                  Admin Console
                </span>
              </div>
            </div>

            {/* Desktop Collapse / Expand Button */}
            <button
              onClick={onToggleCollapse}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer hidden md:flex items-center justify-center shrink-0"
              title={isCollapsed ? 'Expand sidebar' : 'Retract sidebar'}
              aria-label={isCollapsed ? 'Expand sidebar' : 'Retract sidebar'}
            >
              {isCollapsed ? (
                <PanelLeftOpen className="w-5 h-5 text-slate-300" />
              ) : (
                <PanelLeftClose className="w-5 h-5" />
              )}
            </button>

            {/* Mobile Close Button */}
            {onCloseMobile && (
              <button
                onClick={onCloseMobile}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors md:hidden"
                aria-label="Close navigation drawer"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5">
            {!isCollapsed && (
              <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 md:block hidden">
                Management
              </div>
            )}

            {links.map((link) => {
              const Icon = link.icon;
              return (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.to === '/'}
                  onClick={() => onCloseMobile?.()}
                  title={link.label}
                  className={({ isActive }) =>
                    `flex items-center rounded-xl font-medium transition-all relative group ${
                      isCollapsed
                        ? 'md:justify-center md:px-0 md:py-3 px-3 py-2.5 text-sm'
                        : 'px-3 py-2.5 text-sm'
                    } ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-sm font-semibold'
                        : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                    }`
                  }
                >
                  <Icon className={`w-5 h-5 shrink-0 ${isCollapsed ? 'md:mr-0 mr-3' : 'mr-3'}`} />
                  
                  {/* Label text: hidden when retracted on desktop */}
                  <span
                    className={`truncate transition-opacity duration-200 ${
                      isCollapsed ? 'md:hidden' : 'block'
                    }`}
                  >
                    {link.label}
                  </span>

                  {/* Tooltip on hover when retracted */}
                  {isCollapsed && (
                    <div className="hidden md:group-hover:flex absolute left-full ml-3 px-2.5 py-1.5 bg-slate-950 text-white text-xs font-medium rounded-lg whitespace-nowrap shadow-xl border border-slate-800 z-50 items-center pointer-events-none">
                      {link.label}
                    </div>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* User Info & Sign Out Footer */}
        <div className="pt-4 border-t border-slate-800 space-y-2.5">
          {/* User Profile Card */}
          <div
            className={`flex items-center rounded-xl px-2 py-1.5 relative group ${
              isCollapsed ? 'md:justify-center md:px-0' : 'space-x-3'
            }`}
          >
            <UserCircle className="w-8 h-8 text-slate-400 shrink-0" />
            <div className={`min-w-0 flex-1 ${isCollapsed ? 'md:hidden' : 'block'}`}>
              <p className="text-sm font-semibold text-white truncate">
                {user?.displayName || user?.username || 'Administrator'}
              </p>
              <p className="text-xs text-slate-400 truncate capitalize">{user?.role || 'admin'}</p>
            </div>

            {/* Hover tooltip for user name when retracted */}
            {isCollapsed && (
              <div className="hidden md:group-hover:flex flex-col absolute left-full ml-3 px-3 py-1.5 bg-slate-950 text-white text-xs rounded-lg whitespace-nowrap shadow-xl border border-slate-800 z-50 pointer-events-none">
                <span className="font-semibold">{user?.displayName || user?.username || 'Administrator'}</span>
                <span className="text-[10px] text-slate-400 capitalize">{user?.role || 'admin'}</span>
              </div>
            )}
          </div>

          {/* Sign Out Button */}
          <button
            onClick={() => logout()}
            className={`w-full flex items-center text-sm font-medium text-red-300 hover:text-white hover:bg-red-600/20 border border-red-500/20 rounded-xl transition-colors cursor-pointer relative group ${
              isCollapsed ? 'md:justify-center md:p-3 p-2.5' : 'justify-center px-3 py-2'
            }`}
            title="Sign Out"
          >
            <LogOut className={`w-4 h-4 shrink-0 ${isCollapsed ? 'md:mr-0 mr-2' : 'mr-2'}`} />
            <span className={`${isCollapsed ? 'md:hidden' : 'block'}`}>Sign Out</span>

            {/* Hover tooltip for sign out when retracted */}
            {isCollapsed && (
              <div className="hidden md:group-hover:flex absolute left-full ml-3 px-2.5 py-1.5 bg-slate-950 text-red-200 text-xs font-medium rounded-lg whitespace-nowrap shadow-xl border border-slate-800 z-50 pointer-events-none">
                Sign Out
              </div>
            )}
          </button>
        </div>
      </aside>
    </>
  );
};

import React from 'react';
import { Hospital, Menu } from 'lucide-react';

interface NavbarProps {
  onOpenSidebar: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenSidebar }) => {
  return (
    <header className="md:hidden bg-white border-b border-slate-200 sticky top-0 z-30 px-4 py-3 flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <button
          onClick={onOpenSidebar}
          className="p-1.5 -ml-1.5 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg focus:outline-none"
          aria-label="Open navigation menu"
        >
          <Menu className="w-6 h-6" />
        </button>
        <div className="flex items-center space-x-2">
          <div className="bg-blue-600 text-white p-1.5 rounded-md shadow-xs">
            <Hospital className="w-4 h-4" />
          </div>
          <span className="font-bold text-slate-900 tracking-tight text-sm">HS Planner</span>
          <span className="text-[10px] font-semibold px-1.5 py-0.2 bg-blue-50 text-blue-700 rounded border border-blue-200">
            Admin
          </span>
        </div>
      </div>
    </header>
  );
};

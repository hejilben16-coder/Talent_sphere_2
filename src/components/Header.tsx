import React, { useState } from 'react';
import {
  Bell,
  Sun,
  Moon,
  LogOut,
  User as UserIcon,
  ShieldCheck,
  ChevronDown,
  Sparkles
} from 'lucide-react';
import { User } from '../types';

interface HeaderProps {
  user: User | null;
  onLogout: () => void;
  activeTab: string;
  theme: 'dark' | 'light';
  setTheme: (theme: 'dark' | 'light') => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  onLogout,
  activeTab,
  theme,
  setTheme
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const formatTabName = (tab: string) => {
    return tab
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const notifications = [
    { id: 1, title: 'New Exam Generated', time: '10 mins ago', type: 'exam' },
    { id: 2, title: 'PDF Indexing Complete', time: '1 hour ago', type: 'doc' },
    { id: 3, title: 'Study Coach Weekly Update Ready', time: '3 hours ago', type: 'coach' }
  ];

  return (
    <header className="h-16 border-b border-slate-200 bg-white/95 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-10 shadow-xs">
      {/* Title Breadcrumb */}
      <div className="flex items-center gap-3">
        <div className="w-2.5 h-2.5 rounded-full bg-indigo-600 shadow-sm shadow-indigo-300"></div>
        <h2 className="text-lg font-bold text-slate-800 tracking-wide">
          {formatTabName(activeTab)}
        </h2>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-4">
        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-indigo-600 animate-pulse"></span>
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 rounded-2xl bg-white border border-slate-200 shadow-xl p-4 z-30">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <span className="font-semibold text-sm text-slate-800">Notifications</span>
                <span className="text-xs text-indigo-600 font-semibold cursor-pointer">Clear All</span>
              </div>
              <div className="mt-3 space-y-2 max-h-60 overflow-y-auto">
                {notifications.map((n) => (
                  <div key={n.id} className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 transition border border-slate-100">
                    <p className="text-xs font-semibold text-slate-800">{n.title}</p>
                    <span className="text-[10px] text-slate-500">{n.time}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User Pill */}
        {user ? (
          <div className="relative">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-3 pl-3 pr-2 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 transition"
            >
              <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white text-xs font-bold shadow-xs">
                {user.name.charAt(0)}
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-xs font-bold text-slate-800 leading-tight">{user.name}</p>
                <p className="text-[10px] text-indigo-600 uppercase tracking-wider font-extrabold">
                  {user.role}
                </p>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-500" />
            </button>

            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white border border-slate-200 shadow-xl p-2 z-30">
                <div className="px-3 py-2 border-b border-slate-100">
                  <p className="text-xs font-bold text-slate-800">{user.name}</p>
                  <p className="text-xs text-slate-500 truncate">{user.email}</p>
                </div>
                <div className="py-1">
                  <div className="px-3 py-1.5 flex items-center gap-2 text-xs text-slate-600">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Role: <strong className="text-slate-800 uppercase">{user.role}</strong></span>
                  </div>
                </div>
                <div className="pt-1 border-t border-slate-100">
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      onLogout();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 transition"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Log Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Guest User</span>
          </div>
        )}
      </div>
    </header>
  );
};

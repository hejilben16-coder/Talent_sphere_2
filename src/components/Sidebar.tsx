import React from 'react';
import {
  LayoutDashboard,
  Bot,
  FileText,
  FileQuestion,
  GraduationCap,
  BarChart3,
  Users,
  ShieldAlert,
  Settings,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  BookOpen,
  Calendar,
  Mic,
  Megaphone
} from 'lucide-react';
import { UserRole } from '../types';

interface SidebarProps {
  role: UserRole;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  role,
  activeTab,
  setActiveTab,
  collapsed,
  setCollapsed
}) => {
  const adminNav = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'study-plan', label: 'Weekly Study Plans', icon: Calendar },
    { id: 'announcements', label: 'Announcements', icon: Megaphone },
    { id: 'voice-interview', label: 'AI Voice Interview', icon: Mic },
    { id: 'ai-assistant', label: 'AI Assistant', icon: Bot },
    { id: 'pdf-manager', label: 'PDF Knowledge Base', icon: FileText },
    { id: 'exam-generator', label: 'Exam Generator', icon: FileQuestion },
    { id: 'user-management', label: 'User Management', icon: Users },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'activity-logs', label: 'Activity Logs', icon: ShieldAlert },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  const studentNav = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'study-plan', label: 'Weekly Study Plans', icon: Calendar },
    { id: 'announcements', label: 'Announcements', icon: Megaphone },
    { id: 'voice-interview', label: 'AI Voice Interview', icon: Mic },
    { id: 'ai-assistant', label: 'AI Assistant', icon: Bot },
    { id: 'take-exams', label: 'Exams & Quizzes', icon: FileQuestion },
    { id: 'study-coach', label: 'AI Study Coach', icon: GraduationCap },
    { id: 'analytics', label: 'My Progress', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  const items = role === 'admin' ? adminNav : studentNav;

  return (
    <aside
      className={`relative border-r border-slate-200 bg-white transition-all duration-300 flex flex-col z-20 shadow-xs ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 px-4 flex items-center justify-between border-b border-slate-200">
        {!collapsed && (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-button flex items-center justify-center text-white shadow-md shadow-indigo-100">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h1 className="font-extrabold text-slate-800 text-base leading-tight tracking-wide">
                Talent Sphere
              </h1>
              <p className="text-[10px] text-indigo-600 font-extrabold tracking-wider uppercase">
                AI LMS PLATFORM
              </p>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="mx-auto w-10 h-10 rounded-xl gradient-button flex items-center justify-center text-white shadow-md">
            <Sparkles className="w-5 h-5" />
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Role Tag */}
      {!collapsed && (
        <div className="px-4 py-3">
          <div className="px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-between">
            <span className="text-xs text-slate-600 font-medium">Access Mode</span>
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-md">
              {role}
            </span>
          </div>
        </div>
      )}

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
              title={collapsed ? item.label : undefined}
            >
              <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-white' : 'text-slate-500'}`} />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* System Footer Info */}
      {!collapsed && (
        <div className="p-4 border-t border-slate-200 text-xs text-slate-500 bg-slate-50/50">
          <div className="flex items-center justify-between mb-1">
            <span>RAG Engine</span>
            <span className="text-slate-800 font-mono font-semibold">Gemini 2.5</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Status</span>
            <span className="text-emerald-600 font-bold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              Active
            </span>
          </div>
        </div>
      )}
    </aside>
  );
};

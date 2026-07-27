import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { AuthModal } from './components/AuthModal';
import { PDFManager } from './components/PDFManager';
import { AIAssistant } from './components/AIAssistant';
import { ExamGenerator } from './components/ExamGenerator';
import { ExamTakingView } from './components/ExamTakingView';
import { StudyCoachView } from './components/StudyCoachView';
import { AnalyticsView } from './components/AnalyticsView';
import { UserManagementView } from './components/UserManagementView';
import { ActivityLogsView } from './components/ActivityLogsView';
import { SettingsView } from './components/SettingsView';
import { User, UserRole } from './types';
import {
  Sparkles,
  BookOpen,
  FileQuestion,
  GraduationCap,
  Users,
  ShieldCheck,
  BarChart3,
  ArrowRight,
  TrendingUp,
  FileText
} from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);

  // Auto-authenticate default demo user on first load
  useEffect(() => {
    const savedToken = localStorage.getItem('ts_token');
    if (savedToken) {
      fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${savedToken}` }
      })
        .then((res) => {
          if (res.ok) return res.json();
          throw new Error('Session expired');
        })
        .then((data) => {
          setUser(data.user);
          setToken(savedToken);
        })
        .catch(() => {
          localStorage.removeItem('ts_token');
          autoLoginDemoAdmin();
        });
    } else {
      autoLoginDemoAdmin();
    }
  }, []);

  const autoLoginDemoAdmin = () => {
    fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@talentsphere.ai',
        password: 'AdminPass123!'
      })
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.user && data.token) {
          setUser(data.user);
          setToken(data.token);
          localStorage.setItem('ts_token', data.token);
        }
      })
      .catch(() => setShowAuthModal(true));
  };

  const handleLoginSuccess = (loggedInUser: User, sessionToken: string) => {
    setUser(loggedInUser);
    setToken(sessionToken);
    localStorage.setItem('ts_token', sessionToken);
    setShowAuthModal(false);
    setActiveTab('dashboard');
  };

  const handleLogout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('ts_token');
    setShowAuthModal(true);
  };

  const switchRoleQuickly = async (newRole: UserRole) => {
    const email = newRole === 'admin' ? 'admin@talentsphere.ai' : 'student@talentsphere.ai';
    const password = newRole === 'admin' ? 'AdminPass123!' : 'StudentPass123!';

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (res.ok) {
        setUser(data.user);
        setToken(data.token);
        localStorage.setItem('ts_token', data.token);
        setActiveTab('dashboard');
      }
    } catch (_) {}
  };

  if (!user || !token) {
    return <AuthModal onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className={`min-h-screen flex bg-slate-950 text-slate-100 font-sans antialiased selection:bg-indigo-500 selection:text-white`}>
      {/* Sidebar Navigation Shell */}
      <Sidebar
        role={user.role}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
      />

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          user={user}
          onLogout={handleLogout}
          activeTab={activeTab}
          theme={theme}
          setTheme={setTheme}
        />

        {/* View Switcher Container */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto max-w-7xl w-full mx-auto space-y-6">
          {/* Quick Role Switcher Banner */}
          <div className="p-3 rounded-2xl bg-indigo-950/40 border border-indigo-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-indigo-300">
              <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>
                Active Session: <strong className="text-white uppercase font-bold">{user.name} ({user.role})</strong>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Switch Demo Perspective:</span>
              <button
                onClick={() => switchRoleQuickly('admin')}
                className={`px-2.5 py-1 rounded-lg font-bold border transition ${
                  user.role === 'admin'
                    ? 'bg-purple-600 text-white border-purple-500'
                    : 'bg-slate-800 text-slate-400 hover:text-white border-slate-700'
                }`}
              >
                Admin Mode
              </button>
              <button
                onClick={() => switchRoleQuickly('student')}
                className={`px-2.5 py-1 rounded-lg font-bold border transition ${
                  user.role === 'student'
                    ? 'bg-indigo-600 text-white border-indigo-500'
                    : 'bg-slate-800 text-slate-400 hover:text-white border-slate-700'
                }`}
              >
                Student Mode
              </button>
            </div>
          </div>

          {/* Active Tab Router */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* SaaS Hero Banner */}
              <div className="p-8 rounded-3xl gradient-header text-white relative overflow-hidden shadow-2xl">
                <div className="relative z-10 max-w-2xl space-y-3">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-semibold">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Next-Gen AI Learning Management</span>
                  </div>
                  <h1 className="text-3xl font-extrabold tracking-tight">
                    Welcome back, {user.name}
                  </h1>
                  <p className="text-sm opacity-90 leading-relaxed">
                    Talent Sphere AI uses Retrieval-Augmented Generation (RAG) and Gemini AI to turn custom PDFs into streaming chat assistants, automated assessments, and personalized study coach timelines.
                  </p>
                </div>
              </div>

              {/* Action Grid Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div
                  onClick={() => setActiveTab(user.role === 'admin' ? 'pdf-manager' : 'pdf-chat')}
                  className="p-6 rounded-3xl bg-slate-900 border border-slate-800 hover:border-indigo-500/50 transition cursor-pointer group space-y-3"
                >
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center group-hover:scale-110 transition">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-slate-100 text-base">PDF Knowledge Base</h3>
                  <p className="text-xs text-slate-400">
                    Upload course documents, extract knowledge chunks, and query content with source citations.
                  </p>
                  <span className="text-xs font-bold text-indigo-400 flex items-center gap-1 group-hover:translate-x-1 transition pt-2">
                    Open Knowledge Store <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>

                <div
                  onClick={() => setActiveTab(user.role === 'admin' ? 'exam-generator' : 'take-exams')}
                  className="p-6 rounded-3xl bg-slate-900 border border-slate-800 hover:border-purple-500/50 transition cursor-pointer group space-y-3"
                >
                  <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center group-hover:scale-110 transition">
                    <FileQuestion className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-slate-100 text-base">Exams & Assessments</h3>
                  <p className="text-xs text-slate-400">
                    Generate exams with Bloom's taxonomy levels and auto-grading evaluation feedback.
                  </p>
                  <span className="text-xs font-bold text-purple-400 flex items-center gap-1 group-hover:translate-x-1 transition pt-2">
                    Launch Assessment <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>

                <div
                  onClick={() => setActiveTab(user.role === 'student' ? 'study-coach' : 'analytics')}
                  className="p-6 rounded-3xl bg-slate-900 border border-slate-800 hover:border-emerald-500/50 transition cursor-pointer group space-y-3"
                >
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition">
                    <GraduationCap className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-slate-100 text-base">AI Study Coach</h3>
                  <p className="text-xs text-slate-400">
                    Review weak knowledge gaps, study streaks, interactive flashcards, and personalized schedules.
                  </p>
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1 group-hover:translate-x-1 transition pt-2">
                    View Study Plan <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>

              {/* RAG Assistant Quick Launcher */}
              <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-base text-slate-100">AI Assistant Assistant</h3>
                  <button
                    onClick={() => setActiveTab('ai-assistant')}
                    className="px-4 py-2 rounded-xl gradient-button text-white text-xs font-semibold shadow-md"
                  >
                    Launch Full Screen Chat
                  </button>
                </div>
                <AIAssistant token={token} />
              </div>
            </div>
          )}

          {activeTab === 'ai-assistant' && <AIAssistant token={token} />}
          {(activeTab === 'pdf-manager' || activeTab === 'pdf-chat') && <PDFManager token={token} />}
          {activeTab === 'exam-generator' && <ExamGenerator token={token} onExamCreated={() => setActiveTab('take-exams')} />}
          {activeTab === 'take-exams' && <ExamTakingView token={token} />}
          {activeTab === 'study-coach' && <StudyCoachView token={token} />}
          {activeTab === 'analytics' && <AnalyticsView role={user.role} token={token} />}
          {activeTab === 'user-management' && <UserManagementView token={token} />}
          {activeTab === 'activity-logs' && <ActivityLogsView token={token} />}
          {activeTab === 'settings' && <SettingsView token={token} />}
        </main>
      </div>

      {showAuthModal && <AuthModal onLoginSuccess={handleLoginSuccess} />}
    </div>
  );
}

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
import { StudyPlanView } from './components/StudyPlanView';
import { VoiceInterviewView } from './components/VoiceInterviewView';
import { AnnouncementsView } from './components/AnnouncementsView';
import { VoiceTutorView } from './components/VoiceTutorView';
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
  FileText,
  Radio
} from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [announcement, setAnnouncement] = useState<{ id: string; title: string; message: string } | null>(null);
  const [adminAnnouncementTitle, setAdminAnnouncementTitle] = useState('');
  const [adminAnnouncementMessage, setAdminAnnouncementMessage] = useState('');
  const [announcementStatus, setAnnouncementStatus] = useState<string | null>(null);

  // Authenticate user on load
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
          setUser(null);
          setToken(null);
          setShowAuthModal(true);
        });
    } else {
      setUser(null);
      setToken(null);
      setShowAuthModal(true);
    }
  }, []);

<<<<<<< Updated upstream
=======
  useEffect(() => {
    // Fetch latest announcement for banner
    const tokenVal = localStorage.getItem('ts_token');
    if (!tokenVal) return;
    fetch('/api/notifications', { headers: { Authorization: `Bearer ${tokenVal}` } })
      .then((r) => r.json())
      .then((notes: any[]) => {
        if (Array.isArray(notes) && notes.length > 0) {
          setAnnouncement(notes[0]);
        }
      })
      .catch(() => {});
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

>>>>>>> Stashed changes
  const handleLoginSuccess = (loggedInUser: User, sessionToken: string) => {
    setUser(loggedInUser);
    setToken(sessionToken);
    localStorage.setItem('ts_token', sessionToken);
    setShowAuthModal(false);
    setActiveTab('dashboard');
  };

  const handleLogout = async () => {
    if (token) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch (_) {}
    }
    setUser(null);
    setToken(null);
    localStorage.removeItem('ts_token');
    setShowAuthModal(true);
  };

<<<<<<< Updated upstream
=======
  const handleCreateAnnouncement = async () => {
    if (!adminAnnouncementTitle.trim() || !adminAnnouncementMessage.trim()) {
      setAnnouncementStatus('Please enter both title and message for the announcement.');
      return;
    }

    try {
      const res = await fetch('/api/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title: adminAnnouncementTitle.trim(),
          message: adminAnnouncementMessage.trim()
        })
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to post announcement');
      }

      const note = await res.json();
      setAnnouncement(note);
      setAdminAnnouncementTitle('');
      setAdminAnnouncementMessage('');
      setAnnouncementStatus('Announcement posted successfully.');
      setTimeout(() => setAnnouncementStatus(null), 5000);
    } catch (err: any) {
      setAnnouncementStatus(err.message || 'Unable to send announcement.');
    }
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

>>>>>>> Stashed changes
  if (!user || !token) {
    return <AuthModal onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className={`min-h-screen flex bg-slate-50 text-slate-900 font-sans antialiased selection:bg-indigo-600 selection:text-white`}>
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
<<<<<<< Updated upstream
=======
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
          {announcement && (
            <div className="p-4 rounded-2xl bg-emerald-900/60 border border-emerald-800/40 text-emerald-50 text-sm">
              <strong>{announcement.title}</strong> — {announcement.message}
            </div>
          )}

          {user.role === 'admin' && (
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-100">Admin Announcement</h3>
                  <p className="text-xs text-slate-400">
                    Share a broadcast message with all users. Announcements appear in the dashboard banner.
                  </p>
                </div>
                <button
                  onClick={handleCreateAnnouncement}
                  className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 text-xs font-semibold hover:bg-emerald-400 transition"
                >
                  Post Announcement
                </button>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <input
                  value={adminAnnouncementTitle}
                  onChange={(e) => setAdminAnnouncementTitle(e.target.value)}
                  placeholder="Announcement title"
                  className="w-full px-4 py-3 rounded-2xl bg-slate-800 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-emerald-500 transition"
                />
                <textarea
                  value={adminAnnouncementMessage}
                  onChange={(e) => setAdminAnnouncementMessage(e.target.value)}
                  placeholder="Announcement message"
                  rows={2}
                  className="w-full px-4 py-3 rounded-2xl bg-slate-800 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-emerald-500 transition"
                />
              </div>
              {announcementStatus && (
                <div className="text-xs text-slate-300">{announcementStatus}</div>
              )}
            </div>
          )}

>>>>>>> Stashed changes
          {/* Active Tab Router */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* SaaS Hero Banner */}
              <div className="p-8 rounded-3xl gradient-button text-white relative overflow-hidden shadow-lg shadow-indigo-100">
                <div className="relative z-10 max-w-2xl space-y-3">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-semibold">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Next-Gen AI Learning Management</span>
                  </div>
                  <h1 className="text-3xl font-extrabold tracking-tight">
                    Welcome back, {user.name}
                  </h1>
                  <p className="text-sm opacity-90 leading-relaxed">
                    Talent Sphere AI powers your 7-day study package, RAG PDF materials, hands-free AI voice interviews, and automated performance evaluation.
                  </p>
                </div>
              </div>

              {/* Action Grid Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div
                  onClick={() => setActiveTab(user.role === 'admin' ? 'pdf-manager' : 'study-plan')}
                  className="p-6 rounded-3xl bg-white border border-slate-200/90 hover:border-indigo-500 shadow-xs hover:shadow-md transition cursor-pointer group space-y-3"
                >
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-slate-800 text-base">
                    {user.role === 'admin' ? 'PDF Knowledge Base' : '7-Day Study Package'}
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    {user.role === 'admin'
                      ? 'Upload course documents, extract knowledge chunks, and query content with source citations.'
                      : 'Access course PDF materials, module guides, and daily lessons unlocked sequentially.'}
                  </p>
                  <span className="text-xs font-bold text-indigo-600 flex items-center gap-1 group-hover:translate-x-1 transition pt-2">
                    {user.role === 'admin' ? 'Open Knowledge Store' : 'View Study Package'} <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>

                <div
                  onClick={() => setActiveTab('voice-tutor')}
                  className="p-6 rounded-3xl bg-white border border-slate-200/90 hover:border-blue-500 shadow-xs hover:shadow-md transition cursor-pointer group space-y-3"
                >
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition">
                    <Radio className="w-6 h-6 animate-pulse" />
                  </div>
                  <h3 className="font-bold text-slate-800 text-base">RAG Voice Tutor</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Bidirectional real-time Gemini Live API audio tutoring grounded strictly in unlocked materials.
                  </p>
                  <span className="text-xs font-bold text-blue-600 flex items-center gap-1 group-hover:translate-x-1 transition pt-2">
                    Start Voice Session <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>

                <div
                  onClick={() => setActiveTab(user.role === 'admin' ? 'exam-generator' : 'take-exams')}
                  className="p-6 rounded-3xl bg-white border border-slate-200/90 hover:border-purple-500 shadow-xs hover:shadow-md transition cursor-pointer group space-y-3"
                >
                  <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-110 transition">
                    <FileQuestion className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-slate-800 text-base">Exams & Assessments</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Generate exams with Bloom's taxonomy levels and auto-grading evaluation feedback.
                  </p>
                  <span className="text-xs font-bold text-purple-600 flex items-center gap-1 group-hover:translate-x-1 transition pt-2">
                    Launch Assessment <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>

                <div
                  onClick={() => setActiveTab('voice-interview')}
                  className="p-6 rounded-3xl bg-white border border-slate-200/90 hover:border-emerald-500 shadow-xs hover:shadow-md transition cursor-pointer group space-y-3"
                >
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition">
                    <GraduationCap className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-slate-800 text-base">
                    {user.role === 'admin' ? 'Voice Interview Control' : 'AI Voice Interview'}
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    {user.role === 'admin'
                      ? 'Review student voice interview recordings, scores, and manage interview question bank.'
                      : 'Take the real-time hands-free technical voice interview with speech synthesis.'}
                  </p>
                  <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 group-hover:translate-x-1 transition pt-2">
                    {user.role === 'admin' ? 'View Candidate Scores' : 'Start Voice Interview'} <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>

              {/* RAG Assistant Quick Launcher */}
              <div className="p-8 rounded-3xl bg-white border border-slate-200/90 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-base text-slate-800">RAG AI Assistant</h3>
                  <button
                    onClick={() => setActiveTab('ai-assistant')}
                    className="px-4 py-2 rounded-xl gradient-button text-white text-xs font-bold shadow-md shadow-indigo-100"
                  >
                    Launch Full Screen Chat
                  </button>
                </div>
<<<<<<< Updated upstream
                <AIAssistant token={token} userRole={user.role} />
=======
                <AIAssistant token={token} role={user.role} />
>>>>>>> Stashed changes
              </div>
            </div>
          )}

<<<<<<< Updated upstream
          {activeTab === 'voice-tutor' && <VoiceTutorView user={user} token={token || ''} />}
          {activeTab === 'ai-assistant' && <AIAssistant token={token} userRole={user.role} />}
          {activeTab === 'study-plan' && <StudyPlanView token={token} userRole={user.role} />}
          {activeTab === 'announcements' && <AnnouncementsView token={token} userRole={user.role} />}
          {activeTab === 'voice-interview' && (
            <VoiceInterviewView token={token} userRole={user.role} userName={user.name} userEmail={user.email} />
          )}
          {(activeTab === 'pdf-manager' || activeTab === 'pdf-chat') && (
            user.role === 'admin' ? <PDFManager token={token} /> : <StudyPlanView token={token} />
          )}
=======
          {activeTab === 'ai-assistant' && <AIAssistant token={token} role={user.role} />}
          {activeTab === 'pdf-manager' && <PDFManager token={token} role={user.role} />}
          {activeTab === 'pdf-chat' && <AIAssistant token={token} role={user.role} />}
>>>>>>> Stashed changes
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

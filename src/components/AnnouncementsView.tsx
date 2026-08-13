import React, { useState, useEffect } from 'react';
import {
  Megaphone,
  Plus,
  Pin,
  Trash2,
  Tag,
  Calendar,
  User,
  Search,
  Filter,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  X,
  Bell
} from 'lucide-react';
import { Announcement, UserRole } from '../types';

interface AnnouncementsViewProps {
  token: string | null;
  userRole: UserRole;
}

export const AnnouncementsView: React.FC<AnnouncementsViewProps> = ({ token, userRole }) => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState<string>('');
  const [content, setContent] = useState<string>('');
  const [category, setCategory] = useState<'Important' | 'Exam Notice' | 'Course Update' | 'Maintenance' | 'General'>('General');
  const [targetRole, setTargetRole] = useState<'all' | 'student' | 'admin'>('all');
  const [isPinned, setIsPinned] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/announcements', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAnnouncements(data);
      }
    } catch (e) {
      console.error('Failed to fetch announcements', e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setError('Title and content are required.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/announcements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title,
          content,
          category,
          targetRole,
          isPinned
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to publish announcement');
      }

      setSuccess('Announcement broadcasted successfully to students!');
      setTitle('');
      setContent('');
      setIsPinned(false);
      setShowCreateModal(false);
      fetchAnnouncements();
    } catch (err: any) {
      setError(err.message || 'An error occurred while publishing announcement.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this announcement?')) return;
    try {
      const res = await fetch(`/api/admin/announcements/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setSuccess('Announcement removed.');
        fetchAnnouncements();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const filteredAnnouncements = announcements.filter((a) => {
    const matchesSearch =
      a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || a.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'Important':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'Exam Notice':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'Course Update':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'Maintenance':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 md:p-8 rounded-3xl bg-white border border-slate-200/90 shadow-sm relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs tracking-wider uppercase mb-1">
            <Megaphone className="w-4 h-4" />
            <span>Platform Broadcast Center</span>
          </div>
          <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">Announcements & Updates</h2>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
            {userRole === 'admin'
              ? 'Broadcast platform updates, exam alerts, weekly study plan schedules, and announcements to enrolled students.'
              : 'Stay informed with live broadcasts, exam notices, course schedule updates, and system maintenance alerts.'}
          </p>
        </div>

        {userRole === 'admin' && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-5 py-2.5 rounded-xl gradient-button text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-indigo-100 transition shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>New Announcement</span>
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Controls Bar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 w-full max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search announcements by keyword..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-800 text-xs font-medium focus:outline-none focus:bg-white focus:border-indigo-600 transition"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-700 text-xs font-bold focus:outline-none focus:border-indigo-600 transition"
          >
            <option value="all">All Categories</option>
            <option value="Important">Important</option>
            <option value="Course Update">Course Update</option>
            <option value="Exam Notice">Exam Notice</option>
            <option value="Maintenance">Maintenance</option>
            <option value="General">General</option>
          </select>
        </div>
      </div>

      {/* Announcements Feed */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 text-xs font-medium">Loading broadcasts...</div>
      ) : filteredAnnouncements.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200/90 text-slate-400 text-xs space-y-2">
          <Bell className="w-8 h-8 mx-auto text-slate-300" />
          <p className="font-bold text-slate-700">No announcements match your search criteria.</p>
          <p className="text-slate-500">Check back later for course updates from your instructor.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAnnouncements.map((ann) => (
            <div
              key={ann.id}
              className={`p-6 rounded-3xl bg-white border transition shadow-xs relative overflow-hidden ${
                ann.isPinned ? 'border-indigo-300 shadow-md ring-1 ring-indigo-200' : 'border-slate-200/90 hover:border-slate-300'
              }`}
            >
              {ann.isPinned && (
                <div className="absolute top-0 right-0 bg-indigo-600 text-white text-[10px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-bl-xl flex items-center gap-1 shadow-xs">
                  <Pin className="w-3 h-3 fill-current" />
                  <span>Pinned Broadcast</span>
                </div>
              )}

              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold border ${getCategoryColor(
                      ann.category
                    )}`}
                  >
                    {ann.category}
                  </span>
                  <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(ann.createdAt).toLocaleDateString()} at{' '}
                    {new Date(ann.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className="text-xs text-slate-400 font-medium flex items-center gap-1 ml-auto">
                    <User className="w-3.5 h-3.5" />
                    Posted by {ann.createdByName}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-slate-800 tracking-tight">{ann.title}</h3>

                <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">{ann.content}</p>

                {userRole === 'admin' && (
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-end">
                    <button
                      onClick={() => handleDeleteAnnouncement(ann.id)}
                      className="px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-bold flex items-center gap-1.5 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Admin Modal for Creating Announcement */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-indigo-700 font-extrabold text-sm">
                <Megaphone className="w-5 h-5 text-indigo-600" />
                <span>Broadcast New Announcement</span>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAnnouncement} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Announcement Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Weekly Live Voice Q&A Session Scheduled for Friday"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 font-medium focus:outline-none focus:bg-white focus:border-indigo-600 transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Category Tag</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 font-bold focus:outline-none focus:border-indigo-600 transition"
                  >
                    <option value="General">General</option>
                    <option value="Important">Important</option>
                    <option value="Course Update">Course Update</option>
                    <option value="Exam Notice">Exam Notice</option>
                    <option value="Maintenance">Maintenance</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Target Audience</label>
                  <select
                    value={targetRole}
                    onChange={(e) => setTargetRole(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 font-bold focus:outline-none focus:border-indigo-600 transition"
                  >
                    <option value="all">All Users (Students & Admins)</option>
                    <option value="student">Students Only</option>
                    <option value="admin">Admins Only</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Message Content *</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Write the detailed broadcast message for students..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 font-medium focus:outline-none focus:bg-white focus:border-indigo-600 transition"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="pinCheck"
                  checked={isPinned}
                  onChange={(e) => setIsPinned(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                />
                <label htmlFor="pinCheck" className="text-xs font-bold text-slate-700 cursor-pointer flex items-center gap-1">
                  <Pin className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Pin to top of student announcements feed</span>
                </label>
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl gradient-button text-white font-bold shadow-md shadow-indigo-100 transition flex items-center gap-2"
                >
                  <Megaphone className="w-4 h-4" />
                  <span>{submitting ? 'Broadcasting...' : 'Publish Announcement'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

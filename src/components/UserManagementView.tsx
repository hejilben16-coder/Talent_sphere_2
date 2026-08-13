import React, { useState, useEffect } from 'react';
import {
  Users,
  Shield,
  User as UserIcon,
  Trash2,
  Key,
  CheckCircle2,
  Ban,
  Search,
  Plus,
  Mail,
  X,
  AlertCircle,
  Copy,
  Sparkles,
  Send,
  Settings,
  ExternalLink,
  RefreshCw
} from 'lucide-react';
import { User, UserRole } from '../types';

interface UserManagementViewProps {
  token: string;
}

export const UserManagementView: React.FC<UserManagementViewProps> = ({ token }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  // Modal & Tab states
  const [activeTab, setActiveTab] = useState<'directory' | 'smtp'>('directory');
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [showCredsResultModal, setShowCredsResultModal] = useState<boolean>(false);
  const [credsResultData, setCredsResultData] = useState<{
    user: User;
    password?: string;
    emailSent: boolean;
    emailMessage?: string;
    previewUrl?: string;
  } | null>(null);

  // Create Form fields
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [role, setRole] = useState<UserRole>('student');
  const [passwordMode, setPasswordMode] = useState<'auto' | 'custom'>('auto');
  const [customPassword, setCustomPassword] = useState<string>('');
  const [sendEmailNotice, setSendEmailNotice] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  // SMTP Configuration Form
  const [smtpHost, setSmtpHost] = useState<string>('');
  const [smtpPort, setSmtpPort] = useState<number>(587);
  const [smtpUser, setSmtpUser] = useState<string>('');
  const [smtpPass, setSmtpPass] = useState<string>('');
  const [smtpFrom, setSmtpFrom] = useState<string>('');
  const [testingSmtp, setTestingSmtp] = useState<boolean>(false);
  const [savingSmtp, setSavingSmtp] = useState<boolean>(false);
  const [smtpFeedback, setSmtpFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setUsers(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSmtpSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        if (data.smtpHost) setSmtpHost(data.smtpHost);
        if (data.smtpPort) setSmtpPort(data.smtpPort);
        if (data.smtpUser) setSmtpUser(data.smtpUser);
        if (data.smtpPass) setSmtpPass(data.smtpPass);
        if (data.smtpFrom) setSmtpFrom(data.smtpFrom);
      }
    } catch (_) {}
  };

  useEffect(() => {
    fetchUsers();
    fetchSmtpSettings();
  }, [token]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      setError('Name and Email are required.');
      return;
    }

    setSubmitting(true);
    setError(null);
    setActionFeedback(null);

    try {
      const res = await fetch('/api/admin/users/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          role,
          password: passwordMode === 'custom' ? customPassword : undefined,
          sendEmailNotice
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create user');
      }

      setCredsResultData({
        user: data.user,
        password: data.generatedPassword,
        emailSent: data.emailSent,
        emailMessage: data.emailMessage,
        previewUrl: data.previewUrl
      });

      setShowCreateModal(false);
      setShowCredsResultModal(true);
      setName('');
      setEmail('');
      setCustomPassword('');
      fetchUsers();
    } catch (err: any) {
      setError(err.message || 'Error creating user');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendCredentials = async (user: User) => {
    if (!confirm(`Generate new credentials and send email to ${user.email}?`)) return;

    try {
      const res = await fetch(`/api/admin/users/${user.id}/send-credentials`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({})
      });

      const data = await res.json();
      if (res.ok) {
        setCredsResultData({
          user,
          password: data.generatedPassword,
          emailSent: data.success,
          emailMessage: data.message,
          previewUrl: data.previewUrl
        });
        setShowCredsResultModal(true);
      } else {
        alert(data.error || 'Failed to send credentials');
      }
    } catch (e) {
      console.error(e);
      alert('Error contacting credentials service');
    }
  };

  const handleUpdateStatus = async (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    try {
      await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      fetchUsers();
    } catch (_) {}
  };

  const handleToggleRole = async (userId: string, currentRole: UserRole) => {
    const newRole: UserRole = currentRole === 'admin' ? 'student' : 'admin';
    try {
      await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ role: newRole })
      });
      fetchUsers();
    } catch (_) {}
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to permanently delete user "${userName}"?`)) return;
    setActionFeedback(null);
    setDeletingUserId(userId);

    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(userId)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setUsers((prev) => prev.filter((u) => u.id !== userId));
        setActionFeedback({
          type: 'success',
          message: data.message || `User "${userName}" deleted successfully.`
        });

        if (data.isSelfDelete) {
          setTimeout(() => {
            window.location.reload();
          }, 1500);
        }
      } else {
        setActionFeedback({
          type: 'error',
          message: data.error || 'Failed to delete user.'
        });
      }
    } catch (err) {
      console.error('Error deleting user:', err);
      setActionFeedback({
        type: 'error',
        message: 'Error connecting to database to delete user.'
      });
    } finally {
      setDeletingUserId(null);
    }
  };

  const handleSaveSmtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSmtp(true);
    setSmtpFeedback(null);

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          smtpHost: smtpHost.trim(),
          smtpPort: Number(smtpPort) || 587,
          smtpUser: smtpUser.trim(),
          smtpPass: smtpPass.trim(),
          smtpFrom: smtpFrom.trim() || undefined
        })
      });

      if (res.ok) {
        setSmtpFeedback({
          type: 'success',
          message: 'SMTP Email Configuration saved successfully! Platform will now dispatch real emails via this server.'
        });
      } else {
        throw new Error('Failed to save SMTP settings.');
      }
    } catch (err: any) {
      setSmtpFeedback({ type: 'error', message: err.message || 'Error saving SMTP configuration.' });
    } finally {
      setSavingSmtp(false);
    }
  };

  const handleTestSmtp = async () => {
    setTestingSmtp(true);
    setSmtpFeedback(null);

    try {
      const res = await fetch('/api/admin/test-smtp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({})
      });

      const data = await res.json();
      if (data.success) {
        setSmtpFeedback({ type: 'success', message: data.message });
      } else {
        setSmtpFeedback({ type: 'error', message: data.message });
      }
    } catch (err: any) {
      setSmtpFeedback({ type: 'error', message: 'Error testing SMTP dispatch.' });
    } finally {
      setTestingSmtp(false);
    }
  };

  const handleCopyCredentials = () => {
    if (!credsResultData) return;
    const text = `Talent Sphere AI Login Credentials:\nEmail: ${credsResultData.user.email}\nPassword: ${credsResultData.password}\nRole: ${credsResultData.user.role}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-6 md:p-8 rounded-3xl bg-white border border-slate-200/90 shadow-sm relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs tracking-wider uppercase mb-1">
            <Users className="w-4 h-4" />
            <span>User Provisioning Engine</span>
          </div>
          <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">User Management & Email Dispatch</h2>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Create student & administrator accounts, set role permissions, manage active statuses, delete users, and configure real-time SMTP credentials dispatch.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200/80">
            <button
              onClick={() => setActiveTab('directory')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'directory' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>User Directory</span>
            </button>
            <button
              onClick={() => setActiveTab('smtp')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'smtp' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Mail className="w-3.5 h-3.5" />
              <span>SMTP Server Config</span>
            </button>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="px-5 py-2.5 rounded-xl gradient-button text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-indigo-100 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Create User & Dispatch Email</span>
          </button>
        </div>
      </div>

      {/* Action Feedback Banner */}
      {actionFeedback && (
        <div
          className={`p-4 rounded-2xl border text-xs font-bold flex items-center justify-between ${
            actionFeedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionFeedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            )}
            <span>{actionFeedback.message}</span>
          </div>
          <button onClick={() => setActionFeedback(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Directory Tab View */}
      {activeTab === 'directory' && (
        <div className="rounded-3xl bg-white border border-slate-200/90 p-6 space-y-4 shadow-sm">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative max-w-md w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Search users by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-800 text-xs font-medium focus:outline-none focus:bg-white focus:border-indigo-600 transition"
              />
            </div>

            <div className="text-xs text-slate-500 font-semibold">
              Total Users: <span className="text-indigo-600 font-extrabold">{users.length}</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="text-[11px] uppercase tracking-wider text-slate-500 bg-slate-50 font-bold">
                <tr>
                  <th className="py-3 px-4 rounded-l-xl">User Profile</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Joined Date</th>
                  <th className="py-3 px-4">Last Active</th>
                  <th className="py-3 px-4 rounded-r-xl text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-4 font-bold text-slate-800">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-extrabold border border-indigo-100">
                          {u.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800">{u.name}</p>
                          <p className="text-[11px] text-slate-500 font-medium">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => handleToggleRole(u.id, u.role)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wider border transition ${
                          u.role === 'admin'
                            ? 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100'
                            : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
                        }`}
                        title="Click to toggle role"
                      >
                        {u.role}
                      </button>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wider ${
                          u.status === 'active'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {u.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 font-medium">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 font-medium">
                      {u.lastLogin ? new Date(u.lastLogin).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-2">
                      <button
                        onClick={() => handleResendCredentials(u)}
                        className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition"
                        title="Resend Credentials Email IRL"
                      >
                        <Mail className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(u.id, u.status)}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                        title="Toggle Suspend / Active"
                      >
                        <Ban className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteUser(u.id, u.name)}
                        disabled={deletingUserId === u.id}
                        className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition disabled:opacity-50"
                        title="Delete User Permanently"
                      >
                        {deletingUserId === u.id ? (
                          <RefreshCw className="w-4 h-4 animate-spin text-rose-600" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SMTP Configuration Tab View */}
      {activeTab === 'smtp' && (
        <div className="rounded-3xl bg-white border border-slate-200/90 p-6 md:p-8 space-y-6 shadow-sm max-w-3xl">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Mail className="w-5 h-5 text-indigo-600" />
              <span>Configure Real SMTP Email Server</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Configure your SMTP credentials (e.g. Gmail, SendGrid, Outlook, Amazon SES) so user account credentials are delivered directly to real student inboxes IRL.
            </p>
          </div>

          {smtpFeedback && (
            <div
              className={`p-4 rounded-2xl border text-xs font-bold flex items-center gap-2 ${
                smtpFeedback.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              {smtpFeedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              )}
              <span>{smtpFeedback.message}</span>
            </div>
          )}

          <form onSubmit={handleSaveSmtp} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">SMTP Host Server</label>
                <input
                  type="text"
                  placeholder="e.g. smtp.gmail.com or smtp.sendgrid.net"
                  value={smtpHost}
                  onChange={(e) => setSmtpHost(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 font-medium focus:outline-none focus:bg-white focus:border-indigo-600 transition"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">SMTP Port</label>
                <input
                  type="number"
                  placeholder="587"
                  value={smtpPort}
                  onChange={(e) => setSmtpPort(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 font-medium focus:outline-none focus:bg-white focus:border-indigo-600 transition"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">SMTP Username / Email</label>
                <input
                  type="text"
                  placeholder="e.g. your-email@gmail.com"
                  value={smtpUser}
                  onChange={(e) => setSmtpUser(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 font-medium focus:outline-none focus:bg-white focus:border-indigo-600 transition"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">SMTP Password / App Password</label>
                <input
                  type="password"
                  placeholder="App Password or Secret Key"
                  value={smtpPass}
                  onChange={(e) => setSmtpPass(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 font-medium focus:outline-none focus:bg-white focus:border-indigo-600 transition"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Sender "From" Address Header</label>
              <input
                type="text"
                placeholder='"Talent Sphere AI" <no-reply@talentsphere.ai>'
                value={smtpFrom}
                onChange={(e) => setSmtpFrom(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 font-medium focus:outline-none focus:bg-white focus:border-indigo-600 transition"
              />
            </div>

            <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 text-slate-600 space-y-1">
              <p className="font-bold text-slate-800 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span>Default Sandboxed Ethereal Fallback:</span>
              </p>
              <p className="text-[11px] leading-relaxed">
                If SMTP Host and User are left empty, the platform automatically utilizes a sandbox Ethereal test inbox and generates an instant web preview URL so you can view all dispatched emails online.
              </p>
            </div>

            <div className="pt-2 flex items-center justify-between border-t border-slate-100">
              <button
                type="button"
                onClick={handleTestSmtp}
                disabled={testingSmtp}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${testingSmtp ? 'animate-spin' : ''}`} />
                <span>{testingSmtp ? 'Dispatching Test Email...' : 'Send Test Email'}</span>
              </button>

              <button
                type="submit"
                disabled={savingSmtp}
                className="px-6 py-2.5 rounded-xl gradient-button text-white font-bold shadow-md shadow-indigo-100 transition"
              >
                {savingSmtp ? 'Saving SMTP Config...' : 'Save SMTP Settings'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal 1: Create User Form */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-indigo-700 font-extrabold text-sm">
                <Users className="w-5 h-5 text-indigo-600" />
                <span>Create New User & Dispatch Email</span>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Sarah Jenkins"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 font-medium focus:outline-none focus:bg-white focus:border-indigo-600 transition"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="e.g., sarah.j@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 font-medium focus:outline-none focus:bg-white focus:border-indigo-600 transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Assign Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 font-bold focus:outline-none focus:border-indigo-600 transition"
                  >
                    <option value="student">Student (Learner)</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Password Generation</label>
                  <select
                    value={passwordMode}
                    onChange={(e) => setPasswordMode(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 font-bold focus:outline-none focus:border-indigo-600 transition"
                  >
                    <option value="auto">Auto-Generate Strong Password</option>
                    <option value="custom">Set Custom Password</option>
                  </select>
                </div>
              </div>

              {passwordMode === 'custom' && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Custom Password *</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter secure initial password..."
                    value={customPassword}
                    onChange={(e) => setCustomPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 font-medium focus:outline-none focus:bg-white focus:border-indigo-600 transition font-mono"
                  />
                </div>
              )}

              <div className="p-3.5 rounded-2xl bg-indigo-50/60 border border-indigo-100 space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="emailCheck"
                    checked={sendEmailNotice}
                    onChange={(e) => setSendEmailNotice(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                  />
                  <label htmlFor="emailCheck" className="text-xs font-bold text-slate-800 cursor-pointer flex items-center gap-1.5">
                    <Mail className="w-4 h-4 text-indigo-600" />
                    <span>Send Login Credentials Email IRL</span>
                  </label>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed pl-6">
                  Automatically dispatches an HTML email containing the account credentials, user role permissions, and platform sign-in link directly to <strong>{email || 'user email address'}</strong>.
                </p>
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
                  <Send className="w-4 h-4" />
                  <span>{submitting ? 'Creating & Sending Email...' : 'Create User & Dispatch Email'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Credentials Result Display */}
      {showCredsResultModal && credsResultData && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 space-y-4">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-extrabold text-slate-800">Account Credentials Provisioned!</h3>
              <p className="text-xs text-slate-500">
                User account for <strong>{credsResultData.user.name}</strong> is active.
              </p>
            </div>

            {/* Email dispatch alert */}
            <div className={`p-3.5 rounded-2xl text-xs font-bold flex flex-col gap-2 border ${
              credsResultData.emailSent ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-amber-50 border-amber-200 text-amber-800'
            }`}>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 shrink-0" />
                <span>{credsResultData.emailMessage}</span>
              </div>
              {credsResultData.previewUrl && (
                <a
                  href={credsResultData.previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow transition self-start mt-1"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Sent Email Preview (Ethereal Inbox)</span>
                </a>
              )}
            </div>

            {/* Credentials Card */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 font-bold text-slate-700">
                <span>Credentials Summary</span>
                <button
                  onClick={handleCopyCredentials}
                  className="text-indigo-600 hover:text-indigo-800 flex items-center gap-1 text-[11px]"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copied ? 'Copied!' : 'Copy Credentials'}</span>
                </button>
              </div>

              <div className="flex justify-between py-1">
                <span className="text-slate-500 font-semibold">User Email:</span>
                <span className="font-mono font-bold text-slate-800">{credsResultData.user.email}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500 font-semibold">Password:</span>
                <span className="font-mono font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded">
                  {credsResultData.password || 'Custom set by admin'}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500 font-semibold">Assigned Role:</span>
                <span className="font-bold text-purple-700 uppercase text-[10px]">{credsResultData.user.role}</span>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setShowCredsResultModal(false)}
                className="w-full py-2.5 rounded-xl gradient-button text-white font-bold text-xs shadow-md shadow-indigo-100 transition"
              >
                Close & Return to User Directory
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

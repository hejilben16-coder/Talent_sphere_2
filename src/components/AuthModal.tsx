import React, { useState } from 'react';
import { Sparkles, Mail, Lock, User as UserIcon, Shield, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { User, UserRole } from '../types';

interface AuthModalProps {
  onLoginSuccess: (user: User, token: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onLoginSuccess }) => {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [email, setEmail] = useState('admin@talentsphere.ai');
  const [password, setPassword] = useState('AdminPass123!');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('admin');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Login failed');
        onLoginSuccess(data.user, data.token);
      } else if (mode === 'register') {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password, role })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Registration failed');
        onLoginSuccess(data.user, data.token);
      } else if (mode === 'forgot') {
        const res = await fetch('/api/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Reset failed');
        setSuccessMessage(data.message);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during authentication');
    } finally {
      setLoading(false);
    }
  };

  const fillQuickPreset = (presetRole: 'admin' | 'student') => {
    if (presetRole === 'admin') {
      setEmail('admin@talentsphere.ai');
      setPassword('AdminPass123!');
      setRole('admin');
    } else {
      setEmail('student@talentsphere.ai');
      setPassword('StudentPass123!');
      setRole('student');
    }
    setMode('login');
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4 z-50">
      <div className="w-full max-w-md rounded-3xl bg-white border border-slate-200/90 shadow-2xl p-8 relative overflow-hidden">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl gradient-button text-white mb-3 shadow-lg shadow-indigo-100">
            <Sparkles className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">Talent Sphere AI</h2>
          <p className="text-xs text-slate-500 mt-1">
            Sign in with your Email Address and Password
          </p>
        </div>

        {/* Credentials Notice Box */}
        <div className="mb-6 p-3.5 rounded-2xl bg-indigo-50 border border-indigo-100 text-xs text-indigo-900">
          <div className="font-bold text-indigo-950 mb-1">🔐 Sign In Credentials:</div>
          <p className="text-[11px] text-slate-600 leading-relaxed">
            Use <code className="text-indigo-700 font-bold bg-indigo-100 px-1 py-0.5 rounded">admin@talentsphere.ai</code> for Admin access or <code className="text-indigo-700 font-bold bg-indigo-100 px-1 py-0.5 rounded">student@talentsphere.ai</code> for Student access. Any password is accepted!
          </p>
        </div>

        {/* Form Error & Success Banners */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-medium text-xs">
            {error}
          </div>
        )}
        {successMessage && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 font-medium text-xs">
            {successMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-sm focus:outline-none focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 transition"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@talentsphere.ai"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-sm focus:outline-none focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 transition"
              />
            </div>
          </div>

          {mode !== 'forgot' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-sm focus:outline-none focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {mode === 'register' && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Select Role</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRole('student')}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold border flex items-center justify-center gap-2 transition ${
                    role === 'student'
                      ? 'bg-indigo-600 border-indigo-500 text-white'
                      : 'bg-slate-800/50 border-slate-700 text-slate-400'
                  }`}
                >
                  <UserIcon className="w-3.5 h-3.5" />
                  <span>Student</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRole('admin')}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold border flex items-center justify-center gap-2 transition ${
                    role === 'admin'
                      ? 'bg-purple-600 border-purple-500 text-white'
                      : 'bg-slate-800/50 border-slate-700 text-slate-400'
                  }`}
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>Administrator</span>
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 px-4 rounded-xl gradient-button text-white font-semibold text-sm shadow-lg shadow-indigo-500/20 hover:opacity-95 transition flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <>
                <span>
                  {mode === 'login'
                    ? 'Sign In to LMS'
                    : mode === 'register'
                    ? 'Create Account'
                    : 'Send Password Reset Link'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Mode Toggles */}
        <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          {mode === 'login' ? (
            <>
              <button
                type="button"
                onClick={() => setMode('forgot')}
                className="hover:text-indigo-400 transition"
              >
                Forgot Password?
              </button>
              <button
                type="button"
                onClick={() => setMode('register')}
                className="font-semibold text-indigo-400 hover:underline"
              >
                Create an account
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setMode('login')}
              className="w-full text-center font-semibold text-indigo-400 hover:underline"
            >
              Back to Sign In
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

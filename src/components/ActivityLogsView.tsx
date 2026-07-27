import React, { useState, useEffect } from 'react';
import { ShieldAlert, Search, RefreshCw, FileText, User, Key, Database } from 'lucide-react';
import { ActivityLog } from '../types';

interface ActivityLogsViewProps {
  token: string;
}

export const ActivityLogsView: React.FC<ActivityLogsViewProps> = ({ token }) => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/logs', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setLogs(await res.json());
    } catch (_) {}
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();
  }, [token]);

  const filtered = logs.filter(
    (l) =>
      l.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.action.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-100">Audit Trail & System Activity Logs</h2>
          <p className="text-xs text-slate-400 mt-1">
            Comprehensive immutable activity ledger recording logins, document uploads, chat queries, exam submissions, and administrative events.
          </p>
        </div>
        <button
          onClick={fetchLogs}
          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-4">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search activity logs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-slate-100 text-xs focus:outline-none focus:border-indigo-500 transition"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="text-[11px] uppercase tracking-wider text-slate-400 bg-slate-800/50">
              <tr>
                <th className="py-3 px-4 rounded-l-xl">Timestamp</th>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4 rounded-r-xl">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filtered.map((log) => (
                <tr key={log.id} className="hover:bg-slate-800/40 transition">
                  <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-200">
                    {log.userName} ({log.userRole})
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2.5 py-1 rounded bg-indigo-500/10 text-indigo-300 font-mono text-[10px] uppercase font-bold">
                      {log.action}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-300 max-w-md truncate">{log.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

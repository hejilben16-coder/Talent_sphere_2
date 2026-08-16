import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import {
  Users,
  FileText,
  MessageSquare,
  Award,
  TrendingUp,
  Clock,
  Sparkles,
  BarChart3,
  PieChart as PieIcon,
  CircleDot
} from 'lucide-react';
import { UserRole } from '../types';

interface AnalyticsViewProps {
  role: UserRole;
  token: string;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ role, token }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const endpoint = role === 'admin' ? '/api/analytics/admin' : '/api/analytics/student';
    fetch(endpoint, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((res) => res.json())
      .then((resData) => {
        setData(resData);
        setLoading(false);
      })
      .catch((_) => setLoading(false));
  }, [role, token]);

  if (loading || !data) {
    return (
      <div className="py-20 text-center text-slate-400 text-xs">
        Loading analytics visualization engine...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-100">
            {role === 'admin' ? 'System-Wide Analytics Dashboard' : 'Personal Academic Progress'}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {role === 'admin'
              ? 'Real-time telemetry on knowledge base size, user activity, chat queries, and assessment performance.'
              : 'Track exam score trajectories, topic mastery percentages, and study activity hours.'}
          </p>
        </div>
      </div>

      {/* Admin Analytics View */}
      {role === 'admin' ? (
        <div className="space-y-6">
          {/* Stat Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400">Total Users</span>
                <Users className="w-4 h-4 text-indigo-400" />
              </div>
              <p className="text-2xl font-bold text-slate-100">{data.totalUsers}</p>
            </div>

            <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400">PDF Uploads</span>
                <FileText className="w-4 h-4 text-purple-400" />
              </div>
              <p className="text-2xl font-bold text-slate-100">{data.pdfUploadsCount}</p>
              <p className="text-[10px] text-indigo-400">{data.totalKnowledgePages} Total Pages</p>
            </div>

            <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400">Exams Attempted</span>
                <Award className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-2xl font-bold text-slate-100">{data.examsAttemptedCount}</p>
            </div>

            <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400">Avg Exam Score</span>
                <TrendingUp className="w-4 h-4 text-amber-400" />
              </div>
              <p className="text-2xl font-bold text-slate-100">{data.averageExamScore}%</p>
            </div>
          </div>

          {/* Chart Section */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 xl:col-span-2">
              <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-indigo-400" />
                <span>Knowledge Base Queries by PDF</span>
              </h3>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.topPdfs || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="docName" stroke="#94a3b8" fontSize={11} />
                    <YAxis stroke="#94a3b8" fontSize={11} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                    />
                    <Bar dataKey="queriesCount" fill="#6366f1" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
              <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                <CircleDot className="w-4 h-4 text-purple-400" />
                <span>Upload Share by Document</span>
              </h3>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.topPdfs || []}
                      dataKey="queriesCount"
                      nameKey="docName"
                      cx="50%"
                      cy="50%"
                      innerRadius={35}
                      outerRadius={80}
                      paddingAngle={3}
                    >
                      {(data.topPdfs || []).map((entry: any, index: number) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'][index % 5]}
                        />
                      ))}
                    </Pie>
                    <Legend verticalAlign="bottom" height={36} wrapperStyle={{ color: '#94a3b8' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 overflow-x-auto">
            <h3 className="font-bold text-sm text-slate-100 mb-4">Top Document Activity</h3>
            <table className="min-w-full text-left text-xs text-slate-300">
              <thead className="text-[11px] uppercase tracking-wider text-slate-400 bg-slate-800/60">
                <tr>
                  <th className="py-3 px-4">Document</th>
                  <th className="py-3 px-4">Query Volume</th>
                  <th className="py-3 px-4">Average Engagement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {(data.topPdfs || []).map((item: any) => (
                  <tr key={item.docName} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 font-semibold text-slate-100">{item.docName}</td>
                    <td className="py-3 px-4">{item.queriesCount}</td>
                    <td className="py-3 px-4 text-slate-400">{Math.round((item.queriesCount || 0) * 1.5)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Student Analytics View */
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-2">
              <span className="text-xs font-medium text-slate-400 block">Exams Completed</span>
              <p className="text-2xl font-bold text-slate-100">{data.totalExamsTaken}</p>
            </div>

            <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-2">
              <span className="text-xs font-medium text-slate-400 block">Average Score</span>
              <p className="text-2xl font-bold text-emerald-400">{data.averageScorePct}%</p>
            </div>

            <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-2">
              <span className="text-xs font-medium text-slate-400 block">Study Hours</span>
              <p className="text-2xl font-bold text-indigo-400">{data.studyTimeHours} hrs</p>
            </div>

            <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-2">
              <span className="text-xs font-medium text-slate-400 block">Study Streak</span>
              <p className="text-2xl font-bold text-amber-400">{data.studyStreakDays} Days</p>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 xl:col-span-2">
              <h3 className="font-bold text-sm text-slate-100">Score Trend Trajectory</h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.scoreTrend || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
                    <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={11} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                    />
                    <Line type="monotone" dataKey="scorePct" stroke="#a855f7" strokeWidth={3} dot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
              <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                <PieIcon className="w-4 h-4 text-emerald-400" />
                <span>Topic Mastery Distribution</span>
              </h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.topicMastery || []}
                      dataKey="masteryPct"
                      nameKey="topic"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={(entry) => `${entry.topic}: ${entry.masteryPct}%`}
                    >
                      {(data.topicMastery || []).map((entry: any, index: number) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={['#22c55e', '#38bdf8', '#a855f7', '#f97316', '#e879f9'][index % 5]}
                        />
                      ))}
                    </Pie>
                    <Legend verticalAlign="bottom" height={28} wrapperStyle={{ color: '#94a3b8' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 overflow-x-auto">
            <h3 className="font-bold text-sm text-slate-100 mb-4">Recent Exam Breakdown</h3>
            <table className="min-w-full text-left text-xs text-slate-300">
              <thead className="text-[11px] uppercase tracking-wider text-slate-400 bg-slate-800/60">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Exam</th>
                  <th className="py-3 px-4">Score</th>
                  <th className="py-3 px-4">Confidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {(data.scoreTrend || []).slice(-5).map((item: any) => (
                  <tr key={`${item.date}-${item.examTitle}`} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 text-slate-400">{item.date}</td>
                    <td className="py-3 px-4 font-semibold text-slate-100">{item.examTitle}</td>
                    <td className="py-3 px-4 text-emerald-300">{item.scorePct}%</td>
                    <td className="py-3 px-4 text-slate-400">{Math.min(100, Math.round((item.scorePct || 0) * 1.1))}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

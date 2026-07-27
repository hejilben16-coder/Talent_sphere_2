import React, { useState, useEffect } from 'react';
import { Settings, Save, RotateCcw, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { SystemSettings } from '../types';

interface SettingsViewProps {
  token: string;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ token }) => {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => {
        setSettings(data);
        setLoading(false);
      })
      .catch((_) => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(settings)
      });
      if (!res.ok) throw new Error('Save failed');
      const updated = await res.json();
      setSettings(updated);
      setMessage('System settings updated successfully.');
    } catch (_) {
      setMessage('Error updating settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleResetDatabase = async () => {
    if (!confirm('CRITICAL: Resetting database will re-initialize all users, documents, and exam logs. Proceed?')) {
      return;
    }
    try {
      await fetch('/api/admin/reset-database', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Database re-initialized to initial clean state.');
      window.location.reload();
    } catch (_) {}
  };

  if (loading || !settings) {
    return <div className="py-20 text-center text-slate-400 text-xs">Loading settings...</div>;
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-100">LLM & RAG Engine Configuration</h2>
          <p className="text-xs text-slate-400 mt-1">
            Configure default generative models, temperature sampling, text chunking overlap, and vector retrieval top-K limits.
          </p>
        </div>
      </div>

      {message && (
        <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-indigo-400" />
          <span>{message}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">LLM Model Alias</label>
            <select
              value={settings.llmModel}
              onChange={(e) => setSettings({ ...settings, llmModel: e.target.value })}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 text-xs focus:outline-none"
            >
              <option value="gemini-2.5-flash">Gemini 2.5 Flash (Recommended)</option>
              <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
              <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Embedding Model</label>
            <input
              type="text"
              value={settings.embeddingModel}
              onChange={(e) => setSettings({ ...settings, embeddingModel: e.target.value })}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 text-xs focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Model Temperature ({settings.temperature})</label>
            <input
              type="range"
              min={0}
              max={1}
              step={0.1}
              value={settings.temperature}
              onChange={(e) => setSettings({ ...settings, temperature: parseFloat(e.target.value) })}
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Top-K Retrieval Count</label>
            <input
              type="number"
              min={1}
              max={10}
              value={settings.topKRetrieval}
              onChange={(e) => setSettings({ ...settings, topKRetrieval: parseInt(e.target.value) || 4 })}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 text-xs focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Text Chunk Size (Characters)</label>
            <input
              type="number"
              min={200}
              max={2000}
              value={settings.chunkSize}
              onChange={(e) => setSettings({ ...settings, chunkSize: parseInt(e.target.value) || 800 })}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 text-xs focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Chunk Overlap (Characters)</label>
            <input
              type="number"
              min={0}
              max={500}
              value={settings.chunkOverlap}
              onChange={(e) => setSettings({ ...settings, chunkOverlap: parseInt(e.target.value) || 150 })}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 text-xs focus:outline-none"
            />
          </div>
        </div>

        <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 rounded-xl gradient-button text-white font-semibold text-xs shadow-lg shadow-indigo-500/20 flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>Save Configuration</span>
          </button>

          <button
            type="button"
            onClick={handleResetDatabase}
            className="px-4 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 font-semibold text-xs hover:bg-rose-500/20 transition flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset LMS Database</span>
          </button>
        </div>
      </form>
    </div>
  );
};

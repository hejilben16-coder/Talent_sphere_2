import React, { useState, useEffect } from 'react';
import {
  FileQuestion,
  Sparkles,
  BookOpen,
  Clock,
  Layers,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Eye
} from 'lucide-react';
import { PDFDocument, Exam, QuestionType, DifficultyLevel } from '../types';

interface ExamGeneratorProps {
  token: string;
  onExamCreated: () => void;
}

export const ExamGenerator: React.FC<ExamGeneratorProps> = ({ token, onExamCreated }) => {
  const [documents, setDocuments] = useState<PDFDocument[]>([]);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [title, setTitle] = useState('Unit Assessment - RAG & Vector Search');
  const [description, setDescription] = useState('Automated assessment generated from uploaded course materials.');
  const [questionType, setQuestionType] = useState<QuestionType | 'mixed'>('mixed');
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('Medium');
  const [questionCount, setQuestionCount] = useState<number>(5);
  const [durationMinutes, setDurationMinutes] = useState<number>(15);
  const [loading, setLoading] = useState(false);
  const [generatedExam, setGeneratedExam] = useState<Exam | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    fetch('/api/documents', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load documents');
        return res.json();
      })
      .then((data: PDFDocument[]) => {
        setDocuments(data);
        if (data.length > 0) {
          setSelectedDocIds([data[0].id]);
        }
      })
      .catch((err) => setError(err.message));
  }, [token]);

  const handleToggleDoc = (docId: string) => {
    if (selectedDocIds.includes(docId)) {
      setSelectedDocIds(selectedDocIds.filter((id) => id !== docId));
    } else {
      setSelectedDocIds([...selectedDocIds, docId]);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedDocIds.length === 0) {
      setError('Please select at least one PDF document to generate questions from.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/exams/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title,
          description,
          selectedDocIds,
          questionType,
          difficulty,
          questionCount,
          durationMinutes
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to generate exam');
      }

      const examData: Exam = await res.json();
      setGeneratedExam(examData);
      onExamCreated();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-purple-400 font-semibold text-xs tracking-wider uppercase mb-1">
              <Sparkles className="w-4 h-4" />
              <span>Bloom's Taxonomy Assessment Engine</span>
            </div>
            <h2 className="text-xl font-bold text-slate-100">AI Exam Generator</h2>
            <p className="text-xs text-slate-400 mt-1">
              Select PDF knowledge bases to automatically generate targeted MCQs, Short Answers, and True/False questions with source page citations.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Controls */}
        <form onSubmit={handleGenerate} className="lg:col-span-2 space-y-6 rounded-3xl bg-slate-900 border border-slate-800 p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Exam Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-slate-100 text-xs focus:outline-none focus:border-indigo-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-slate-100 text-xs focus:outline-none focus:border-indigo-500 transition"
              />
            </div>

            {/* Document Selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                Select Knowledge Base PDFs ({selectedDocIds.length} selected)
              </label>
              {documents.length === 0 ? (
                <div className="p-4 rounded-xl bg-slate-800/40 text-slate-400 text-xs text-center">
                  No uploaded PDFs available. Upload documents in PDF Manager first.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-48 overflow-y-auto">
                  {documents.map((doc) => {
                    const isSelected = selectedDocIds.includes(doc.id);
                    return (
                      <button
                        key={doc.id}
                        type="button"
                        onClick={() => handleToggleDoc(doc.id)}
                        className={`p-3 rounded-xl border text-left text-xs transition flex items-center justify-between ${
                          isSelected
                            ? 'bg-indigo-600/20 border-indigo-500 text-indigo-200'
                            : 'bg-slate-800/50 border-slate-700 text-slate-400'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <BookOpen className="w-4 h-4 shrink-0 text-indigo-400" />
                          <span className="truncate">{doc.name}</span>
                        </div>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Config Grids */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Question Type</label>
                <select
                  value={questionType}
                  onChange={(e) => setQuestionType(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 text-xs focus:outline-none"
                >
                  <option value="mixed">Mixed Questions (MCQ + Written)</option>
                  <option value="mcq">Multiple Choice (MCQ)</option>
                  <option value="short">Short Answer</option>
                  <option value="long">Long Answer</option>
                  <option value="true_false">True / False</option>
                  <option value="fill_in_blank">Fill in the Blanks</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Difficulty Level</label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as DifficultyLevel)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 text-xs focus:outline-none"
                >
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Number of Questions</label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={questionCount}
                  onChange={(e) => setQuestionCount(parseInt(e.target.value) || 5)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Time Limit (Minutes)</label>
                <input
                  type="number"
                  min={5}
                  max={120}
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(parseInt(e.target.value) || 15)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 text-xs focus:outline-none"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || selectedDocIds.length === 0}
            className="w-full py-3 px-4 rounded-xl gradient-button text-white font-semibold text-xs shadow-lg shadow-indigo-500/20 hover:opacity-95 transition flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Generate Exam with AI</span>
              </>
            )}
          </button>
        </form>

        {/* Live Preview Panel */}
        <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-4">
          <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
            <Eye className="w-4 h-4 text-purple-400" />
            <span>Generated Exam Preview</span>
          </h3>

          {generatedExam ? (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-800/40 space-y-2">
                <h4 className="font-bold text-xs text-indigo-300">{generatedExam.title}</h4>
                <div className="flex items-center gap-3 text-[11px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <FileQuestion className="w-3.5 h-3.5 text-indigo-400" />
                    {generatedExam.totalQuestions} Questions
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-purple-400" />
                    {generatedExam.durationMinutes} mins
                  </span>
                </div>
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto">
                {generatedExam.questions.map((q, idx) => (
                  <div key={q.id} className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/50 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-indigo-400">Q{idx + 1}. ({q.type.toUpperCase()})</span>
                      <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[10px] font-bold">
                        {q.bloomsLevel}
                      </span>
                    </div>
                    <p className="text-slate-200 font-medium">{q.question}</p>
                    <p className="text-[11px] text-slate-400 italic">Source: {q.sourceDocName} (Page {q.sourcePage})</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-slate-500 text-xs">
              <FileQuestion className="w-8 h-8 mx-auto mb-2 opacity-40" />
              Configure parameter options and click "Generate Exam with AI" to construct instant assessment questions.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

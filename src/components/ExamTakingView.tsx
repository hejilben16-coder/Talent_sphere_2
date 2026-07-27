import React, { useState, useEffect } from 'react';
import {
  FileQuestion,
  Clock,
  CheckCircle2,
  AlertCircle,
  Award,
  ArrowRight,
  ArrowLeft,
  Download,
  RotateCcw,
  Sparkles,
  BookOpen
} from 'lucide-react';
import { Exam, ExamAttempt } from '../types';

interface ExamTakingViewProps {
  token: string;
}

export const ExamTakingView: React.FC<ExamTakingViewProps> = ({ token }) => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [activeExam, setActiveExam] = useState<Exam | null>(null);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [attemptResult, setAttemptResult] = useState<ExamAttempt | null>(null);
  const [pastAttempts, setPastAttempts] = useState<ExamAttempt[]>([]);

  const fetchExamsAndAttempts = async () => {
    try {
      const [resExams, resAttempts] = await Promise.all([
        fetch('/api/exams'),
        fetch('/api/exams/attempts/my', { headers: { Authorization: `Bearer ${token}` } })
      ]);
      if (resExams.ok) setExams(await resExams.json());
      if (resAttempts.ok) setPastAttempts(await resAttempts.json());
    } catch (_) {}
  };

  useEffect(() => {
    fetchExamsAndAttempts();
  }, [token]);

  // Timer Countdown
  useEffect(() => {
    if (!activeExam || timeLeftSeconds <= 0 || attemptResult) return;
    const timer = setInterval(() => {
      setTimeLeftSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmitExam();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [activeExam, timeLeftSeconds, attemptResult]);

  const handleStartExam = (exam: Exam) => {
    setActiveExam(exam);
    setCurrentQIndex(0);
    setAnswers({});
    setTimeLeftSeconds(exam.durationMinutes * 60);
    setAttemptResult(null);
  };

  const handleAnswerChange = (qId: string, val: string) => {
    setAnswers((prev) => ({ ...prev, [qId]: val }));
  };

  const handleSubmitExam = async () => {
    if (!activeExam || submitting) return;
    setSubmitting(true);

    const formattedAnswers = Object.keys(answers).map((questionId) => ({
      questionId,
      studentAnswer: answers[questionId]
    }));

    try {
      const res = await fetch(`/api/exams/${activeExam.id}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ answers: formattedAnswers })
      });

      if (!res.ok) throw new Error('Submission error');
      const resultData: ExamAttempt = await res.json();
      setAttemptResult(resultData);
      fetchExamsAndAttempts();
    } catch (_) {
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${mins}:${rem < 10 ? '0' : ''}${rem}`;
  };

  return (
    <div className="space-y-6">
      {/* If Taking Exam */}
      {activeExam && !attemptResult ? (
        <div className="space-y-6">
          {/* Exam Status Bar */}
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-slate-100 text-lg">{activeExam.title}</h2>
              <p className="text-xs text-slate-400">
                Question {currentQIndex + 1} of {activeExam.totalQuestions}
              </p>
            </div>

            <div className="flex items-center gap-4">
              <div className="px-4 py-2 rounded-2xl bg-indigo-950 border border-indigo-800/60 text-indigo-300 flex items-center gap-2 text-sm font-mono font-bold">
                <Clock className="w-4 h-4 text-indigo-400 animate-pulse" />
                <span>{formatTime(timeLeftSeconds)}</span>
              </div>
              <button
                onClick={handleSubmitExam}
                disabled={submitting}
                className="px-4 py-2 rounded-xl gradient-button text-white font-semibold text-xs shadow-lg shadow-indigo-500/20"
              >
                {submitting ? 'Auto-Grading...' : 'Submit Exam'}
              </button>
            </div>
          </div>

          {/* Question View */}
          {activeExam.questions[currentQIndex] && (
            <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                    Question {currentQIndex + 1} ({activeExam.questions[currentQIndex].points} Points)
                  </span>
                  <span className="px-2.5 py-0.5 rounded bg-purple-500/20 text-purple-300 text-xs font-semibold">
                    {activeExam.questions[currentQIndex].difficulty} • {activeExam.questions[currentQIndex].bloomsLevel}
                  </span>
                </div>
                <h3 className="text-base font-semibold text-slate-100">
                  {activeExam.questions[currentQIndex].question}
                </h3>
              </div>

              {/* Options / Text Input */}
              {activeExam.questions[currentQIndex].type === 'mcq' ||
              activeExam.questions[currentQIndex].type === 'true_false' ? (
                <div className="space-y-3">
                  {activeExam.questions[currentQIndex].options?.map((opt, optIdx) => {
                    const isSelected =
                      answers[activeExam.questions[currentQIndex].id] === opt;
                    return (
                      <button
                        key={optIdx}
                        onClick={() =>
                          handleAnswerChange(
                            activeExam.questions[currentQIndex].id,
                            opt
                          )
                        }
                        className={`w-full p-4 rounded-2xl border text-left text-xs font-medium transition flex items-center justify-between ${
                          isSelected
                            ? 'bg-indigo-600/20 border-indigo-500 text-white'
                            : 'bg-slate-800/50 border-slate-700/60 text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        <span>{opt}</span>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-indigo-400" />}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <textarea
                  rows={4}
                  value={answers[activeExam.questions[currentQIndex].id] || ''}
                  onChange={(e) =>
                    handleAnswerChange(
                      activeExam.questions[currentQIndex].id,
                      e.target.value
                    )
                  }
                  placeholder="Type your response here... AI evaluation will analyze correctness against context."
                  className="w-full p-4 rounded-2xl bg-slate-800/80 border border-slate-700/60 text-slate-100 text-xs focus:outline-none focus:border-indigo-500 transition"
                />
              )}

              {/* Question Navigation Controls */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                <button
                  disabled={currentQIndex === 0}
                  onClick={() => setCurrentQIndex((prev) => prev - 1)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white disabled:opacity-40 text-xs font-semibold flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Previous</span>
                </button>

                <div className="flex gap-1.5 overflow-x-auto max-w-xs">
                  {activeExam.questions.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentQIndex(idx)}
                      className={`w-7 h-7 rounded-lg text-xs font-bold transition ${
                        currentQIndex === idx
                          ? 'bg-indigo-600 text-white'
                          : answers[activeExam.questions[idx].id]
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {idx + 1}
                    </button>
                  ))}
                </div>

                <button
                  disabled={currentQIndex === activeExam.questions.length - 1}
                  onClick={() => setCurrentQIndex((prev) => prev + 1)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white disabled:opacity-40 text-xs font-semibold flex items-center gap-2"
                >
                  <span>Next</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      ) : attemptResult ? (
        /* Exam Result View */
        <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 space-y-6">
          <div className="text-center space-y-3">
            <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto">
              <Award className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-slate-100">AI Assessment Result</h2>
            <p className="text-xs text-slate-400">{attemptResult.examTitle}</p>
            <div className="inline-block px-6 py-2 rounded-2xl bg-indigo-950 border border-indigo-800/60 text-2xl font-bold text-indigo-300">
              {attemptResult.percentage}%
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-800/60 text-xs text-slate-300 leading-relaxed">
            <span className="font-bold text-indigo-400 block mb-1">AI Evaluator Overview:</span>
            {attemptResult.aiOverallFeedback}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-2">
              <span className="text-xs font-bold text-emerald-400 uppercase">Strong Knowledge Topics</span>
              <ul className="text-xs text-slate-300 list-disc list-inside space-y-1">
                {attemptResult.strongTopics?.map((st, i) => (
                  <li key={i}>{st}</li>
                ))}
              </ul>
            </div>
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 space-y-2">
              <span className="text-xs font-bold text-rose-400 uppercase">Weak Topics To Revise</span>
              <ul className="text-xs text-slate-300 list-disc list-inside space-y-1">
                {attemptResult.weakTopics?.map((wt, i) => (
                  <li key={i}>{wt}</li>
                ))}
              </ul>
            </div>
          </div>

          <button
            onClick={() => {
              setActiveExam(null);
              setAttemptResult(null);
            }}
            className="w-full py-3 rounded-xl gradient-button text-white font-semibold text-xs shadow-lg shadow-indigo-500/20"
          >
            Back to Exams Directory
          </button>
        </div>
      ) : (
        /* Available Exams Directory */
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 relative overflow-hidden">
            <div className="relative z-10 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-100">Exams & Knowledge Assessments</h2>
                <p className="text-xs text-slate-400 mt-1">
                  Launch interactive AI-generated exams based on PDF course materials with immediate AI grading.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {exams.map((exam) => (
              <div
                key={exam.id}
                className="p-6 rounded-3xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2">
                  <span className="px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-[10px] font-bold uppercase tracking-wider">
                    {exam.docNames[0] || 'Course PDF'}
                  </span>
                  <h3 className="font-bold text-sm text-slate-100">{exam.title}</h3>
                  <p className="text-xs text-slate-400 line-clamp-2">{exam.description}</p>
                </div>

                <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <FileQuestion className="w-3.5 h-3.5 text-indigo-400" />
                    {exam.totalQuestions} Questions
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-purple-400" />
                    {exam.durationMinutes} mins
                  </span>
                </div>

                <button
                  onClick={() => handleStartExam(exam)}
                  className="w-full py-2.5 rounded-xl gradient-button text-white font-semibold text-xs shadow-md shadow-indigo-500/20 hover:opacity-95 transition"
                >
                  Start Assessment
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

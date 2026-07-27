import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  Sparkles,
  Flame,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  BookOpen,
  Calendar,
  Layers,
  ChevronRight
} from 'lucide-react';
import { StudyCoachData } from '../types';

interface StudyCoachViewProps {
  token: string;
}

export const StudyCoachView: React.FC<StudyCoachViewProps> = ({ token }) => {
  const [coachData, setCoachData] = useState<StudyCoachData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  useEffect(() => {
    fetch('/api/study-coach', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((res) => res.json())
      .then((data: StudyCoachData) => {
        setCoachData(data);
        setLoading(false);
      })
      .catch((_) => setLoading(false));
  }, [token]);

  if (loading || !coachData) {
    return (
      <div className="py-20 text-center text-slate-400 text-xs flex flex-col items-center justify-center space-y-3">
        <Sparkles className="w-8 h-8 animate-spin text-indigo-400" />
        <span>Synthesizing personalized AI Study Coach recommendations...</span>
      </div>
    );
  }

  const currentFlashcard = coachData.flashcards[activeCardIndex];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-indigo-400 font-semibold text-xs tracking-wider uppercase mb-1">
              <Sparkles className="w-4 h-4" />
              <span>Adaptive AI Tutor</span>
            </div>
            <h2 className="text-xl font-bold text-slate-100">AI Study Coach & Revision Engine</h2>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl">
              Analyzes your exam attempt histories to automatically isolate weak knowledge areas, structure custom revision timelines, and generate interactive flashcards.
            </p>
          </div>

          <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30">
            <Flame className="w-6 h-6 text-amber-400 animate-bounce" />
            <div>
              <span className="text-[10px] text-amber-300 uppercase font-bold tracking-wider block">
                Study Streak
              </span>
              <span className="text-base font-extrabold text-amber-100">
                {coachData.studyStreakDays} Days Active
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Flashcards Deck */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-400" />
                <span>AI Concept Flashcards</span>
              </h3>
              <span className="text-xs text-slate-400 font-medium">
                Card {activeCardIndex + 1} of {coachData.flashcards.length}
              </span>
            </div>

            {/* Flip Card Container */}
            {currentFlashcard && (
              <div
                onClick={() => setIsFlipped(!isFlipped)}
                className="perspective-1000 h-64 w-full cursor-pointer"
              >
                <div
                  className={`relative w-full h-full rounded-2xl border border-slate-700/60 transition-transform duration-500 transform-style-3d p-6 flex flex-col justify-between ${
                    isFlipped ? 'rotate-y-180 bg-indigo-950/80 border-indigo-500' : 'bg-slate-800/80'
                  }`}
                >
                  {/* Front Side */}
                  {!isFlipped ? (
                    <>
                      <span className="px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-300 text-[10px] font-bold self-start">
                        {currentFlashcard.topic}
                      </span>
                      <p className="text-base font-bold text-slate-100 text-center my-auto">
                        {currentFlashcard.front}
                      </p>
                      <p className="text-[11px] text-slate-400 text-center flex items-center justify-center gap-1">
                        <RotateCw className="w-3 h-3" />
                        Click card to reveal answer explanation
                      </p>
                    </>
                  ) : (
                    /* Back Side */
                    <div className="rotate-y-180 h-full flex flex-col justify-between">
                      <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold self-start">
                        Explanation Answer
                      </span>
                      <p className="text-xs text-slate-200 leading-relaxed my-auto">
                        {currentFlashcard.back}
                      </p>
                      <p className="text-[11px] text-indigo-300 text-center">
                        Click card to flip back
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Flashcard Navigation Controls */}
            <div className="flex items-center justify-between pt-2">
              <button
                disabled={activeCardIndex === 0}
                onClick={() => {
                  setIsFlipped(false);
                  setActiveCardIndex((prev) => prev - 1);
                }}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white disabled:opacity-40 text-xs font-semibold"
              >
                Previous Card
              </button>
              <button
                disabled={activeCardIndex === coachData.flashcards.length - 1}
                onClick={() => {
                  setIsFlipped(false);
                  setActiveCardIndex((prev) => prev + 1);
                }}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white disabled:opacity-40 text-xs font-semibold"
              >
                Next Card
              </button>
            </div>
          </div>

          {/* Daily Revision Plan */}
          <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-4">
            <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-purple-400" />
              <span>Weekly Revision Schedule</span>
            </h3>

            <div className="space-y-2.5">
              {coachData.revisionPlan.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-2xl bg-slate-800/50 border border-slate-700/50 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-20 font-bold text-indigo-400">{item.day}</span>
                    <span className="text-slate-200 font-medium">{item.task}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700">
                    {item.pdfName}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Weak / Strong Knowledge Columns */}
        <div className="space-y-6">
          <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-4">
            <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <span>Target Weak Topics</span>
            </h3>

            <div className="space-y-3">
              {coachData.weakTopics.map((wt, i) => (
                <div key={i} className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/50 space-y-1">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-200">
                    <span className="truncate">{wt.topic}</span>
                    <span className="text-rose-400 font-mono">{wt.scorePct}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-700 overflow-hidden">
                    <div
                      className="h-full bg-rose-500 rounded-full"
                      style={{ width: `${wt.scorePct}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-4">
            <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Mastered Concepts</span>
            </h3>

            <div className="space-y-3">
              {coachData.strongTopics.map((st, i) => (
                <div key={i} className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/50 space-y-1">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-200">
                    <span className="truncate">{st.topic}</span>
                    <span className="text-emerald-400 font-mono">{st.scorePct}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-700 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{ width: `${st.scorePct}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Lock,
  Unlock,
  CheckCircle2,
  BookOpen,
  FileText,
  Award,
  Sparkles,
  ArrowRight,
  Eye,
  Plus,
  Edit2,
  Trash2,
  Save,
  Settings,
  X,
  Check,
  GraduationCap,
  Layers,
  AlertCircle,
  Star,
  CheckCircle,
  Clock,
  Play
} from 'lucide-react';
import { WeeklyStudyPlan, StudyDayModule, PDFDocument } from '../types';

interface StudyPlanViewProps {
  token: string;
  userRole?: string;
}

interface SelectedDocumentInfo {
  title: string;
  dayNumber: number;
  objective: string;
}

export const StudyPlanView: React.FC<StudyPlanViewProps> = ({ token, userRole = 'student' }) => {
  const [plans, setPlans] = useState<WeeklyStudyPlan[]>([]);
  const [activePlan, setActivePlan] = useState<WeeklyStudyPlan | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [currentDay, setCurrentDay] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);

  // PDF Document Library state
  const [availablePdfs, setAvailablePdfs] = useState<PDFDocument[]>([]);

  // Reader Modal State
  const [selectedDoc, setSelectedDoc] = useState<SelectedDocumentInfo | null>(null);

  // Admin Studio State
  const [showCreatePlanModal, setShowCreatePlanModal] = useState<boolean>(false);
  const [editingDay, setEditingDay] = useState<StudyDayModule | null>(null);
  const [showSaveBanner, setShowSaveBanner] = useState<string | null>(null);
  const [adminSequentialLock, setAdminSequentialLock] = useState<boolean>(true);

  // Create Plan Form Fields
  const [newPlanTitle, setNewPlanTitle] = useState<string>('');
  const [newPlanDescription, setNewPlanDescription] = useState<string>('');
  const [newPlanCategory, setNewPlanCategory] = useState<string>('Artificial Intelligence');
  const [newPlanDurationWeeks, setNewPlanDurationWeeks] = useState<number>(1);
  const [submittingPlan, setSubmittingPlan] = useState<boolean>(false);

  useEffect(() => {
    fetchPlans();
    fetchPdfs();
  }, [token]);

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/plans', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data: WeeklyStudyPlan[] = await res.json();
        setPlans(data);
        const currentActive = data.find((p) => p.isActiveDefault) || data[0];
        if (currentActive) {
          setActivePlan(currentActive);
          setSelectedPlanId(currentActive.id);
        }
      }
    } catch (e) {
      console.error('Failed to fetch study plans', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchPdfs = async () => {
    try {
      const res = await fetch('/api/pdfs', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setAvailablePdfs(await res.json());
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSelectPlan = (plan: WeeklyStudyPlan) => {
    setActivePlan(plan);
    setSelectedPlanId(plan.id);
    setCurrentDay(1);
  };

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlanTitle.trim()) return;

    setSubmittingPlan(true);
    try {
      const totalDays = newPlanDurationWeeks * 7;
      const initialDays: StudyDayModule[] = Array.from({ length: totalDays }, (_, i) => ({
        dayNumber: i + 1,
        title: `Day ${i + 1}: Module Topic Title`,
        objective: 'Define detailed core objectives and theoretical concepts for this day.',
        documents: availablePdfs.length > 0 ? [availablePdfs[i % availablePdfs.length].filename] : ['Sample Core Material.pdf'],
        quizzes: [`Daily Knowledge Assessment Day ${i + 1}`]
      }));

      const res = await fetch('/api/admin/plans', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title: newPlanTitle,
          description: newPlanDescription || 'Comprehensive custom study plan designed by course admin.',
          category: newPlanCategory,
          durationWeeks: newPlanDurationWeeks,
          days: initialDays,
          isDefault: plans.length === 0
        })
      });

      if (res.ok) {
        const createdPlan = await res.json();
        setShowSaveBanner('New Unlimited Weekly Study Plan created successfully!');
        setShowCreatePlanModal(false);
        setNewPlanTitle('');
        setNewPlanDescription('');
        fetchPlans();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmittingPlan(false);
    }
  };

  const handleSaveDayEdit = async () => {
    if (!editingDay || !activePlan) return;

    const updatedDays = activePlan.days.map((d) =>
      d.dayNumber === editingDay.dayNumber ? editingDay : d
    );

    try {
      const res = await fetch(`/api/admin/plans/${activePlan.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          ...activePlan,
          days: updatedDays
        })
      });

      if (res.ok) {
        const saved = await res.json();
        setActivePlan(saved);
        setPlans((prev) => prev.map((p) => (p.id === saved.id ? saved : p)));
        setEditingDay(null);
        setShowSaveBanner('Day module updated and saved!');
        setTimeout(() => setShowSaveBanner(null), 3000);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddDayToActivePlan = async () => {
    if (!activePlan) return;
    const nextDayNum = activePlan.days.length + 1;
    const newDay: StudyDayModule = {
      dayNumber: nextDayNum,
      title: `Day ${nextDayNum}: Advanced Elective & Specialization`,
      objective: 'Custom elective module created by admin to cover specialized domain subjects.',
      documents: availablePdfs.length > 0 ? [availablePdfs[0].filename] : [`Elective Material ${nextDayNum}.pdf`],
      quizzes: [`Elective Quiz ${nextDayNum}`]
    };

    const updatedDays = [...activePlan.days, newDay];
    try {
      const res = await fetch(`/api/admin/plans/${activePlan.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          ...activePlan,
          days: updatedDays
        })
      });

      if (res.ok) {
        const saved = await res.json();
        setActivePlan(saved);
        setPlans((prev) => prev.map((p) => (p.id === saved.id ? saved : p)));
        setShowSaveBanner(`Day ${nextDayNum} added to study plan!`);
        setTimeout(() => setShowSaveBanner(null), 3000);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSetActiveDefault = async (planId: string) => {
    try {
      const res = await fetch(`/api/admin/plans/${planId}/activate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setShowSaveBanner('Default active study plan updated for all students!');
        fetchPlans();
        setTimeout(() => setShowSaveBanner(null), 3000);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeletePlan = async (planId: string, planTitle: string) => {
    if (!confirm(`Are you sure you want to delete study plan "${planTitle}"?`)) return;
    try {
      const res = await fetch(`/api/admin/plans/${planId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setShowSaveBanner('Study plan deleted.');
        fetchPlans();
        setTimeout(() => setShowSaveBanner(null), 3000);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCompleteDay = (dayNum: number) => {
    if (!activePlan) return;
    if (dayNum === currentDay && currentDay < activePlan.days.length) {
      setCurrentDay(currentDay + 1);
    }
  };

  const getDocSampleContent = (docTitle: string) => {
    return {
      summary: `Unlocked course study document: ${docTitle}. Verified by Talent Sphere AI RAG knowledge index.`,
      sections: [
        {
          title: 'Module Overview & Core Objectives',
          text: 'This official module document covers core theoretical foundations, architectural diagrams, vector similarity formulas, and practical software engineering implementations.'
        },
        {
          title: 'Practical Code Patterns & Architecture',
          text: 'Review the step-by-step algorithms, neural net dynamics, and prompt engineering strategies assigned for this module day.'
        },
        {
          title: 'Assessment & Voice Interview Key Terms',
          text: 'Pay close attention to key terms as they will be evaluated in the hands-free AI voice interview evaluation and adaptive quizzes.'
        }
      ]
    };
  };

  const currentPlanDays = activePlan?.days || [];
  const completedCount = currentDay - 1;
  const progressPercent = currentPlanDays.length > 0 ? Math.round((completedCount / currentPlanDays.length) * 100) : 0;

  if (loading) {
    return <div className="p-12 text-center text-slate-400 text-xs font-semibold">Loading study packages...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-6 md:p-8 rounded-3xl bg-white border border-slate-200/90 shadow-sm relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{userRole === 'admin' ? 'Unlimited Study Plans Studio' : 'Enrolled Learning Package'}</span>
            </div>
            <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">
              {activePlan ? activePlan.title : 'Study Packages & Curriculum'}
            </h2>
            <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
              {activePlan?.description || 'Select or manage structured study plans created by course administrators.'}
            </p>
          </div>

          {userRole === 'student' ? (
            <div className="p-4 rounded-2xl bg-indigo-50/80 border border-indigo-100 flex items-center gap-4 shrink-0">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                {progressPercent}%
              </div>
              <div>
                <span className="text-[10px] text-indigo-700 font-bold uppercase tracking-wider block">
                  Curriculum Progress
                </span>
                <span className="text-sm font-extrabold text-slate-800 block">
                  Day {currentDay} Active
                </span>
                <span className="text-[11px] text-slate-500">
                  {completedCount} of {currentPlanDays.length} Days Completed
                </span>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={() => setShowCreatePlanModal(true)}
                className="px-4 py-2.5 rounded-xl gradient-button text-white text-xs font-bold shadow-md shadow-indigo-100 flex items-center gap-2 transition"
              >
                <Plus className="w-4 h-4" />
                <span>Create New Weekly Plan</span>
              </button>
              <button
                onClick={handleAddDayToActivePlan}
                disabled={!activePlan}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-2 transition disabled:opacity-50"
              >
                <Plus className="w-4 h-4 text-indigo-600" />
                <span>Add Day Module</span>
              </button>
            </div>
          )}
        </div>

        {/* Progress Bar for Student */}
        {userRole === 'student' && currentPlanDays.length > 0 && (
          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-4">
            <div className="flex-1 bg-slate-100 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-indigo-600 h-full transition-all duration-500 rounded-full"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
            <span className="text-xs font-bold text-slate-600 shrink-0">
              {progressPercent === 100 ? '🎉 Package Completed!' : `${completedCount}/${currentPlanDays.length} Days Passed`}
            </span>
          </div>
        )}
      </div>

      {showSaveBanner && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 shadow-sm animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{showSaveBanner}</span>
        </div>
      )}

      {/* Plan Selector / Catalog Pills */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-600" />
            <span>Available Study Packages ({plans.length})</span>
          </span>
          {userRole === 'admin' && activePlan && (
            <button
              onClick={() => handleSetActiveDefault(activePlan.id)}
              className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
            >
              <Star className="w-3.5 h-3.5 fill-indigo-600" />
              <span>Set as Default Active Plan for Students</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-3 overflow-x-auto pb-1">
          {plans.map((p) => {
            const isSelected = activePlan?.id === p.id;
            return (
              <div
                key={p.id}
                onClick={() => handleSelectPlan(p)}
                className={`px-4 py-2.5 rounded-xl border text-xs font-bold transition cursor-pointer flex items-center gap-3 shrink-0 ${
                  isSelected
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-100'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span>{p.title}</span>
                    {p.isDefault && (
                      <span className={`text-[9px] uppercase px-1.5 py-0.5 rounded font-black ${isSelected ? 'bg-white/20 text-white' : 'bg-indigo-100 text-indigo-700'}`}>
                        Default
                      </span>
                    )}
                  </div>
                  <span className={`text-[10px] block font-medium ${isSelected ? 'text-indigo-100' : 'text-slate-400'}`}>
                    {p.durationWeeks} Week ({p.days.length} Days) • {p.category}
                  </span>
                </div>

                {userRole === 'admin' && plans.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeletePlan(p.id, p.title);
                    }}
                    className={`p-1 rounded hover:bg-rose-500/20 text-xs ${isSelected ? 'text-white' : 'text-slate-400 hover:text-rose-600'}`}
                    title="Delete Plan"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Days List Grid */}
      {currentPlanDays.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200/90 text-slate-400 text-xs">
          No day modules configured for this plan yet.
        </div>
      ) : (
        <div className="space-y-4">
          {currentPlanDays.map((d) => {
            const isCompleted = userRole === 'student' && d.dayNumber < currentDay;
            const isUnlocked = userRole === 'admin' ? (!adminSequentialLock || d.dayNumber <= currentDay) : d.dayNumber === currentDay;
            const isLocked = userRole === 'student' && d.dayNumber > currentDay && adminSequentialLock;

            return (
              <div
                key={d.dayNumber}
                className={`p-6 rounded-3xl border transition shadow-xs bg-white ${
                  d.dayNumber === currentDay
                    ? 'border-indigo-600 ring-2 ring-indigo-100'
                    : isCompleted
                    ? 'border-slate-200 bg-slate-50/50'
                    : 'border-slate-200 opacity-90'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm ${
                        isCompleted
                          ? 'bg-emerald-100 text-emerald-700'
                          : d.dayNumber === currentDay
                          ? 'gradient-button text-white shadow-md shadow-indigo-100'
                          : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : `D${d.dayNumber}`}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-slate-800">{d.title}</h3>
                        {isLocked && (
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-500 text-[10px] font-bold flex items-center gap-1">
                            <Lock className="w-3 h-3" /> Locked
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{d.objective}</p>
                    </div>
                  </div>

                  {userRole === 'admin' ? (
                    <button
                      onClick={() => setEditingDay(d)}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition self-start md:self-auto shrink-0"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Edit Module</span>
                    </button>
                  ) : (
                    d.dayNumber === currentDay && (
                      <button
                        onClick={() => handleCompleteDay(d.dayNumber)}
                        className="px-4 py-2 rounded-xl gradient-button text-white text-xs font-bold shadow-md shadow-indigo-100 flex items-center gap-2 transition self-start md:self-auto shrink-0"
                      >
                        <Check className="w-4 h-4" />
                        <span>Complete & Unlock Day {d.dayNumber + 1}</span>
                      </button>
                    )
                  )}
                </div>

                {/* Day Materials & Quizzes */}
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Documents */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                      Assigned Study PDF Documents
                    </span>
                    {d.documents && d.documents.length > 0 ? (
                      d.documents.map((doc, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200/90 hover:border-indigo-500 transition text-xs"
                        >
                          <div className="flex items-center gap-2 truncate pr-2">
                            <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
                            <span className="font-bold text-slate-800 truncate">{doc}</span>
                          </div>
                          {!isLocked && (
                            <button
                              onClick={() =>
                                setSelectedDoc({
                                  title: doc,
                                  dayNumber: d.dayNumber,
                                  objective: d.objective
                                })
                              }
                              className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[11px] flex items-center gap-1 shrink-0 transition"
                            >
                              <Eye className="w-3 h-3" /> Read
                            </button>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-400 italic">No PDF document attached.</p>
                    )}
                  </div>

                  {/* Quizzes / Practical Tasks */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5 text-purple-600" />
                      Daily Practical Assessment & Quiz
                    </span>
                    {d.quizzes && d.quizzes.length > 0 ? (
                      d.quizzes.map((quiz, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200/90 text-xs font-bold text-slate-800"
                        >
                          <span className="truncate">{quiz}</span>
                          <span className="text-[10px] text-purple-700 bg-purple-50 px-2 py-0.5 rounded font-extrabold shrink-0">
                            Required
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-400 italic">No quiz attached.</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reader Modal */}
      {selectedDoc && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-2xl bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-indigo-700 font-extrabold text-sm">
                <BookOpen className="w-5 h-5 text-indigo-600" />
                <span>Day {selectedDoc.dayNumber} Official Study Material</span>
              </div>
              <button
                onClick={() => setSelectedDoc(null)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100">
                <h3 className="text-base font-extrabold text-slate-800">{selectedDoc.title}</h3>
                <p className="text-xs text-slate-600 mt-1">{selectedDoc.objective}</p>
              </div>

              <div className="space-y-3">
                {getDocSampleContent(selectedDoc.title).sections.map((sec, i) => (
                  <div key={i} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                    <h4 className="font-bold text-xs text-slate-800">{sec.title}</h4>
                    <p className="text-xs text-slate-600 leading-relaxed">{sec.text}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedDoc(null)}
                className="px-5 py-2 rounded-xl gradient-button text-white text-xs font-bold shadow-md shadow-indigo-100"
              >
                Done Reading
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create New Unlimited Weekly Plan */}
      {showCreatePlanModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-indigo-700 font-extrabold text-sm">
                <Plus className="w-5 h-5 text-indigo-600" />
                <span>Create Unlimited Weekly Study Plan</span>
              </div>
              <button
                onClick={() => setShowCreatePlanModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePlan} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Study Plan Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., 4-Week Agentic AI & RAG Engineering Bootcamp"
                  value={newPlanTitle}
                  onChange={(e) => setNewPlanTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 font-medium focus:outline-none focus:bg-white focus:border-indigo-600 transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Category / Topic</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Generative AI"
                    value={newPlanCategory}
                    onChange={(e) => setNewPlanCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 font-medium focus:outline-none focus:border-indigo-600 transition"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Duration (Weeks)</label>
                  <select
                    value={newPlanDurationWeeks}
                    onChange={(e) => setNewPlanDurationWeeks(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 font-bold focus:outline-none focus:border-indigo-600 transition"
                  >
                    <option value={1}>1 Week (7 Days)</option>
                    <option value={2}>2 Weeks (14 Days)</option>
                    <option value={4}>4 Weeks (28 Days)</option>
                    <option value={8}>8 Weeks (56 Days)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={3}
                  placeholder="Summarize course goals, prerequisite knowledge, and final certification requirements..."
                  value={newPlanDescription}
                  onChange={(e) => setNewPlanDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 font-medium focus:outline-none focus:bg-white focus:border-indigo-600 transition"
                />
              </div>

              <div className="p-3.5 rounded-2xl bg-indigo-50/60 border border-indigo-100 text-slate-600 leading-relaxed">
                <span className="font-bold text-slate-800 block mb-1">⚡ Auto-Generated Day Modules</span>
                Will automatically scaffold <strong>{newPlanDurationWeeks * 7} daily lesson modules</strong> ready for you to attach PDF materials and custom objectives.
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreatePlanModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPlan}
                  className="px-5 py-2 rounded-xl gradient-button text-white font-bold shadow-md shadow-indigo-100 transition"
                >
                  {submittingPlan ? 'Scaffolding Plan...' : 'Generate Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Single Day Module */}
      {editingDay && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-indigo-700 font-extrabold text-sm">
                <Edit2 className="w-5 h-5 text-indigo-600" />
                <span>Edit Module: Day {editingDay.dayNumber}</span>
              </div>
              <button
                onClick={() => setEditingDay(null)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Module Title *</label>
                <input
                  type="text"
                  value={editingDay.title}
                  onChange={(e) => setEditingDay({ ...editingDay, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 font-medium focus:outline-none focus:bg-white focus:border-indigo-600 transition"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Learning Objective *</label>
                <textarea
                  rows={3}
                  value={editingDay.objective}
                  onChange={(e) => setEditingDay({ ...editingDay, objective: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 font-medium focus:outline-none focus:bg-white focus:border-indigo-600 transition"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Assign Document PDF</label>
                <select
                  value={editingDay.documents[0] || ''}
                  onChange={(e) => setEditingDay({ ...editingDay, documents: [e.target.value] })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 font-bold focus:outline-none focus:border-indigo-600 transition"
                >
                  <option value="">Select PDF from Knowledge Base...</option>
                  {availablePdfs.map((pdf) => (
                    <option key={pdf.id} value={pdf.filename}>
                      {pdf.filename} ({pdf.category})
                    </option>
                  ))}
                  <option value="Machine Learning 101 Foundations.pdf">Machine Learning 101 Foundations.pdf</option>
                  <option value="AI Software Engineering Handbook.pdf">AI Software Engineering Handbook.pdf</option>
                  <option value="Enterprise RAG Systems Architecture.pdf">Enterprise RAG Systems Architecture.pdf</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Quiz / Assessment Name</label>
                <input
                  type="text"
                  value={editingDay.quizzes[0] || ''}
                  onChange={(e) => setEditingDay({ ...editingDay, quizzes: [e.target.value] })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 font-medium focus:outline-none focus:bg-white focus:border-indigo-600 transition"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingDay(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveDayEdit}
                  className="px-5 py-2 rounded-xl gradient-button text-white font-bold shadow-md shadow-indigo-100 transition flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Changes</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

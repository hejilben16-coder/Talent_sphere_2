import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Sparkles,
  Play,
  RotateCcw,
  CheckCircle2,
  Award,
  Brain,
  ShieldCheck,
  Send,
  Plus,
  Edit2,
  Trash2,
  Users,
  Settings,
  FileText,
  Radio,
  X
} from 'lucide-react';

interface VoiceInterviewViewProps {
  token: string;
  userRole?: string;
}

interface QuestionItem {
  id: string;
  question: string;
  expectedKeywords: string[];
}

interface StudentSubmission {
  id: string;
  studentName: string;
  studentEmail: string;
  date: string;
  overallScore: number;
  techScore: number;
  clarityScore: number;
  transcriptCount: number;
  feedback: string;
  transcript: { sender: 'ai' | 'user'; text: string }[];
}

export const VoiceInterviewView: React.FC<VoiceInterviewViewProps> = ({
  token,
  userRole = 'student'
}) => {
  // Session states for student interactive voice interview
  const [sessionActive, setSessionActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioMuted, setAudioMuted] = useState(false);
  const [recording, setRecording] = useState(false);
  const [handsFreeMode, setHandsFreeMode] = useState(true);
  const [userResponse, setUserResponse] = useState('');
  const [liveInterim, setLiveInterim] = useState('');
  const [history, setHistory] = useState<{ sender: 'ai' | 'user'; text: string }[]>([]);
  const [isEvaluating, setIsEvaluating] = useState(false);

  const recognitionRef = useRef<any>(null);

  // Question Bank
  const [questions, setQuestions] = useState<QuestionItem[]>([
    {
      id: 'q1',
      question:
        "Welcome to your Talent Sphere AI Technical Voice Interview! Let's begin: Can you explain the fundamental difference between Supervised and Unsupervised Machine Learning, and provide an everyday example of each?",
      expectedKeywords: ['labeled data', 'clustering', 'classification', 'regression', 'unlabeled']
    },
    {
      id: 'q2',
      question:
        'Great breakdown! Question 2: What is Retrieval-Augmented Generation (RAG), and why is it preferred over fine-tuning for standard enterprise knowledge bases?',
      expectedKeywords: ['vector database', 'retrieval', 'embeddings', 'hallucinations', 'source citation']
    },
    {
      id: 'q3',
      question:
        'Excellent! Question 3: How do you address overfitting in machine learning models during training, and why is cross-validation critical?',
      expectedKeywords: ['regularization', 'dropout', 'cross-validation', 'test set', 'generalization']
    },
    {
      id: 'q4',
      question:
        'Final Question: In an AI system, how do Cosine Similarity and Vector Embeddings enable semantic search across PDF documents?',
      expectedKeywords: ['vector space', 'angle', 'semantic similarity', 'distance', 'embeddings']
    }
  ]);

  // Student Submissions for Admin View
  const [submissions, setSubmissions] = useState<StudentSubmission[]>([
    {
      id: 'sub_1',
      studentName: 'Alex Rivera',
      studentEmail: 'student@talentsphere.ai',
      date: new Date(Date.now() - 3600000).toLocaleString(),
      overallScore: 92,
      techScore: 90,
      clarityScore: 94,
      transcriptCount: 8,
      feedback:
        'Outstanding interview performance! Demonstrated strong conceptual mastery of supervised learning, vector similarity search, and RAG architectures.',
      transcript: [
        {
          sender: 'ai',
          text: "Welcome to your Talent Sphere AI Technical Voice Interview! Can you explain Supervised vs Unsupervised ML?"
        },
        {
          sender: 'user',
          text: 'Supervised learning uses labeled datasets like predicting house prices, while unsupervised discovers clusters in unlabeled customer data.'
        },
        {
          sender: 'ai',
          text: 'Great breakdown! What is Retrieval-Augmented Generation (RAG)?'
        },
        {
          sender: 'user',
          text: 'RAG retrieves context chunks from a vector database and grounds the LLM prompt to prevent hallucinations and cite PDF sources.'
        }
      ]
    }
  ]);

  const [selectedSubmission, setSelectedSubmission] = useState<StudentSubmission | null>(null);

  // Admin New Question State
  const [editingQuestion, setEditingQuestion] = useState<QuestionItem | null>(null);
  const [newQuestionText, setNewQuestionText] = useState('');
  const [newKeywordsText, setNewKeywordsText] = useState('');

  const totalSteps = questions.length;

  const [finalReport, setFinalReport] = useState<{
    overallScore: number;
    techScore: number;
    clarityScore: number;
    feedback: string;
    strengths: string[];
    improvements: string[];
  } | null>(null);

  const speechIntervalRef = useRef<any>(null);
  const silenceTimerRef = useRef<any>(null);

  // Clean text for speech engine (remove markdown formatting, emojis, citations)
  const cleanTextForSpeech = (rawText: string): string => {
    return rawText
      .replace(/[*_~`#]/g, '')
      .replace(/\[.*?\]/g, '')
      .replace(/https?:\/\/\S+/g, '')
      .trim();
  };

  // Robust Speak AI text aloud with Chrome keep-alive & chunking
  const speakText = (text: string, onEndedCallback?: () => void) => {
    if (audioMuted) {
      if (onEndedCallback) onEndedCallback();
      return;
    }

    if (!('speechSynthesis' in window)) {
      if (onEndedCallback) onEndedCallback();
      else if (handsFreeMode) startListeningMicrophone();
      return;
    }

    stopAudio();
    const clean = cleanTextForSpeech(text);
    if (!clean) return;

    window.speechSynthesis.resume();

    // Split long speech into natural sentence chunks to bypass Chrome 15s speech timeout bug
    const sentences = clean.match(/[^.!?]+[.!?]+/g) || [clean];
    let sentenceIndex = 0;

    const speakNextSentence = () => {
      if (sentenceIndex >= sentences.length) {
        setIsSpeaking(false);
        if (speechIntervalRef.current) clearInterval(speechIntervalRef.current);
        if (onEndedCallback) {
          onEndedCallback();
        } else if (handsFreeMode) {
          startListeningMicrophone();
        }
        return;
      }

      const utterance = new SpeechSynthesisUtterance(sentences[sentenceIndex].trim());
      utterance.rate = 0.95;
      utterance.pitch = 1.0;
      utterance.lang = 'en-US';

      utterance.onstart = () => setIsSpeaking(true);

      utterance.onend = () => {
        sentenceIndex++;
        speakNextSentence();
      };

      utterance.onerror = (e) => {
        console.warn('Speech synthesis error on chunk, skipping to next:', e);
        sentenceIndex++;
        speakNextSentence();
      };

      window.speechSynthesis.speak(utterance);
    };

    // Keep-alive pulse for browser speech engine
    if (speechIntervalRef.current) clearInterval(speechIntervalRef.current);
    speechIntervalRef.current = setInterval(() => {
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.pause();
        window.speechSynthesis.resume();
      }
    }, 5000);

    speakNextSentence();
  };

  const stopAudio = () => {
    if (speechIntervalRef.current) clearInterval(speechIntervalRef.current);
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  };

  // Live Microphone Listening (IRL Turn-taking with silence detection)
  const startListeningMicrophone = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      setLiveInterim('Browser speech recognition not supported. Type your response below.');
      return;
    }

    try {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }

      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setRecording(true);
        setLiveInterim('🎙️ Listening... Speak your answer now!');
      };

      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const trans = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += trans + ' ';
          } else {
            interimTranscript += trans;
          }
        }

        const currentText = (userResponse + ' ' + finalTranscript + interimTranscript).trim();
        setUserResponse(currentText);
        setLiveInterim(interimTranscript || 'Listening...');

        // Silence auto-submit timer (3 seconds of silence after speech)
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        if (currentText.length > 5) {
          silenceTimerRef.current = setTimeout(() => {
            if (recording && currentText.trim().length > 5) {
              handleSubmitResponse(currentText);
            }
          }, 3000);
        }
      };

      recognition.onerror = (err: any) => {
        console.warn('Speech recognition error:', err);
        setRecording(false);
      };

      recognition.onend = () => {
        setRecording(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      console.error('Error launching speech recognition:', e);
      setRecording(false);
    }
  };

  const stopListeningMicrophone = () => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (_) {}
    }
    setRecording(false);
  };

  const startInterview = () => {
    setSessionActive(true);
    setCurrentStep(1);
    setFinalReport(null);
    setUserResponse('');
    setLiveInterim('');
    const q1 = questions[0].question;
    setHistory([{ sender: 'ai', text: q1 }]);
    speakText(q1);
  };

  const handleSubmitResponse = async (explicitAns?: string) => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    stopListeningMicrophone();
    stopAudio();

    const currentAns = (explicitAns || userResponse || liveInterim).trim();
    if (!currentAns) return;

    setUserResponse('');
    setLiveInterim('');

    const newHistory = [...history, { sender: 'user' as const, text: currentAns }];
    setHistory(newHistory);
    setIsEvaluating(true);

    try {
      const currentQ = questions[Math.min(currentStep - 1, questions.length - 1)];
      const res = await fetch('/api/voice-interview/turn', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          step: currentStep,
          totalSteps,
          question: currentQ.question,
          userSpokenAnswer: currentAns,
          history: newHistory,
          expectedKeywords: currentQ.expectedKeywords
        })
      });

      const data = await res.json();
      setIsEvaluating(false);

      if (data.spokenResponse) {
        const aiMessage = data.spokenResponse;
        
        if (!data.isFinished && currentStep < totalSteps) {
          const nextStepNum = currentStep + 1;
          setCurrentStep(nextStepNum);
          
          const nextQ = questions[nextStepNum - 1]?.question || 'Let us continue.';
          const fullAiSpeech = `${aiMessage} Next question: ${nextQ}`;

          setHistory((prev) => [
            ...prev,
            { sender: 'ai', text: aiMessage },
            { sender: 'ai', text: `Question ${nextStepNum}: ${nextQ}` }
          ]);

          speakText(fullAiSpeech);
        } else {
          // Conclude interview session
          setSessionActive(false);
          setHistory((prev) => [...prev, { sender: 'ai', text: aiMessage }]);

          if (data.finalReport) {
            setFinalReport(data.finalReport);

            const newSub: StudentSubmission = {
              id: `sub_${Date.now()}`,
              studentName: 'Alex Rivera',
              studentEmail: 'student@talentsphere.ai',
              date: new Date().toLocaleString(),
              overallScore: data.finalReport.overallScore,
              techScore: data.finalReport.techScore,
              clarityScore: data.finalReport.clarityScore,
              transcriptCount: newHistory.length + 1,
              feedback: data.finalReport.feedback,
              transcript: [...newHistory, { sender: 'ai', text: aiMessage }]
            };
            setSubmissions((prev) => [newSub, ...prev]);
          }
          speakText(aiMessage);
        }
      }
    } catch (err) {
      console.error('Error submitting voice turn:', err);
      setIsEvaluating(false);

      // Fallback transition
      if (currentStep < totalSteps) {
        const nextStepNum = currentStep + 1;
        setCurrentStep(nextStepNum);
        const nextQ = questions[nextStepNum - 1].question;
        setHistory((prev) => [...prev, { sender: 'ai', text: nextQ }]);
        speakText(nextQ);
      } else {
        setSessionActive(false);
      }
    }
  };

  const handleSaveQuestion = () => {
    if (!newQuestionText.trim()) return;
    const keywords = newKeywordsText.split(',').map((k) => k.trim()).filter(Boolean);

    if (editingQuestion) {
      setQuestions((prev) =>
        prev.map((q) =>
          q.id === editingQuestion.id
            ? { ...q, question: newQuestionText, expectedKeywords: keywords }
            : q
        )
      );
    } else {
      const newQ: QuestionItem = {
        id: `q_${Date.now()}`,
        question: newQuestionText,
        expectedKeywords: keywords
      };
      setQuestions((prev) => [...prev, newQ]);
    }

    setEditingQuestion(null);
    setNewQuestionText('');
    setNewKeywordsText('');
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 md:p-8 rounded-3xl bg-white border border-slate-200/90 shadow-sm relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs tracking-wider uppercase mb-1">
              <Sparkles className="w-4 h-4" />
              <span>{userRole === 'admin' ? 'Voice Interview Control Portal' : 'Interactive IRL Voice Assistant'}</span>
            </div>
            <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">
              {userRole === 'admin' ? 'AI Voice Interview Control & Submissions' : 'AI Technical Voice Interview'}
            </h2>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
              {userRole === 'admin'
                ? 'Oversee candidate voice interviews, manage interview question banks, review speech-to-text transcripts, and inspect AI evaluation scores.'
                : 'Experience real-time interactive voice turn-taking. The AI speaks questions aloud and automatically listens for your spoken answer.'}
            </p>
          </div>

          {userRole === 'student' && (
            <div className="flex items-center gap-3">
              <button
                onClick={() => setHandsFreeMode(!handsFreeMode)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold border flex items-center gap-2 transition ${
                  handsFreeMode
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                    : 'bg-slate-100 border-slate-200 text-slate-600'
                }`}
                title="Toggle Hands-Free Conversational Mode"
              >
                <Radio className={`w-4 h-4 ${handsFreeMode ? 'text-indigo-600 animate-pulse' : ''}`} />
                <span>Hands-Free Auto-Listen: {handsFreeMode ? 'ON' : 'OFF'}</span>
              </button>

              <button
                onClick={() => {
                  setAudioMuted(!audioMuted);
                  if (!audioMuted) stopAudio();
                }}
                className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition ${
                  audioMuted
                    ? 'bg-rose-50 text-rose-600 border-rose-200'
                    : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                }`}
              >
                {audioMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-emerald-600" />}
                <span>{audioMuted ? 'Muted' : 'Voice On'}</span>
              </button>

              {!sessionActive && (
                <button
                  onClick={startInterview}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-100 flex items-center gap-2 transition"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Start Voice Interview</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ADMIN CONTROL VIEW */}
      {userRole === 'admin' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Question Bank Manager */}
          <div className="lg:col-span-2 space-y-4">
            <div className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Brain className="w-5 h-5 text-indigo-600" />
                  <h3 className="font-extrabold text-base text-slate-800">Interview Question Bank</h3>
                </div>
                <button
                  onClick={() => {
                    setEditingQuestion({ id: '', question: '', expectedKeywords: [] });
                    setNewQuestionText('');
                    setNewKeywordsText('');
                  }}
                  className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-100 flex items-center gap-1.5 transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add New Question</span>
                </button>
              </div>

              <div className="space-y-3">
                {questions.map((q, idx) => (
                  <div key={q.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-md border border-indigo-100">
                        Question {idx + 1}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setEditingQuestion(q);
                            setNewQuestionText(q.question);
                            setNewKeywordsText(q.expectedKeywords.join(', '));
                          }}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition"
                          title="Edit Question"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setQuestions((prev) => prev.filter((item) => item.id !== q.id))}
                          className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition"
                          title="Delete Question"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <p className="text-xs font-semibold text-slate-800 leading-relaxed">{q.question}</p>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {q.expectedKeywords.map((kw, i) => (
                        <span key={i} className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600 text-[10px] font-bold">
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Student Submissions List */}
          <div className="space-y-4">
            <div className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-sm space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                <Users className="w-5 h-5 text-indigo-600" />
                <h3 className="font-extrabold text-base text-slate-800">Student Voice Attempts</h3>
              </div>

              <div className="space-y-3">
                {submissions.map((sub) => (
                  <div
                    key={sub.id}
                    onClick={() => setSelectedSubmission(sub)}
                    className="p-4 rounded-2xl bg-slate-50 hover:bg-indigo-50/50 border border-slate-200 hover:border-indigo-200 cursor-pointer transition space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">{sub.studentName}</span>
                      <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-extrabold text-xs">
                        {sub.overallScore}%
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 block">{sub.studentEmail} • {sub.date}</span>
                    <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">{sub.feedback}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* STUDENT INTERACTIVE VIEW */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {sessionActive ? (
              <div className="rounded-3xl bg-white border border-slate-200/90 p-6 space-y-5 shadow-sm">
                {/* Step Progress & Live Voice Status */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-extrabold text-xs">
                      Q{currentStep}
                    </div>
                    <div>
                      <span className="text-xs font-extrabold text-slate-800 block">
                        Technical Question {currentStep} of {totalSteps}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        Interactive Real-Time Speech Synthesis
                      </span>
                    </div>
                  </div>

                  {/* Active Voice Waveform Indicator */}
                  {isSpeaking && (
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold animate-pulse">
                      <Volume2 className="w-4 h-4" />
                      <span>AI Interviewer Speaking...</span>
                    </div>
                  )}

                  {recording && (
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold animate-pulse">
                      <Radio className="w-4 h-4 text-rose-600" />
                      <span>Microphone Listening... Speak Now</span>
                    </div>
                  )}
                </div>

                {/* Chat Transcript Thread */}
                <div className="space-y-4 max-h-[380px] overflow-y-auto pr-2">
                  {history.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex gap-3 ${
                        msg.sender === 'user' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      {msg.sender === 'ai' && (
                        <div className="w-8 h-8 rounded-xl gradient-button flex items-center justify-center text-white shrink-0 text-xs font-bold shadow-xs">
                          AI
                        </div>
                      )}
                      <div
                        className={`max-w-[85%] p-4 rounded-2xl text-xs leading-relaxed ${
                          msg.sender === 'user'
                            ? 'bg-indigo-600 text-white rounded-br-none shadow-xs font-medium'
                            : 'bg-slate-100 text-slate-800 border border-slate-200/80 rounded-bl-none font-medium'
                        }`}
                      >
                        <p>{msg.text}</p>
                      </div>
                    </div>
                  ))}

                  {/* Interim Live Transcript */}
                  {recording && liveInterim && (
                    <div className="flex justify-end">
                      <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-900 border border-indigo-200 text-xs italic animate-pulse">
                        🎙️ {liveInterim}
                      </div>
                    </div>
                  )}

                  {isEvaluating && (
                    <div className="flex items-center gap-2 text-xs text-indigo-600 animate-pulse p-2 font-bold">
                      <Sparkles className="w-4 h-4" />
                      <span>Evaluating response accuracy & speech semantics...</span>
                    </div>
                  )}
                </div>

                {/* Student Speech & Input Control */}
                <div className="pt-2 border-t border-slate-100 space-y-3">
                  <div className="flex gap-2">
                    <textarea
                      rows={2}
                      value={userResponse}
                      onChange={(e) => setUserResponse(e.target.value)}
                      placeholder="Speak using your mic or type technical answer here..."
                      className="flex-1 p-3 rounded-xl bg-slate-50 border border-slate-300 text-slate-800 placeholder-slate-400 text-xs focus:outline-none focus:bg-white focus:border-indigo-600 resize-none font-medium"
                    />

                    <div className="flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (recording) {
                            stopListeningMicrophone();
                          } else {
                            startListeningMicrophone();
                          }
                        }}
                        className={`p-3 rounded-xl border transition flex items-center justify-center ${
                          recording
                            ? 'bg-rose-600 text-white border-rose-500 animate-pulse shadow-md'
                            : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                        }`}
                        title={recording ? 'Stop Recording Speech' : 'Start Speech Microphone'}
                      >
                        {recording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                      </button>

                      <button
                        onClick={() => handleSubmitResponse()}
                        disabled={!userResponse.trim()}
                        className="p-3 rounded-xl bg-indigo-600 text-white disabled:opacity-40 flex items-center justify-center shadow-md shadow-indigo-100 hover:bg-indigo-700 transition"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 px-1 font-medium">
                    <span>💡 IRL Mode: When the AI finishes speaking, your mic automatically listens.</span>
                    <button
                      onClick={() => {
                        stopAudio();
                        stopListeningMicrophone();
                        setSessionActive(false);
                      }}
                      className="text-rose-600 font-bold hover:underline"
                    >
                      End Interview
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Idle Screen */
              <div className="rounded-3xl bg-white border border-slate-200/90 p-8 text-center space-y-5 shadow-sm">
                <div className="w-16 h-16 rounded-3xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto shadow-xs">
                  <Brain className="w-8 h-8" />
                </div>

                <div className="max-w-md mx-auto space-y-2">
                  <h3 className="text-lg font-extrabold text-slate-800">
                    Ready for Interactive AI Voice Interview?
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    The AI interviewer will speak questions aloud. In hands-free mode, your microphone turns on automatically after each question for a seamless natural voice interaction.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-lg mx-auto text-left pt-2">
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                    <Volume2 className="w-4 h-4 text-indigo-600" />
                    <span className="text-xs font-bold text-slate-800 block">Voice Speech Synth</span>
                    <span className="text-[10px] text-slate-500">Speaks interview questions aloud cleanly.</span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                    <Radio className="w-4 h-4 text-purple-600" />
                    <span className="text-xs font-bold text-slate-800 block">Auto Turn-Taking</span>
                    <span className="text-[10px] text-slate-500">Automatically listens for spoken answers.</span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                    <Award className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-bold text-slate-800 block">AI Evaluation</span>
                    <span className="text-[10px] text-slate-500">Automated rubric & clarity feedback.</span>
                  </div>
                </div>

                <button
                  onClick={startInterview}
                  className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-100 inline-flex items-center gap-2 transition"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Begin Interactive Voice Interview</span>
                </button>
              </div>
            )}
          </div>

          {/* Right Column Scorecard */}
          <div className="space-y-4">
            {finalReport ? (
              <div className="rounded-3xl bg-white border border-slate-200/90 p-6 space-y-5 shadow-sm">
                <div className="flex items-center gap-2 text-emerald-700 font-bold text-xs tracking-wider uppercase">
                  <Award className="w-4 h-4" />
                  <span>Interview Evaluation Scorecard</span>
                </div>

                <div className="text-center p-4 rounded-2xl bg-indigo-50 border border-indigo-100 space-y-1">
                  <span className="text-[11px] text-indigo-700 font-bold uppercase tracking-wider">
                    Overall Candidate Score
                  </span>
                  <div className="text-4xl font-extrabold text-slate-900">
                    {finalReport.overallScore}%
                  </div>
                  <span className="inline-block px-3 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold">
                    PASS - CERTIFIED CANDIDATE
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] text-slate-500 block font-bold">
                      Technical Score
                    </span>
                    <span className="text-lg font-extrabold text-indigo-700">
                      {finalReport.techScore}%
                    </span>
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] text-slate-500 block font-bold">
                      Verbal Clarity
                    </span>
                    <span className="text-lg font-extrabold text-purple-700">
                      {finalReport.clarityScore}%
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-800 block">AI Feedback Summary</span>
                  <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-2xl border border-slate-200">
                    {finalReport.feedback}
                  </p>
                </div>

                <button
                  onClick={startInterview}
                  className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold border border-slate-200 flex items-center justify-center gap-2 transition"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Retake Voice Interview</span>
                </button>
              </div>
            ) : (
              <div className="rounded-3xl bg-white border border-slate-200/90 p-6 space-y-4 shadow-sm">
                <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-indigo-600" />
                  <span>Evaluation Rubric</span>
                </h3>

                <div className="space-y-3 text-xs text-slate-600">
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                    <span className="font-bold text-slate-800 block">1. Concept Accuracy (40%)</span>
                    <span>Correct identification of machine learning & RAG terminology.</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                    <span className="font-bold text-slate-800 block">2. Speech Clarity (30%)</span>
                    <span>Clear pronunciation, logical structure, and articulate verbal pacing.</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                    <span className="font-bold text-slate-800 block">3. Practical Examples (30%)</span>
                    <span>Providing real-world applications and vector distance calculations.</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Admin Edit Question Modal */}
      {editingQuestion && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-lg rounded-3xl bg-white border border-slate-200 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-base text-slate-800">
                {editingQuestion.id ? 'Edit Interview Question' : 'Create New Interview Question'}
              </h3>
              <button onClick={() => setEditingQuestion(null)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Technical Question Prompt</label>
                <textarea
                  rows={3}
                  value={newQuestionText}
                  onChange={(e) => setNewQuestionText(e.target.value)}
                  placeholder="Enter technical question for voice interview..."
                  className="w-full p-3 rounded-xl bg-slate-50 border border-slate-300 text-slate-800 text-xs font-medium focus:outline-none focus:bg-white focus:border-indigo-600 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Expected Key Terms (comma separated)</label>
                <input
                  type="text"
                  value={newKeywordsText}
                  onChange={(e) => setNewKeywordsText(e.target.value)}
                  placeholder="e.g. vector database, cosine similarity, embeddings"
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-800 text-xs font-medium focus:outline-none focus:bg-white focus:border-indigo-600"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
              <button onClick={() => setEditingQuestion(null)} className="px-4 py-2 rounded-xl text-slate-600 text-xs font-bold hover:bg-slate-100">
                Cancel
              </button>
              <button onClick={handleSaveQuestion} className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700">
                Save Question
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin View Submission Transcript Modal */}
      {selectedSubmission && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-2xl rounded-3xl bg-white border border-slate-200 shadow-2xl p-6 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Candidate Evaluation</span>
                <h3 className="font-extrabold text-base text-slate-800">{selectedSubmission.studentName} Transcript</h3>
              </div>
              <button onClick={() => setSelectedSubmission(null)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 p-2">
              {selectedSubmission.transcript.map((msg, idx) => (
                <div key={idx} className={`p-3 rounded-2xl text-xs ${msg.sender === 'ai' ? 'bg-indigo-50 text-indigo-900 font-medium' : 'bg-slate-100 text-slate-800 font-medium'}`}>
                  <strong className="block text-[10px] text-slate-500 uppercase mb-1">{msg.sender === 'ai' ? 'AI Interviewer' : 'Candidate'}</strong>
                  <p>{msg.text}</p>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button onClick={() => setSelectedSubmission(null)} className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold">
                Close Log
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

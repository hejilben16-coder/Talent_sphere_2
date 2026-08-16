import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Bot,
  User,
  Trash2,
  Copy,
  RotateCcw,
  BookOpen,
  Sparkles,
  FileText,
  Check,
  AlertTriangle,
  Paperclip,
  UploadCloud,
  RefreshCw,
  Mic
} from 'lucide-react';
import { ChatMessage } from '../types';

interface AIAssistantProps {
  token: string;
<<<<<<< Updated upstream
  userRole?: 'admin' | 'student';
}

export const AIAssistant: React.FC<AIAssistantProps> = ({ token, userRole }) => {
=======
  role: 'admin' | 'student';
}

export const AIAssistant: React.FC<AIAssistantProps> = ({ token, role }) => {
>>>>>>> Stashed changes
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recogRef = useRef<any>(null);

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/chat/history', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (_) {}
  };

  useEffect(() => {
    fetchHistory();
  }, [token]);

  useEffect(() => {
    // Initialize speech recognition if available
    const SpeechRecognition: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSpeechSupported(true);
      recogRef.current = new SpeechRecognition();
      recogRef.current.lang = 'en-US';
      recogRef.current.interimResults = false;
      recogRef.current.maxAlternatives = 1;
      recogRef.current.onresult = (ev: any) => {
        const text = ev.results[0][0].transcript;
        handleSend(text);
      };
      recogRef.current.onstart = () => setListening(true);
      recogRef.current.onend = () => setListening(false);
      recogRef.current.onerror = (ev: any) => {
        setListening(false);
        setSpeechError('Voice input failed: ' + (ev.error || 'Unknown error'));
      };
    } else {
      setSpeechSupported(false);
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || loading) return;

    if (!textToSend) setInput('');
    setLoading(true);

    // Optimistic UI update
    const optimisticUserMsg: ChatMessage = {
      id: `temp_${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toISOString()
    };
    setMessages((prev) => [...prev, optimisticUserMsg]);

    try {
      // Ask server to classify intent using LLM
      let intent = 'chat';
      try {
        const intentRes = await fetch('/api/intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ text: query })
        });
        if (intentRes.ok) {
          const intentJson = await intentRes.json();
          intent = intentJson.intent || 'chat';
        }
      } catch (_) {
        intent = 'chat';
      }

      // Handle admin-level intents with confirmation
      if (intent === 'generate_exam') {
        const ok = window.confirm('Create an exam from uploaded PDFs now? This will generate and save an exam. Continue?');
        if (!ok) {
          setLoading(false);
          return;
        }

        const docsRes = await fetch('/api/documents', { headers: { Authorization: `Bearer ${token}` } });
        if (!docsRes.ok) {
          throw new Error('Failed to load uploaded documents before generating exam');
        }
        const docs = await docsRes.json();
        const docIds = docs.map((d: any) => d.id);
        const genRes = await fetch('/api/exams/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            title: query.substring(0, 120) || 'Voice Generated Exam',
            description: 'Exam generated via voice assistant',
            selectedDocIds: docIds,
            questionType: 'mixed',
            difficulty: 'Medium',
            questionCount: 5,
            durationMinutes: 15
          })
        });

        if (genRes.ok) {
          const exam = await genRes.json();
          const aiMsg = {
            id: `msg_${Date.now()}_ai`,
            sender: 'ai' as const,
            text: `Exam created: ${exam.title} (ID: ${exam.id})`,
            timestamp: new Date().toISOString(),
            sources: []
          };
          dbSafeAdd(aiMsg);
          speak(aiMsg.text);
          setLoading(false);
          return;
        } else {
          const errData = await genRes.json().catch(() => ({}));
          const message = errData.error || 'Unable to generate exam with current permissions.';
          throw new Error(message);
        }
      }

      if (intent === 'create_announcement' || intent === 'create_notification') {
        const ok = window.confirm('Create an announcement for users? Confirm to post.');
        if (!ok) {
          setLoading(false);
          return;
        }

        const title = query.substring(0, 60);
        const resNote = await fetch('/api/notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ title: `Announcement: ${title}`, message: query })
        });
        if (resNote.ok) {
          const note = await resNote.json();
          const aiMsg = {
            id: `msg_${Date.now()}_ai`,
            sender: 'ai' as const,
            text: `Announcement created: ${note.title}`,
            timestamp: new Date().toISOString(),
            sources: []
          };
          dbSafeAdd(aiMsg);
          speak(aiMsg.text);
          setLoading(false);
          return;
        }
      }

      const res = await fetch('/api/chat/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ text: query })
      });

      if (!res.ok) throw new Error('Failed to send message');
      const data = await res.json();

      const received = data.message;
      setMessages((prev) => prev.map((m) => (m.id === optimisticUserMsg.id ? optimisticUserMsg : m)).concat(received));
      // speak AI reply
      if (received && received.text) speak(received.text);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          sender: 'ai',
          text: 'An error occurred while generating response from the PDF RAG engine.',
          timestamp: new Date().toISOString()
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const dbSafeAdd = (aiMsg: ChatMessage) => {
    // Add to local UI and persist to DB
    setMessages((prev) => [...prev, aiMsg]);
    try { fetch('/api/chat/message', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ text: aiMsg.text }) }); } catch (_) {}
  };

  const speak = (text: string) => {
    try {
      const synth = window.speechSynthesis;
      if (!synth) return;
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-US';
      synth.cancel();
      synth.speak(u);
    } catch (_) {}
  };

  const handleDirectPdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    setUploadingPdf(true);

    try {
      let uploadSuccess = false;
      try {
        const buffer = await file.arrayBuffer();
        const res = await fetch('/api/documents/upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/pdf',
            'X-File-Name': encodeURIComponent(file.name),
            Authorization: `Bearer ${token}`
          },
          body: buffer
        });
        if (res.ok) uploadSuccess = true;
      } catch (_) {}

      if (!uploadSuccess) {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const resStr = reader.result as string;
            resolve(resStr.includes(',') ? resStr.split(',')[1] : resStr);
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        const res = await fetch('/api/documents/upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ fileName: file.name, fileBase64: base64 })
        });
        if (res.ok) uploadSuccess = true;
      }

      if (uploadSuccess) {
        const sysMsg: ChatMessage = {
          id: `sys_${Date.now()}`,
          sender: 'ai',
          text: `📄 **Document Added to Knowledge Base**: "${file.name}" was successfully uploaded, chunked, and indexed. You can now ask questions directly about this document!`,
          timestamp: new Date().toISOString()
        };
        setMessages((prev) => [...prev, sysMsg]);
      } else {
        alert('Failed to process PDF document. Please check file format.');
      }
    } catch (err: any) {
      alert(`Upload error: ${err.message || 'Failed to upload PDF'}`);
    } finally {
      setUploadingPdf(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleClearHistory = async () => {
    if (!confirm('Are you sure you want to clear your conversation history?')) return;
    try {
      await fetch('/api/chat/history', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessages([]);
    } catch (_) {}
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const samplePrompts = [
    'What are the primary definitions outlined in the course materials?',
    'Explain the RAG pipeline step-by-step with citations.',
    'Summarize key topics required for the upcoming exam.'
  ];

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col rounded-3xl bg-slate-900 border border-slate-800 overflow-hidden">
      {/* Chat Header */}
      <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
              <span>RAG AI Knowledge Assistant</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/20">
                Grounding Active
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Answers generated exclusively from your uploaded PDF Knowledge Base
            </p>
          </div>
        </div>

        <button
          onClick={handleClearHistory}
          className="p-2 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition"
          title="Clear Chat History"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 p-6 overflow-y-auto space-y-6">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-6 max-w-lg mx-auto">
            <div className="w-16 h-16 rounded-3xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <Sparkles className="w-8 h-8 animate-pulse" />
            </div>
            <div>
              <h4 className="font-bold text-slate-200 text-lg">
                Ask Talent Sphere RAG Engine
              </h4>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Start a conversation to retrieve accurate answers, view exact page numbers, and review source citations from uploaded documents.
              </p>
            </div>

            <div className="w-full space-y-2">
              {samplePrompts.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(prompt)}
                  className="w-full p-3 rounded-2xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/50 text-left text-xs text-slate-300 hover:text-white transition flex items-center justify-between"
                >
                  <span>{prompt}</span>
                  <BookOpen className="w-4 h-4 text-indigo-400 shrink-0" />
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-4 ${
                msg.sender === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {msg.sender === 'ai' && (
                <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white shrink-0 mt-1">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-2xl rounded-2xl p-4 space-y-3 ${
                  msg.sender === 'user'
                    ? 'bg-indigo-600 text-white rounded-tr-none'
                    : 'bg-slate-800/80 border border-slate-700/60 text-slate-200 rounded-tl-none'
                }`}
              >
                <div className="text-xs leading-relaxed whitespace-pre-wrap">
                  {msg.text}
                </div>

                {/* Sources Citations Footer for AI Messages */}
                {msg.sources && msg.sources.length > 0 && (
                  <div className="pt-3 border-t border-slate-700/50 space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1">
                      <BookOpen className="w-3 h-3" />
                      Verified PDF Sources
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {msg.sources.map((src, i) => (
                        <div
                          key={i}
                          className="px-2.5 py-1 rounded-lg bg-slate-900/80 border border-slate-700 text-[11px] text-slate-300 flex items-center gap-1.5"
                        >
                          <FileText className="w-3 h-3 text-indigo-400" />
                          <span className="font-medium truncate max-w-[140px]">{src.docName}</span>
                          <span className="text-indigo-400 font-bold">p.{src.pageNumber}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Copy & Action bar */}
                {msg.sender === 'ai' && (
                  <div className="flex items-center justify-between pt-1 text-[10px] text-slate-500">
                    <span>{new Date(msg.timestamp).toLocaleTimeString()}</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleCopy(msg.id, msg.text)}
                        className="hover:text-slate-300 transition flex items-center gap-1"
                      >
                        {copiedId === msg.id ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-400 font-semibold">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {msg.sender === 'user' && (
                <div className="w-8 h-8 rounded-xl bg-purple-600 flex items-center justify-center text-white shrink-0 mt-1">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))
        )}

        {loading && (
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white shrink-0">
              <Bot className="w-4 h-4 animate-bounce" />
            </div>
            <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700/60 text-slate-400 text-xs flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping"></span>
              <span>Scanning PDF knowledge base & synthesizing answer...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <div className="p-4 border-t border-slate-800 bg-slate-900">
        {speechError && (
          <div className="mb-3 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
            {speechError}
          </div>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-3"
        >
<<<<<<< Updated upstream
          {userRole === 'admin' && (
            <>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleDirectPdfUpload}
                accept="application/pdf,.pdf"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPdf}
                className="p-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-indigo-400 hover:text-indigo-300 transition flex items-center justify-center border border-slate-700/60 disabled:opacity-50"
                title="Upload PDF document to Knowledge Base"
              >
                {uploadingPdf ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
                ) : (
                  <Paperclip className="w-4 h-4" />
                )}
              </button>
            </>
          )}
=======
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleDirectPdfUpload}
            accept="application/pdf,.pdf"
            className="hidden"
          />
          {role === 'admin' ? (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingPdf}
              className="p-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-indigo-400 hover:text-indigo-300 transition flex items-center justify-center border border-slate-700/60 disabled:opacity-50"
              title="Upload PDF document to Knowledge Base"
            >
              {uploadingPdf ? (
                <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
              ) : (
                <Paperclip className="w-4 h-4" />
              )}
            </button>
          ) : (
            <div className="px-3 py-2 rounded-2xl bg-slate-800 border border-slate-700 text-slate-500 text-[11px]">
              PDF upload reserved for admins.
            </div>
          )}
          <button
            type="button"
            onClick={() => {
              if (!speechSupported) {
                setSpeechError('Speech recognition is not supported in this browser.');
                return;
              }
              if (recogRef.current) {
                if (listening) {
                  try { recogRef.current.stop(); } catch (_) {}
                  setListening(false);
                } else {
                  try { recogRef.current.start(); } catch (err: any) {
                    setSpeechError(err.message || 'Voice recognition could not start.');
                  }
                }
              }
            }}
            className={`p-3 rounded-2xl ml-2 ${listening ? 'bg-rose-600 text-white' : 'bg-slate-800 text-indigo-400'} hover:bg-slate-700 transition flex items-center justify-center border border-slate-700/60 ${!speechSupported ? 'opacity-50 cursor-not-allowed' : ''}`}
            title={speechSupported ? (listening ? 'Stop listening' : 'Start voice input') : 'Voice input unavailable'}
            disabled={!speechSupported}
          >
            <Mic className="w-4 h-4" />
          </button>
>>>>>>> Stashed changes

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              uploadingPdf
                ? 'Processing & indexing uploaded PDF...'
                : userRole === 'student'
                ? 'Ask a question about your unlocked 7-day study plan materials...'
                : 'Ask a question about your uploaded PDF documents...'
            }
            className="flex-1 px-4 py-3 rounded-2xl bg-slate-800/80 border border-slate-700/60 text-slate-100 text-xs focus:outline-none focus:border-indigo-500 transition"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading || uploadingPdf}
            className="p-3 rounded-2xl gradient-button text-white disabled:opacity-50 transition shadow-lg shadow-indigo-500/20"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};

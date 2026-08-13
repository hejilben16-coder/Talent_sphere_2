import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Radio,
  Settings,
  X,
  Play,
  RotateCcw,
  Sparkles,
  BookOpen,
  Send,
  Loader2,
  ShieldAlert,
  CheckCircle2,
  MessageSquare,
  SlidersHorizontal
} from 'lucide-react';
import { User, VoiceSettings } from '../types';
import { AudioRecorder, AudioStreamPlayer } from '../voice/audioUtils';

interface VoiceTutorViewProps {
  user: User;
  token: string;
}

export const VoiceTutorView: React.FC<VoiceTutorViewProps> = ({ user, token }) => {
  // Connection & Conversation State
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [unlockedDay, setUnlockedDay] = useState<number>(2);

  // Audio & Interaction States
  const [isListening, setIsListening] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [textInput, setTextInput] = useState<string>('');

  // Transcripts & History
  const [transcripts, setTranscripts] = useState<
    { id: string; sender: 'user' | 'ai'; text: string; timestamp: string }[]
  >([]);

  // Voice Settings State
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>({
    voice: 'Puck',
    speakingSpeed: 1.0,
    language: 'en-US',
    autoListen: true
  });

  // WebSockets & Audio Nodes
  const wsRef = useRef<WebSocket | null>(null);
  const audioRecorderRef = useRef<AudioRecorder | null>(null);
  const audioPlayerRef = useRef<AudioStreamPlayer | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);

  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<any>(null);
  const speechIntervalRef = useRef<any>(null);
  const [liveInterimText, setLiveInterimText] = useState<string>('');

  // Auto scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcripts]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnectVoiceSession();
    };
  }, []);

  const connectVoiceSession = () => {
    setIsConnecting(true);
    setConnectionError(null);

    // Initialize audio player
    audioPlayerRef.current = new AudioStreamPlayer(24000);

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/live-voice?token=${encodeURIComponent(token)}&voice=${voiceSettings.voice}`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnecting(false);
        setIsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          if (msg.type === 'connected') {
            setUnlockedDay(msg.unlockedDay || 2);
            const greeting = `Hello ${user.name}! I am your Talent Sphere AI Voice Tutor. You currently have access up to Day ${msg.unlockedDay} materials. How can I help you today?`;
            setTranscripts((prev) => [
              ...prev,
              {
                id: `msg_${Date.now()}`,
                sender: 'ai',
                text: greeting,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              }
            ]);
            // Speak greeting aloud and then activate microphone for student
            speakResponse(greeting, () => {
              if (voiceSettings.autoListen) {
                startMicListening();
              }
            });
          } else if (msg.type === 'audio' && msg.data) {
            setIsSpeaking(true);
            audioPlayerRef.current?.playChunk(msg.data);
          } else if (msg.type === 'transcript') {
            if (msg.sender === 'ai') {
              setIsSpeaking(true);
              speakResponse(msg.text, () => {
                if (voiceSettings.autoListen) {
                  startMicListening();
                }
              });
            }
            setTranscripts((prev) => {
              const last = prev[prev.length - 1];
              if (last && last.sender === msg.sender && Date.now() - new Date(last.timestamp).getTime() < 5000) {
                return [
                  ...prev.slice(0, -1),
                  { ...last, text: `${last.text} ${msg.text}` }
                ];
              }
              return [
                ...prev,
                {
                  id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                  sender: msg.sender,
                  text: msg.text,
                  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                }
              ];
            });
          } else if (msg.type === 'turn_complete') {
            if (!isSpeaking && voiceSettings.autoListen && !isMuted) {
              startMicListening();
            }
          } else if (msg.type === 'interrupted') {
            stopAudio();
            startMicListening();
          } else if (msg.type === 'error') {
            setConnectionError(msg.message || 'Error occurred in live voice session.');
            setIsConnecting(false);
          }
        } catch (e) {
          console.error('Error handling WS message:', e);
        }
      };

      ws.onerror = (err) => {
        console.error('WebSocket Error:', err);
        setConnectionError('Failed to establish real-time connection to Talent Sphere Voice server.');
        setIsConnecting(false);
        setIsConnected(false);
      };

      ws.onclose = () => {
        setIsConnected(false);
        setIsConnecting(false);
        stopMicListening();
      };
    } catch (err: any) {
      setConnectionError(err?.message || 'Could not initiate voice session.');
      setIsConnecting(false);
    }
  };

  const disconnectVoiceSession = () => {
    stopMicListening();
    stopAudio();

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setIsConnected(false);
    setIsListening(false);
    setIsSpeaking(false);
  };

  const stopAudio = () => {
    audioPlayerRef.current?.stop();
    if (speechIntervalRef.current) clearInterval(speechIntervalRef.current);
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  };

  const speakResponse = (text: string, onEndedCallback?: () => void) => {
    if (isMuted) {
      if (onEndedCallback) onEndedCallback();
      return;
    }

    if (!('speechSynthesis' in window)) {
      if (onEndedCallback) onEndedCallback();
      return;
    }

    stopAudio();

    const cleanText = text
      .replace(/[*_~`#]/g, '')
      .replace(/\[.*?\]/g, '')
      .trim();

    if (!cleanText) {
      if (onEndedCallback) onEndedCallback();
      return;
    }

    window.speechSynthesis.resume();

    const sentences = cleanText.match(/[^.!?]+[.!?]+/g) || [cleanText];
    let sentenceIndex = 0;

    const speakNextSentence = () => {
      if (sentenceIndex >= sentences.length) {
        setIsSpeaking(false);
        if (speechIntervalRef.current) clearInterval(speechIntervalRef.current);
        if (onEndedCallback) onEndedCallback();
        return;
      }

      const utterance = new SpeechSynthesisUtterance(sentences[sentenceIndex].trim());
      utterance.rate = voiceSettings.speakingSpeed;
      utterance.lang = voiceSettings.language;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => {
        sentenceIndex++;
        speakNextSentence();
      };
      utterance.onerror = (e) => {
        console.warn('Speech synthesis chunk error:', e);
        sentenceIndex++;
        speakNextSentence();
      };

      window.speechSynthesis.speak(utterance);
    };

    if (speechIntervalRef.current) clearInterval(speechIntervalRef.current);
    speechIntervalRef.current = setInterval(() => {
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.pause();
        window.speechSynthesis.resume();
      }
    }, 5000);

    speakNextSentence();
  };

  const startMicListening = async () => {
    if (isMuted) return;

    // Start PCM Audio Recorder
    try {
      if (!audioRecorderRef.current) {
        audioRecorderRef.current = new AudioRecorder((base64Data) => {
          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: 'audio_chunk', data: base64Data }));
          }
        });
        await audioRecorderRef.current.start();
      }
    } catch (e) {
      console.warn('AudioRecorder start warning:', e);
    }

    // Start Speech Recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setLiveInterimText('Microphone active. (Speech recognition not available in browser, use text fallback)');
      setIsListening(true);
      return;
    }

    try {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch (_) {}
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = voiceSettings.language;

      recognition.onstart = () => {
        setIsListening(true);
        setLiveInterimText('🎙️ Listening... Speak your question now!');
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

        const spoken = (finalTranscript + interimTranscript).trim();
        if (spoken) {
          setLiveInterimText(`🎙️ "${spoken}"`);

          // 1.8-second silence timer auto-submits speech
          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = setTimeout(() => {
            if (spoken.length >= 2) {
              sendSpokenQuery(spoken);
            }
          }, 1800);
        }
      };

      recognition.onerror = (err: any) => {
        console.warn('SpeechRecognition error:', err);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.warn('Could not start SpeechRecognition:', err);
      setIsListening(true);
    }
  };

  const sendSpokenQuery = (text: string) => {
    stopMicListening();
    setLiveInterimText('');

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'text_input', text }));
    }
  };

  const stopMicListening = () => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (_) {}
      recognitionRef.current = null;
    }
    if (audioRecorderRef.current) {
      audioRecorderRef.current.stop();
      audioRecorderRef.current = null;
    }
    setIsListening(false);
  };

  const toggleMicListening = () => {
    if (isListening) {
      stopMicListening();
    } else {
      stopAudio();
      startMicListening();
    }
  };

  const handleInterrupt = () => {
    stopAudio();
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'interrupt' }));
    }
    startMicListening();
  };

  const handleSendTextInput = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim() || !isConnected) return;

    const userMsg = textInput.trim();
    setTextInput('');
    stopAudio();

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'text_input', text: userMsg }));
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-1 bg-blue-500/20 text-blue-300 text-xs font-semibold rounded-full border border-blue-400/30 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              Gemini Live API RAG Voice Tutor
            </span>
            <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 text-xs font-semibold rounded-full border border-emerald-400/30">
              Unlocked Up to Day {unlockedDay}
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
            Talent Sphere Real-Time Voice Assistant
          </h1>
          <p className="text-sm text-slate-300 mt-1 max-w-2xl">
            Have natural, bidirectional voice conversations grounded in your authorized study materials. High-speed RAG protection ensures locked or admin files remain secure.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition backdrop-blur-sm border border-white/10"
            title="Voice Assistant Settings"
          >
            <Settings className="w-5 h-5" />
          </button>

          {!isConnected ? (
            <button
              onClick={connectVoiceSession}
              disabled={isConnecting}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-medium shadow-lg hover:shadow-xl transition flex items-center gap-2 disabled:opacity-50"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Radio className="w-4 h-4" />
                  Start Voice Session
                </>
              )}
            </button>
          ) : (
            <button
              onClick={disconnectVoiceSession}
              className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-medium shadow-md transition flex items-center gap-2"
            >
              <Radio className="w-4 h-4 animate-pulse text-rose-200" />
              End Session
            </button>
          )}
        </div>
      </div>

      {/* Voice Settings Drawer Modal */}
      {showSettings && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <SlidersHorizontal className="w-5 h-5 text-indigo-600" />
              Voice Assistant Configuration
            </h3>
            <button
              onClick={() => setShowSettings(false)}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Assistant Voice
              </label>
              <select
                value={voiceSettings.voice}
                onChange={(e) => setVoiceSettings({ ...voiceSettings, voice: e.target.value })}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500"
              >
                <option value="Puck">Puck (Natural Male)</option>
                <option value="Charon">Charon (Deep Male)</option>
                <option value="Kore">Kore (Warm Female)</option>
                <option value="Fenrir">Fenrir (Authoritative)</option>
                <option value="Aoede">Aoede (Melodic Female)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Speaking Speed ({voiceSettings.speakingSpeed}x)
              </label>
              <input
                type="range"
                min="0.8"
                max="1.5"
                step="0.1"
                value={voiceSettings.speakingSpeed}
                onChange={(e) => setVoiceSettings({ ...voiceSettings, speakingSpeed: parseFloat(e.target.value) })}
                className="w-full accent-indigo-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Language
              </label>
              <select
                value={voiceSettings.language}
                onChange={(e) => setVoiceSettings({ ...voiceSettings, language: e.target.value })}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500"
              >
                <option value="en-US">English (US)</option>
                <option value="en-GB">English (UK)</option>
                <option value="es-ES">Spanish</option>
                <option value="fr-FR">French</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Automatic Listening
              </label>
              <button
                onClick={() => setVoiceSettings({ ...voiceSettings, autoListen: !voiceSettings.autoListen })}
                className={`w-full py-2 px-3 rounded-lg text-xs font-semibold transition border flex items-center justify-center gap-2 ${
                  voiceSettings.autoListen
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}
              >
                {voiceSettings.autoListen ? 'Auto-Listen Enabled' : 'Manual Push-to-Talk'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Banner */}
      {connectionError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-4 flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-rose-600 flex-shrink-0" />
            <span>{connectionError}</span>
          </div>
          <button
            onClick={() => setConnectionError(null)}
            className="text-xs font-semibold text-rose-600 hover:text-rose-800"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Interactive Main Stage */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Voice Visualizer & Controls */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-8 shadow-sm flex flex-col items-center justify-between min-h-[460px] text-center">
          {/* Status Badge */}
          <div className="w-full flex items-center justify-between text-xs font-medium text-slate-500 border-b border-slate-100 pb-4">
            <span className="flex items-center gap-1.5">
              <span className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
              {isConnected ? 'Real-Time Voice Active' : 'Disconnected'}
            </span>
            <span className="text-slate-400">RAG Level: Day {unlockedDay}</span>
          </div>

          {/* Central Animated Mic Stage */}
          <div className="my-8 flex flex-col items-center justify-center space-y-6">
            <div className="relative">
              {/* Animated Listening Ripples */}
              {isListening && (
                <>
                  <div className="absolute inset-0 rounded-full bg-blue-500/20 animate-ping scale-150" />
                  <div className="absolute -inset-4 rounded-full bg-indigo-500/20 animate-pulse" />
                </>
              )}

              {/* Animated Speaking Waves */}
              {isSpeaking && (
                <div className="absolute -inset-6 rounded-full bg-emerald-500/20 animate-spin" style={{ animationDuration: '3s' }} />
              )}

              <button
                onClick={toggleMicListening}
                disabled={!isConnected}
                className={`relative z-10 w-32 h-32 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl ${
                  !isConnected
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed border-4 border-slate-200'
                    : isListening
                    ? 'bg-gradient-to-tr from-blue-600 to-indigo-600 text-white border-4 border-blue-300 scale-105 shadow-blue-500/30'
                    : isSpeaking
                    ? 'bg-gradient-to-tr from-emerald-500 to-teal-600 text-white border-4 border-emerald-300'
                    : 'bg-slate-900 hover:bg-slate-800 text-white border-4 border-slate-700'
                }`}
              >
                {isListening ? (
                  <Mic className="w-12 h-12 animate-pulse" />
                ) : isSpeaking ? (
                  <Volume2 className="w-12 h-12 animate-bounce" />
                ) : (
                  <Mic className="w-12 h-12" />
                )}
              </button>
            </div>

            <div>
              <p className="text-lg font-bold text-slate-800">
                {!isConnected
                  ? 'Click "Start Voice Session" Above'
                  : isListening
                  ? 'Listening... Speak Now'
                  : isSpeaking
                  ? 'Gemini Live Speaking...'
                  : 'Tap Mic to Speak'}
              </p>
              {liveInterimText && (
                <p className="text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-200 rounded-full px-3 py-1 my-2 inline-block max-w-xs truncate animate-pulse">
                  {liveInterimText}
                </p>
              )}
              <p className="text-xs text-slate-500 mt-1 max-w-xs">
                {isConnected
                  ? 'Voice input is checked against your authorized PDF learning modules.'
                  : 'Connect to begin live interactive tutoring.'}
              </p>
            </div>
          </div>

          {/* Action Controls */}
          <div className="w-full flex items-center justify-center gap-3 border-t border-slate-100 pt-6">
            <button
              onClick={() => setIsMuted(!isMuted)}
              disabled={!isConnected}
              className={`p-3 rounded-xl border transition flex items-center gap-2 text-xs font-semibold ${
                isMuted
                  ? 'bg-rose-50 text-rose-600 border-rose-200'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              {isMuted ? 'Unmute Audio' : 'Mute Audio'}
            </button>

            {isSpeaking && (
              <button
                onClick={handleInterrupt}
                className="p-3 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition flex items-center gap-2 text-xs font-semibold"
              >
                <RotateCcw className="w-4 h-4" />
                Interrupt Assistant
              </button>
            )}
          </div>
        </div>

        {/* Right Column: Live Transcript Feed & Chat Input */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between h-[520px]">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-indigo-600" />
              Live Conversation & Transcripts
            </h2>
            <span className="text-xs text-slate-400">
              {transcripts.length} Message(s)
            </span>
          </div>

          {/* Transcript Scroll Feed */}
          <div className="flex-1 overflow-y-auto my-4 space-y-3 pr-2 scrollbar-thin">
            {transcripts.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 p-6">
                <Sparkles className="w-10 h-10 text-slate-300 mb-2" />
                <p className="text-sm font-medium">No live transcript yet</p>
                <p className="text-xs text-slate-400 mt-1">
                  Start the voice session or type a question below to begin live tutoring.
                </p>
              </div>
            ) : (
              transcripts.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                      msg.sender === 'user'
                        ? 'bg-blue-600 text-white rounded-br-none'
                        : 'bg-slate-100 text-slate-800 border border-slate-200 rounded-bl-none'
                    }`}
                  >
                    <p className="leading-relaxed">{msg.text}</p>
                    <span className="block text-[10px] opacity-70 mt-1 text-right">
                      {msg.timestamp}
                    </span>
                  </div>
                </div>
              ))
            )}
            <div ref={transcriptEndRef} />
          </div>

          {/* Fallback Text Input Form */}
          <form onSubmit={handleSendTextInput} className="flex items-center gap-2 pt-2 border-t border-slate-100">
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder={
                isConnected ? "Type a question or speak above..." : "Connect voice session above..."
              }
              disabled={!isConnected}
              className="flex-1 text-sm border border-slate-300 rounded-xl px-4 py-2.5 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!isConnected || !textInput.trim()}
              className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

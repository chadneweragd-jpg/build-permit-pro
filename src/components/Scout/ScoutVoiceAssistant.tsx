'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Compass,
  Sparkles,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Send,
  X,
  ChevronDown,
  MapPin,
  Route,
  Square,
  RefreshCw,
  Sliders,
  ExternalLink,
  HardHat
} from 'lucide-react';
import {
  speakWithSelectedVoice,
  stopSpeaking,
  getAvailableVoices,
  saveSelectedVoice,
  VOICE_STORAGE_KEY,
  VoiceOption
} from '@/lib/audio/voice';
import { Permit } from '@/types';
import { ScoutAction } from '@/lib/scout-ai';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  spokenText?: string;
  displayText: string;
  permits?: Permit[];
  actions?: ScoutAction[];
  timestamp: string;
}

const SAMPLE_PROMPTS = [
  '🏡 Wilden SFD framing leads',
  '⚡ Top electrical jobs in Kelowna',
  '🏆 Largest commercial project',
  '🚗 How does Drive Mode work?',
  '📋 2026 CRA mileage rates'
];

export function ScoutVoiceAssistant() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [micSupported, setMicSupported] = useState(true);

  // Voices
  const [voices, setVoices] = useState<VoiceOption[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>('');
  const [showVoicePicker, setShowVoicePicker] = useState(false);

  // Chat History
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      spokenText: 'Hello! I am Scout, your commercial field assistant. Ask me anything about Kelowna building permits, trades, or routes.',
      displayText: "👋 **Hi, I'm Scout!** Your in-app AI voice & chat co-pilot for the **City of Kelowna & Okanagan Hub**.\n\nAsk me about upcoming permits, trades (electrical, framing, roofing, HVAC), or routing to job sites!",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Initialize Voices
  useEffect(() => {
    const updateVoices = () => {
      const avail = getAvailableVoices();
      setVoices(avail);
      if (typeof window !== 'undefined') {
        const saved =
          localStorage.getItem(VOICE_STORAGE_KEY) ||
          localStorage.getItem('bpp_preferred_voice');
        if (saved) {
          setSelectedVoice(saved);
        } else if (avail.length > 0) {
          setSelectedVoice(avail[0].name);
        }
      }
    };

    updateVoices();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }

    const handleOpen = () => {
      setIsOpen(true);
      setIsMinimized(false);
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('bpp-open-scout', handleOpen);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('bpp-open-scout', handleOpen);
      }
    };
  }, []);

  // Initialize Speech Recognition (Speech-to-Text)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
          setIsListening(true);
        };

        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          if (transcript) {
            setInputText(transcript);
            handleSubmitQuery(transcript);
          }
        };

        recognition.onerror = (event: any) => {
          console.warn('Speech recognition error:', event.error);
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      } else {
        setMicSupported(false);
      }
    }

    return () => {
      stopSpeaking();
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
    };
  }, []);

  // Scroll to bottom when messages update
  useEffect(() => {
    if (isOpen && !isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isMinimized]);

  const handleVoiceChange = (voiceName: string) => {
    setSelectedVoice(voiceName);
    saveSelectedVoice(voiceName);
    setShowVoicePicker(false);
    speakWithSelectedVoice('Scout navigation voice updated.');
  };

  const toggleMic = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in this browser. You can still type queries below!');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      stopSpeaking();
      setIsSpeaking(false);
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.warn('Recognition start failed:', err);
      }
    }
  };

  const handleStopSpeaking = () => {
    stopSpeaking();
    setIsSpeaking(false);
  };

  const handleSpeakMessage = (text: string) => {
    stopSpeaking();
    setIsSpeaking(true);
    speakWithSelectedVoice(text, () => setIsSpeaking(false));
  };

  const handleSubmitQuery = async (queryText?: string) => {
    const q = (queryText || inputText).trim();
    if (!q || isProcessing) return;

    setInputText('');
    stopSpeaking();
    setIsSpeaking(false);

    // Add user message
    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      displayText: q,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsProcessing(true);

    try {
      const res = await fetch('/api/ai/scout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: q,
          history: messages.map((m) => ({ role: m.role, text: m.displayText }))
        })
      });

      const data = await res.json();

      if (data.success) {
        const assistantMsg: ChatMessage = {
          id: `asst-${Date.now()}`,
          role: 'assistant',
          spokenText: data.spokenText,
          displayText: data.displayText,
          permits: data.permits,
          actions: data.actions,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        setMessages((prev) => [...prev, assistantMsg]);

        // Speak response if autoSpeak is enabled
        if (autoSpeak && data.spokenText) {
          setIsSpeaking(true);
          speakWithSelectedVoice(data.spokenText, () => setIsSpeaking(false));
        }
      } else {
        throw new Error(data.error || 'Failed to get response');
      }
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        spokenText: 'I encountered an issue retrieving that data. Please try again.',
        displayText: "⚠️ Sorry, I couldn't reach the permit service. Please try asking again.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleActionClick = (href: string) => {
    stopSpeaking();
    setIsOpen(false);
    router.push(href);
  };

  // 1. Floating Launch Trigger Button (Bottom Right)
  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-40 flex items-center space-x-2">
        <button
          onClick={() => {
            setIsOpen(true);
            setIsMinimized(false);
          }}
          className="group flex items-center space-x-2.5 px-4 py-3 rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-amber-500 hover:from-blue-500 hover:to-amber-400 text-white font-black text-xs shadow-2xl shadow-blue-600/40 border border-white/20 transition-all transform hover:scale-105 active:scale-95"
          title="Open Scout AI Assistant"
        >
          <div className="relative">
            <Compass className="w-5 h-5 animate-spin-slow text-amber-200 group-hover:rotate-45 transition-transform" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-slate-900 animate-ping" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-slate-900" />
          </div>
          <span className="tracking-wide">Ask Scout AI</span>
          <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded font-mono font-bold">Voice</span>
        </button>
      </div>
    );
  }

  // 2. Scout Chat & Voice Drawer / Modal
  return (
    <div
      className={`fixed right-4 sm:right-6 bottom-4 sm:bottom-6 z-50 w-[calc(100vw-2rem)] sm:w-[440px] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden transition-all duration-300 ${
        isMinimized ? 'h-16' : 'h-[620px] max-h-[85vh]'
      }`}
    >
      {/* Header Bar */}
      <div className="bg-slate-900 text-white p-3.5 px-4 flex items-center justify-between border-b border-slate-800 shrink-0">
        <div className="flex items-center space-x-2.5 min-w-0">
          <div className="relative w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-indigo-600 flex items-center justify-center text-slate-950 font-black shadow-md shrink-0">
            <Compass className="w-5 h-5 text-white animate-spin-slow" />
            {isSpeaking && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
              </span>
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center space-x-2">
              <h3 className="font-extrabold text-xs text-white tracking-tight">Scout AI Co-Pilot</h3>
              <span className="text-[9px] font-black uppercase tracking-wider bg-amber-400/20 text-amber-400 px-1.5 py-0.2 rounded border border-amber-400/30">
                Voice Ready
              </span>
            </div>
            <p className="text-[10px] text-slate-400 truncate">
              {isSpeaking
                ? '🔊 Speaking response...'
                : isListening
                ? '🎙️ Listening to you...'
                : 'Okanagan Permits & Routes Engine'}
            </p>
          </div>
        </div>

        {/* Header Action Icons */}
        <div className="flex items-center space-x-1.5 shrink-0">
          {/* Speaking Audio Waves / Stop Button */}
          {isSpeaking && (
            <button
              onClick={handleStopSpeaking}
              className="flex items-center space-x-1 px-2 py-1 rounded-lg bg-red-600/20 text-red-400 hover:bg-red-600 hover:text-white border border-red-500/30 text-[10px] font-bold transition-all animate-pulse"
              title="Stop audio"
            >
              <Square className="w-3 h-3 fill-current" />
              <span>Stop</span>
            </button>
          )}

          {/* Auto-Speak Toggle */}
          <button
            onClick={() => {
              setAutoSpeak(!autoSpeak);
              if (isSpeaking) handleStopSpeaking();
            }}
            className={`p-1.5 rounded-lg border transition-all ${
              autoSpeak
                ? 'bg-blue-600/20 border-blue-500/30 text-blue-400 hover:bg-blue-600/30'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
            }`}
            title={autoSpeak ? 'Auto-speak ON' : 'Auto-speak OFF (Muted)'}
          >
            {autoSpeak ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>

          {/* Voice Selector Toggle */}
          <button
            onClick={() => setShowVoicePicker(!showVoicePicker)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition-all"
            title="Choose Voice"
          >
            <Sliders className="w-3.5 h-3.5" />
          </button>

          {/* Close */}
          <button
            onClick={() => {
              stopSpeaking();
              setIsSpeaking(false);
              setIsOpen(false);
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
            title="Close Assistant"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Voice Selection Drawer (if toggled) */}
      {showVoicePicker && (
        <div className="bg-slate-800/95 border-b border-slate-700 p-3 text-xs animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-slate-200 text-[11px] flex items-center space-x-1.5">
              <Volume2 className="w-3.5 h-3.5 text-blue-400" />
              <span>Shared Navigation & Assistant Voice</span>
            </span>
            <button
              onClick={() => speakWithSelectedVoice('Scout navigation voice ready.')}
              className="px-2 py-0.5 rounded bg-blue-600 text-white font-bold text-[10px] hover:bg-blue-500"
            >
              Test Voice
            </button>
          </div>
          <select
            value={selectedVoice}
            onChange={(e) => handleVoiceChange(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {voices.map((v) => (
              <option key={v.name} value={v.name}>
                {v.isNatural ? '✨ ' : ''}
                {v.name} ({v.lang})
              </option>
            ))}
          </select>
          <p className="text-[10px] text-slate-400 mt-1">
            Persisted across Drive Mode turn-by-turn and Scout Assistant.
          </p>
        </div>
      )}

      {/* Chat Messages Body */}
      {!isMinimized && (
        <>
          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs bg-slate-50 dark:bg-slate-950/60">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                {/* Speaker tag */}
                <div className="flex items-center space-x-1.5 mb-1 px-1 text-[10px] text-slate-400">
                  {msg.role === 'user' ? (
                    <span>You &bull; {msg.timestamp}</span>
                  ) : (
                    <div className="flex items-center space-x-1 font-bold text-blue-600 dark:text-blue-400">
                      <Sparkles className="w-3 h-3" />
                      <span>Scout &bull; {msg.timestamp}</span>
                    </div>
                  )}
                </div>

                {/* Message Bubble */}
                <div
                  className={`max-w-[90%] rounded-2xl p-3.5 leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white rounded-tr-none shadow-md shadow-blue-600/10'
                      : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-none border border-slate-200 dark:border-slate-700 shadow-sm'
                  }`}
                >
                  <div className="whitespace-pre-wrap font-sans text-xs">
                    {msg.displayText}
                  </div>

                  {/* Audio Read Aloud Button for Assistant Messages */}
                  {msg.role === 'assistant' && msg.spokenText && (
                    <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-700/80 flex items-center justify-between text-[11px]">
                      <button
                        onClick={() => handleSpeakMessage(msg.spokenText!)}
                        className="flex items-center space-x-1 text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 font-semibold"
                        title="Read aloud"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                        <span>Read Aloud</span>
                      </button>
                    </div>
                  )}

                  {/* Attached Permit Recommendations */}
                  {msg.permits && msg.permits.length > 0 && (
                    <div className="mt-3 space-y-2 pt-2 border-t border-slate-100 dark:border-slate-700/80">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Recommended Permits ({msg.permits.length})
                      </p>
                      {msg.permits.map((p) => (
                        <div
                          key={p.id}
                          className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-2.5 rounded-xl flex flex-col space-y-1.5"
                        >
                          <div className="flex items-start justify-between">
                            <div className="min-w-0 pr-2">
                              <span className="font-mono text-[9px] font-bold text-slate-400">
                                {p.permit_number}
                              </span>
                              <p className="font-bold text-slate-900 dark:text-white truncate">
                                {p.address}
                              </p>
                            </div>
                            <span className="font-mono font-black text-blue-600 dark:text-blue-400 text-[11px] shrink-0">
                              ${(p.estimated_value / 1000).toFixed(0)}k
                            </span>
                          </div>

                          {/* Trades */}
                          <div className="flex flex-wrap gap-1">
                            {p.trades.slice(0, 3).map((t) => (
                              <span
                                key={t.subtrade_key}
                                className="text-[9px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium"
                              >
                                {t.name}
                              </span>
                            ))}
                          </div>

                          {/* Quick Actions: View on Map & Drive Mode */}
                          <div className="flex items-center space-x-2 pt-1">
                            <button
                              onClick={() => handleActionClick(`/search?permitId=${p.id}`)}
                              className="flex-1 flex items-center justify-center space-x-1 py-1 px-2 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-[10px] font-bold hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                            >
                              <MapPin className="w-3 h-3" />
                              <span>View on Map</span>
                            </button>
                            <button
                              onClick={() => handleActionClick(`/routes/builder?destination=${p.id}`)}
                              className="flex-1 flex items-center justify-center space-x-1 py-1 px-2 rounded-lg bg-emerald-600 text-white text-[10px] font-bold hover:bg-emerald-500 transition-colors"
                            >
                              <Route className="w-3 h-3" />
                              <span>Drive Mode</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Suggestion Action Chips */}
                  {msg.actions && msg.actions.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-700/80">
                      {msg.actions.map((act) => (
                        <button
                          key={act.label}
                          onClick={() => handleActionClick(act.href)}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 text-slate-700 dark:text-slate-200 font-bold text-[10px] transition-colors"
                        >
                          {act.label} &rarr;
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isProcessing && (
              <div className="flex items-center space-x-2 text-slate-400 text-xs p-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-500" />
                <span>Scout is scanning permits & computing response...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Sample Prompts Chips */}
          <div className="px-3 py-2 bg-slate-100 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-800 flex items-center space-x-1.5 overflow-x-auto no-scrollbar shrink-0">
            {SAMPLE_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                onClick={() => handleSubmitQuery(prompt)}
                className="px-2.5 py-1 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-500 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium text-[10px] whitespace-nowrap shadow-xs transition-colors shrink-0"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Input & Voice Controls Footer */}
          <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSubmitQuery();
              }}
              className="flex items-center space-x-2"
            >
              {/* Microphone Speech-to-Text Button */}
              <button
                type="button"
                onClick={toggleMic}
                className={`p-2.5 rounded-xl border transition-all shrink-0 ${
                  isListening
                    ? 'bg-red-600 text-white border-red-700 animate-pulse shadow-lg shadow-red-600/30 ring-2 ring-red-400'
                    : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
                title={isListening ? 'Listening (Click to stop)' : 'Click to Speak'}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>

              {/* Text Input */}
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={
                  isListening
                    ? 'Listening to you now...'
                    : 'Ask Scout about permits, trades, or routes...'
                }
                disabled={isProcessing}
                className="flex-1 bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />

              {/* Send Button */}
              <button
                type="submit"
                disabled={!inputText.trim() || isProcessing}
                className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white shadow-md shadow-blue-600/20 transition-all shrink-0"
                title="Send query"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}

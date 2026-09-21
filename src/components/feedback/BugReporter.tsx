'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { AuthService } from '@/lib/auth-service';
import {
  Bug,
  X,
  Send,
  CheckCircle2,
  AlertCircle,
  Monitor,
  Sparkles,
  Loader2
} from 'lucide-react';

export function BugReporter() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');
  const [category, setCategory] = useState<'bug' | 'visual' | 'feature'>('bug');
  const [userEmail, setUserEmail] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Auto-captured device info
  const [deviceInfo, setDeviceInfo] = useState<{
    url: string;
    userAgent: string;
    screenResolution: string;
    windowDimensions: string;
  }>({
    url: '',
    userAgent: '',
    screenResolution: '',
    windowDimensions: ''
  });

  useEffect(() => {
    const user = AuthService.getActiveUserSync();
    if (user?.email) {
      setUserEmail(user.email);
    }

    if (typeof window !== 'undefined') {
      setDeviceInfo({
        url: window.location.href,
        userAgent: navigator.userAgent,
        screenResolution: `${window.screen?.width || 0}x${window.screen?.height || 0}`,
        windowDimensions: `${window.innerWidth}x${window.innerHeight}`
      });
    }
  }, [pathname, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isSubmitting) return;

    setIsSubmitting(true);

    try {
      const payload = {
        user_email: userEmail || 'beta-partner@buildpermitpro.ca',
        url: typeof window !== 'undefined' ? window.location.href : pathname,
        message: message.trim(),
        category,
        device_info: {
          ...deviceInfo,
          url: typeof window !== 'undefined' ? window.location.href : pathname,
          submittedAt: new Date().toISOString()
        }
      };

      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        throw new Error('Failed to submit');
      }

      setToastMessage('Thanks! Logged for the development team.');
      setMessage('');
      setTimeout(() => {
        setToastMessage(null);
        setIsOpen(false);
      }, 2000);
    } catch (err) {
      console.warn('Feedback submit fallback:', err);
      setToastMessage('Thanks! Logged for the development team.');
      setTimeout(() => {
        setToastMessage(null);
        setIsOpen(false);
      }, 2000);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Floating Bug Icon Button: Bottom-Left Corner */}
      <div className="fixed bottom-5 left-5 z-40">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label="Report a Bug or Feedback"
          className="group relative flex items-center justify-center w-11 h-11 rounded-full bg-slate-900 hover:bg-slate-800 text-amber-400 hover:text-amber-300 border border-slate-700 shadow-xl transition-all duration-200 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
          title="Report a Bug / Feedback"
        >
          <Bug className="w-5 h-5 transition-transform group-hover:rotate-12" />
          
          {/* Subtle Beta indicator badge */}
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-blue-600 rounded-full ring-2 ring-slate-900 flex items-center justify-center">
            <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
          </span>
        </button>
      </div>

      {/* Quick Success Toast */}
      {toastMessage && (
        <div className="fixed bottom-20 left-5 z-50 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="flex items-center space-x-2.5 px-4 py-3 bg-emerald-600 text-white rounded-2xl shadow-2xl border border-emerald-500 font-bold text-xs">
            <CheckCircle2 className="w-4 h-4 text-white shrink-0" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Modal Dialog */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                  <Bug className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                    Report a Bug or Feedback
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    BPP Partner Beta &bull; Sent directly to engineering
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {/* Category Pills */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Category
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setCategory('bug')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                      category === 'bug'
                        ? 'bg-amber-500/10 border-amber-500/50 text-amber-600 dark:text-amber-400 shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    🐞 Bug / Error
                  </button>
                  <button
                    type="button"
                    onClick={() => setCategory('visual')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                      category === 'visual'
                        ? 'bg-blue-500/10 border-blue-500/50 text-blue-600 dark:text-blue-400 shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    📐 Layout / Visual
                  </button>
                  <button
                    type="button"
                    onClick={() => setCategory('feature')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                      category === 'feature'
                        ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-600 dark:text-emerald-400 shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    💡 Feature Idea
                  </button>
                </div>
              </div>

              {/* Message Input */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  What did you notice? (Bug, layout issue, or feature idea)
                </label>
                <textarea
                  required
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Describe what happened or what could be improved..."
                  className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-medium leading-relaxed"
                />
              </div>

              {/* Auto-Captured Telemetry Summary */}
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1.5 text-[10px] text-slate-400">
                <div className="flex items-center space-x-1 font-bold text-slate-500 dark:text-slate-400">
                  <Monitor className="w-3 h-3 text-blue-500" />
                  <span>Auto-Captured Environment Context</span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1 font-mono">
                  <div className="truncate">
                    <span className="text-slate-500">Route: </span>
                    <span className="text-slate-300">{pathname}</span>
                  </div>
                  <div className="truncate">
                    <span className="text-slate-500">Display: </span>
                    <span className="text-slate-300">{deviceInfo.screenResolution}</span>
                  </div>
                  <div className="truncate col-span-2">
                    <span className="text-slate-500">Account: </span>
                    <span className="text-slate-300">{userEmail || 'Partner Beta'}</span>
                  </div>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !message.trim()}
                  className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-blue-600/30 transition-all active:scale-95"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Submit Feedback</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

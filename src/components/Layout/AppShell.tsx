'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { ScoutVoiceAssistant } from '@/components/Scout/ScoutVoiceAssistant';

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  const isAuthPage = pathname === '/login';

  if (isAuthPage) {
    return <div className="min-h-screen bg-slate-950 text-slate-100">{children}</div>;
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Left Sidebar */}
      <Sidebar />

      {/* Main Content Pane */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto relative bg-slate-50 dark:bg-slate-950">
          {children}
        </main>
      </div>

      {/* Global In-App Scout AI Voice & Chat Assistant */}
      <ScoutVoiceAssistant />
    </div>
  );
};
